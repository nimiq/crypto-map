#!/bin/bash
set -euo pipefail

: "${POSTGRES_USER:=postgres}"
: "${POSTGRES_DB:=postgres}"

SEEDS_DIR="/docker-entrypoint-initdb.d/seeds"

if [ ! -d "$SEEDS_DIR" ]; then
  echo "No seeds directory found. Skipping seeds."
  exit 0
fi

echo "Running database seeds..."

# Run RLS policies first
if [ -f "$SEEDS_DIR/rls-policies.sql" ]; then
  echo "Applying RLS policies..."
  psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$SEEDS_DIR/rls-policies.sql"
fi

# Run categories seed
if [ -f "$SEEDS_DIR/categories.sql" ]; then
  echo "Seeding categories..."
  psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$SEEDS_DIR/categories.sql"
fi

# Run all source seeds
if [ -d "$SEEDS_DIR/sources" ]; then
  for seed in "$SEEDS_DIR/sources"/*.sql; do
    if [ -f "$seed" ]; then
      echo "Seeding $(basename "$seed")..."
      psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$seed"
    fi
  done
fi

echo "Seeds complete!"
