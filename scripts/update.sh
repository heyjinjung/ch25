#!/bin/bash

# Quick update script for code changes
# Use this to update the application without full redeployment

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
cd "$APP_DIR"

# Prefer Docker Compose v2 plugin if available
if docker compose version >/dev/null 2>&1; then
	DC="docker compose"
else
	DC="docker-compose"
fi

echo "Pulling latest changes from Git..."
git pull

echo "Rebuilding containers..."
${DC} build

echo "Restarting services..."
${DC} up -d

echo "Running migrations (if any)..."
${DC} exec -T backend alembic upgrade head

echo "Update completed!"
echo "Check logs with: ${DC} logs -f"
