#!/bin/sh
set -e

# Set a default DATABASE_URL if not provided
if [ -z "$DATABASE_URL" ]; then
  export DATABASE_URL="file:/app/prisma/data/dev.db"
fi

# Ensure the directory for the database exists (though Dockerfile should handle it)
mkdir -p $(dirname "$DATABASE_URL" | sed 's|file:||')

# Run Prisma db push to ensure DB schema is created
echo "Initializing database schema..."
npx prisma db push --accept-data-loss

# Seed the database with initial admin user if needed
echo "Seeding database..."
npx prisma db seed

# Start the application
echo "Starting OpenWorkpaper..."
exec node server.js
