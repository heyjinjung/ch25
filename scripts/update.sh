#!/bin/bash

# Quick update script for code changes
# Use this to update the application without full redeployment

set -e

APP_DIR="/opt/xmas-event"
cd ${APP_DIR}

echo "Pulling latest changes from Git..."
git pull

echo "Rebuilding containers..."
docker-compose build

echo "Restarting services..."
docker-compose up -d

echo "Running migrations (if any)..."
docker-compose exec -T backend alembic upgrade head

echo "Update completed!"
echo "Check logs with: docker-compose logs -f"
