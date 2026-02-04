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

echo "Waiting for backend container to be running..."
backend_wait=0
until ${DC} ps backend --format '{{.State}}' 2>/dev/null | grep -q "running"; do
  backend_wait=$((backend_wait+1))
  if [ "$backend_wait" -ge 30 ]; then
    echo "❌ Backend container failed to start"
    ${DC} logs --tail=100 backend || true
    exit 1
  fi
  echo "  Backend not ready yet, waiting... (${backend_wait}/30)"
  sleep 2
done
echo "✅ Backend container is running"

echo "[NGINX] Restarting nginx to refresh DNS cache (prevent 502)..."
docker restart xmas-nginx
sleep 2

echo "[MIGRATION] Running alembic upgrade head..."
mig_try=0
until ${DC} exec -T backend alembic upgrade head; do
  mig_try=$((mig_try+1))
  if [ "$mig_try" -ge 2 ]; then
    echo "❌ [MIGRATION] Failed after 2 attempts - check migration files!"
    ${DC} exec -T backend alembic current || true
    exit 1
  fi
  echo "  [MIGRATION] retrying (${mig_try}/2)..."
  sleep 3
done

echo "[HEALTH] Verifying backend health..."
if curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/api/v2/health | grep -q "200"; then
    echo "✅ Backend health check passed!"
else
    echo "⚠️ Backend health check failed - check logs: ${DC} logs backend"
fi

echo "Update completed!"
echo "Check logs with: ${DC} logs -f"
