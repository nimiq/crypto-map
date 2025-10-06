#!/bin/bash
set -e

echo "Running Drizzle migrations..."
for migration in /docker-entrypoint-initdb.d/migrations/*.sql; do
  if [ -f "$migration" ]; then
    echo "Applying migration: $(basename $migration)"
    psql -v ON_ERROR_STOP=0 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$migration" 2>&1 | grep -v "already exists" || true
  fi
done

echo "Migrations complete!"
