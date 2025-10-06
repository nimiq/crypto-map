#!/bin/bash
set -euo pipefail

: "${POSTGRES_USER:=postgres}"
: "${POSTGRES_DB:=postgres}"

shopt -s nullglob

PRIMARY_DIR="/docker-entrypoint-initdb.d/migrations"
FALLBACK_DIR="/migrations"
MIGRATION_DIR="$FALLBACK_DIR"

if [ -d "$PRIMARY_DIR" ] && compgen -G "$PRIMARY_DIR/*.sql" > /dev/null; then
  MIGRATION_DIR="$PRIMARY_DIR"
elif [ ! -d "$FALLBACK_DIR" ] || ! compgen -G "$FALLBACK_DIR/*.sql" > /dev/null; then
  echo "No migration files found. Skipping migrations."
  exit 0
fi

echo "Running Drizzle migrations from $MIGRATION_DIR..."

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --command "CREATE TABLE IF NOT EXISTS public.__container_migrations (filename text PRIMARY KEY, applied_at timestamptz DEFAULT now());"

for migration in "$MIGRATION_DIR"/*.sql; do
  basename=$(basename "$migration")
  applied=$(psql -tA --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    --command "SELECT 1 FROM public.__container_migrations WHERE filename = '$basename' LIMIT 1;")

  if [[ "$applied" == "1" ]]; then
    echo "Skipping migration $basename (already applied)."
    continue
  fi

  echo "Applying migration: $basename"
  set +e
  output=$(psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration" 2>&1)
  status=$?
  set -e

  if [ $status -ne 0 ]; then
    if echo "$output" | grep -qi "already exists"; then
      echo "Migration $basename appears to have been applied previously; marking as applied."
    else
      echo "$output"
      echo "Migration $basename failed with status $status"
      exit $status
    fi
  else
    if [ -n "$output" ]; then
      echo "$output"
    fi
  fi

  psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    --command "INSERT INTO public.__container_migrations (filename) VALUES ('$basename') ON CONFLICT (filename) DO NOTHING;"
done

echo "Migrations complete!"
