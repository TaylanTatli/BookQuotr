#!/bin/sh
set -e

# Default to the volume-mounted database when DATABASE_URL is not provided.
export DATABASE_URL="${DATABASE_URL:-file:/app/data/bookquotr.db}"

# Make sure the (volume-mounted) data directory exists and is writable.
mkdir -p /app/data

echo "Running Prisma migrations..."
prisma migrate deploy

echo "Starting application..."
exec node server.js
