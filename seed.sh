#!/bin/bash
# BillFlow Seed Script
# Seeds the database with sample billing data from seed-data folder
#
# Usage:
#   ./seed.sh         - Run seed in existing container
#   ./seed.sh fresh   - Rebuild and seed with fresh database

set -e

echo "==================================="
echo "  BillFlow Database Seeder"
echo "==================================="

# Check if we want a fresh database
if [ "$1" = "fresh" ]; then
    echo "Stopping containers and removing volumes..."
    docker-compose -f docker-compose.billflow.yml down -v
    echo "Starting fresh containers..."
    docker-compose -f docker-compose.billflow.yml up -d --build
    echo "Waiting for database to be ready..."
    sleep 10
fi

# Check if containers are running
if ! docker ps | grep -q billflow-backend; then
    echo "Starting containers..."
    docker-compose -f docker-compose.billflow.yml up -d
    echo "Waiting for services to start..."
    sleep 10
fi

echo ""
echo "Running seed script..."
docker exec billflow-backend node seed.js

echo ""
echo "==================================="
echo "  Seeding Complete!"
echo "==================================="
echo "Access the app at: http://localhost:3001"
echo "Login: admin / admin123"
