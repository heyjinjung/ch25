#!/bin/bash

# Quick update script for code changes
# Use this to update the application without full redeployment
# 2026-02-01: Nginx 재시작 추가 (DNS 캐시 불일치로 인한 502 에러 방지)

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

echo "Waiting for backend to be ready (5s)..."
sleep 5

echo "Restarting Nginx (to refresh DNS cache)..."
docker restart xmas-nginx

echo "Running migrations (if any)..."
${DC} exec -T backend alembic upgrade heads

echo "Verifying health..."
if curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/api/v2/health | grep -q "200"; then
    echo "✅ Backend health check passed!"
else
    echo "⚠️ Backend health check failed - check logs: ${DC} logs backend"
fi

echo "Update completed!"
echo "Check logs with: ${DC} logs -f"
