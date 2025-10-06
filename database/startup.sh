#!/bin/bash
set -e

# Start postgres in background with proper network configuration
/usr/local/bin/docker-entrypoint.sh postgres -c listen_addresses='*' &
PID=$!

# Wait for postgres to be ready
until pg_isready -U postgres -q; do
  sleep 1
done

# Run migrations (will check if already applied)
echo "Running migrations on startup..."
/docker-entrypoint-initdb.d/02-migrate.sh || true

# Run seeds (will handle conflicts gracefully)
echo "Running seeds on startup..."
/docker-entrypoint-initdb.d/03-seed.sh || true

# Run the vector embeddings generation
echo "Running vector embeddings generation on startup..."
/docker-entrypoint-initdb.d/04-generate-embeddings.sh || true

# Keep postgres running in foreground
wait $PID
