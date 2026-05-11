#!/bin/sh
set -e

echo "Starting OpenWorkpaper entrypoint script..."

# Set a default DATABASE_URL if not provided
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/prisma/data/dev.db"
  echo "Using default DATABASE_URL: $DATABASE_URL"
fi

# Extract the path from the file: URL
DB_PATH=$(echo "$DATABASE_URL" | sed 's|file:||')
DB_DIR=$(dirname "$DB_PATH")

# Ensure the directory for the database exists
if [ ! -d "$DB_DIR" ]; then
  echo "Creating database directory: $DB_DIR"
  mkdir -p "$DB_DIR"
fi

echo "Database directory diagnostics:"
ls -ld "$DB_DIR"
if [ -f "$DB_PATH" ]; then
  echo "Database file exists at $DB_PATH"
  ls -l "$DB_PATH"
else
  echo "Database file does not exist yet at $DB_PATH"
fi

# Run Prisma db push to ensure DB schema is created
# Using the binary directly to avoid npx/npm overhead and potential cache issues
PRISMA_BIN="./node_modules/.bin/prisma"

if [ -f "$PRISMA_BIN" ]; then
  echo "Initializing database schema with $PRISMA_BIN..."
  $PRISMA_BIN db push --accept-data-loss
  
  echo "Seeding database..."
  $PRISMA_BIN db seed
else
  echo "WARNING: Prisma binary not found at $PRISMA_BIN. Attempting to use npx prisma..."
  npx prisma db push --accept-data-loss
  npx prisma db seed
fi

# Start the application
echo "Starting OpenWorkpaper application..."
exec node server.js
