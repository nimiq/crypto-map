#!/bin/bash

# Script to generate embeddings for existing locations during database initialization
# This script uses curl to call OpenAI API and psql to update the database

set -e

echo "Starting embedding generation for existing locations..."

# Validate environment variables
if [ -z "$OPENAI_API_KEY" ]; then
    echo "ERROR: OPENAI_API_KEY environment variable is required"
    echo "Please set your OpenAI API key in the environment variables"
    echo "Get your API key at: https://platform.openai.com/api-keys"
    exit 1
fi

if [ "$OPENAI_API_KEY" = "your_openai_api_key_here" ]; then
    echo "ERROR: OPENAI_API_KEY appears to be a placeholder value"
    echo "Please set a valid OpenAI API key in the environment variables"
    echo "Get your API key at: https://platform.openai.com/api-keys"
    exit 1
fi

if [[ ! "$OPENAI_API_KEY" =~ ^sk- ]]; then
    echo "WARNING: OPENAI_API_KEY format appears invalid. Valid keys should start with 'sk-'"
fi

# Configuration from environment variables with defaults
EMBEDDING_MODEL="${OPENAI_EMBEDDING_MODEL:-text-embedding-3-small}"
MAX_RETRIES="${OPENAI_EMBEDDING_MAX_RETRIES:-3}"
BASE_DELAY="${OPENAI_EMBEDDING_BASE_DELAY:-1000}"  # milliseconds
MAX_DELAY="${OPENAI_EMBEDDING_MAX_DELAY:-30000}"   # milliseconds
BATCH_SIZE="${OPENAI_EMBEDDING_BATCH_SIZE:-10}"    # Smaller batch for shell script

# Database connection parameters
# During initialization, we use the same connection method as the init script
DB_HOST=""  # Use default Unix socket connection
DB_PORT=""  # Use default port
DB_NAME="${POSTGRES_DB:-postgres}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD}"

if [ -z "$DB_PASSWORD" ]; then
    echo "ERROR: POSTGRES_PASSWORD environment variable is required"
    exit 1
fi

echo "Configuration:"
echo "  Model: $EMBEDDING_MODEL"
echo "  Max retries: $MAX_RETRIES"
echo "  Base delay: ${BASE_DELAY}ms"
echo "  Max delay: ${MAX_DELAY}ms"
echo "  Batch size: $BATCH_SIZE"
echo ""

# Function to sleep with millisecond precision
sleep_ms() {
    local ms=$1
    # Convert milliseconds to seconds using bash arithmetic
    local seconds=$((ms / 1000))
    local remainder=$((ms % 1000))
    
    if [ $seconds -gt 0 ]; then
        sleep "$seconds"
    fi
    
    # For sub-second precision, use a simple approximation
    if [ $remainder -gt 500 ]; then
        sleep 1
    elif [ $remainder -gt 0 ]; then
        sleep 0.5
    fi
}

# Function to calculate exponential backoff delay
calculate_backoff_delay() {
    local attempt=$1
    local exponential_delay=$((BASE_DELAY * (2 ** attempt)))
    local jitter=$((RANDOM % (exponential_delay / 10)))  # Up to 10% jitter
    local delay=$((exponential_delay + jitter))
    
    if [ $delay -gt $MAX_DELAY ]; then
        delay=$MAX_DELAY
    fi
    
    echo $delay
}

# Function to generate embedding for a single text
generate_embedding() {
    local text="$1"
    local attempt=0
    
    while [ $attempt -le $MAX_RETRIES ]; do
        # Escape the text for JSON
        local escaped_text=$(echo "$text" | sed 's/\\/\\\\/g' | sed 's/"/\\"/g' | tr -d '\n\r')
        
        # Create JSON payload
        local json_payload="{\"model\":\"$EMBEDDING_MODEL\",\"input\":\"$escaped_text\"}"
        
        # Make API call
        local response=$(curl -s -w "\n%{http_code}" \
            -H "Authorization: Bearer $OPENAI_API_KEY" \
            -H "Content-Type: application/json" \
            -d "$json_payload" \
            "https://api.openai.com/v1/embeddings")
        
        # Extract HTTP status code and response body
        local http_code=$(echo "$response" | tail -n1)
        local response_body=$(echo "$response" | head -n -1)
        
        if [ "$http_code" = "200" ]; then
            # Extract embedding from response
            local embedding=$(echo "$response_body" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'data' in data and len(data['data']) > 0:
        print(json.dumps(data['data'][0]['embedding']))
    else:
        sys.exit(1)
except:
    sys.exit(1)
")
            
            if [ $? -eq 0 ] && [ -n "$embedding" ]; then
                echo "$embedding"
                return 0
            fi
        fi
        
        # Handle errors
        if [ "$http_code" = "401" ]; then
            echo "ERROR: OpenAI authentication failed" >&2
            return 1
        fi
        
        if [ "$http_code" = "400" ]; then
            echo "ERROR: Invalid request to OpenAI API" >&2
            return 1
        fi
        
        # Retry on other errors
        if [ $attempt -lt $MAX_RETRIES ]; then
            local delay=$(calculate_backoff_delay $attempt)
            echo "Embedding generation attempt $((attempt + 1)) failed (HTTP $http_code), retrying in ${delay}ms..." >&2
            sleep_ms $delay
        fi
        
        attempt=$((attempt + 1))
    done
    
    echo "ERROR: Failed to generate embedding after $((MAX_RETRIES + 1)) attempts" >&2
    return 1
}

# Check if locations exist and need embeddings
echo "Connecting to database..."
location_stats=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT 
        COUNT(*) as total_locations,
        COUNT(embedding) as locations_with_embeddings
    FROM locations;
" | tr -d ' ')

total_locations=$(echo "$location_stats" | cut -d'|' -f1)
locations_with_embeddings=$(echo "$location_stats" | cut -d'|' -f2)
locations_needing_embeddings=$((total_locations - locations_with_embeddings))

echo "Found $total_locations total locations"
echo "$locations_with_embeddings already have embeddings"
echo "$locations_needing_embeddings locations need embeddings"

if [ $locations_needing_embeddings -eq 0 ]; then
    echo "All locations already have embeddings. Skipping embedding generation."
    exit 0
fi

# Fetch locations that need embeddings
echo "Fetching locations and categories..."
temp_file=$(mktemp)

psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT 
        l.uuid || '|' || 
        COALESCE(l.name, '') || '|' || 
        COALESCE(l.address, '') || '|' ||
        COALESCE(
            string_agg(c.name, ', '),
            ''
        ) as location_data
    FROM locations l
    LEFT JOIN location_categories lc ON l.uuid = lc.location_uuid
    LEFT JOIN categories c ON lc.category_id = c.id
    WHERE l.embedding IS NULL
    GROUP BY l.uuid, l.name, l.address
    ORDER BY l.created_at;
" > "$temp_file"

# Process each location
updated_count=0
error_count=0
total_count=$(wc -l < "$temp_file")

echo "Processing $total_count locations for embedding generation..."

while IFS='|' read -r uuid name address categories; do
    # Skip empty lines
    [ -z "$uuid" ] && continue
    
    # Clean up the fields (remove leading/trailing whitespace)
    uuid=$(echo "$uuid" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    name=$(echo "$name" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    address=$(echo "$address" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    categories=$(echo "$categories" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    
    # Prepare text for embedding
    location_text=""
    [ -n "$name" ] && location_text="$name"
    [ -n "$address" ] && location_text="$location_text, $address"
    [ -n "$categories" ] && location_text="$location_text, $categories"
    location_text=$(echo "$location_text" | sed 's/^, *//')  # Remove leading comma
    
    if [ -z "$location_text" ]; then
        echo "WARNING: No text content for location $uuid, skipping"
        continue
    fi
    
    echo "Generating embedding for location: $name"
    
    # Generate embedding
    embedding=$(generate_embedding "$location_text")
    
    if [ $? -eq 0 ] && [ -n "$embedding" ]; then
        # Update location with embedding
        psql -U "$DB_USER" -d "$DB_NAME" -c "
            UPDATE locations SET embedding = '$embedding' WHERE uuid = '$uuid';
        " >/dev/null 2>&1
        
        if [ $? -eq 0 ]; then
            updated_count=$((updated_count + 1))
            
            # Log progress every 5 updates
            if [ $((updated_count % 5)) -eq 0 ]; then
                echo "Updated $updated_count/$total_count locations"
            fi
        else
            echo "ERROR: Failed to update location $uuid in database"
            error_count=$((error_count + 1))
        fi
    else
        echo "ERROR: Failed to generate embedding for location $uuid"
        error_count=$((error_count + 1))
    fi
    
    # Small delay between requests to be respectful to the API
    sleep_ms 100
    
done < "$temp_file"

# Cleanup
rm -f "$temp_file"

echo ""
echo "Embedding generation complete!"
echo "Successfully updated: $updated_count locations"
if [ $error_count -gt 0 ]; then
    echo "Failed to update: $error_count locations"
fi

# Final verification
final_stats=$(psql -U "$DB_USER" -d "$DB_NAME" -t -c "
    SELECT 
        COUNT(*) as total_locations,
        COUNT(embedding) as locations_with_embeddings
    FROM locations;
" | tr -d ' ')

final_total=$(echo "$final_stats" | cut -d'|' -f1)
final_with_embeddings=$(echo "$final_stats" | cut -d'|' -f2)

echo "Final stats: $final_with_embeddings/$final_total locations have embeddings"

if [ $error_count -gt 0 ]; then
    exit 1
fi

echo "Database initialization complete!"