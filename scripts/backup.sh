#!/bin/bash

# Backup script for database and important files
# Run this before major updates or regularly via cron

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-/root/backups/xmas-event}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Prefer Docker Compose v2 plugin if available
if docker compose version >/dev/null 2>&1; then
	DC="docker compose"
else
	DC="docker-compose"
fi

mkdir -p "${BACKUP_DIR}"

echo "Starting backup at ${TIMESTAMP}..."

# Backup database
echo "Backing up database..."
DB_BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz"

# Use MYSQL_PWD to avoid exposing the password as a CLI flag inside the container
# (still visible to root inside container env, but avoids `-p...` in argv)
${DC} exec -T db sh -lc 'export MYSQL_PWD="$MYSQL_ROOT_PASSWORD"; mysqldump --single-transaction --quick --routines --triggers -u root "$MYSQL_DATABASE"' \
	| gzip > "${DB_BACKUP_FILE}"

# Backup environment files
echo "Backing up configuration files..."
if [ -f "${APP_DIR}/.env" ]; then
	cp "${APP_DIR}/.env" "${BACKUP_DIR}/env_backup_${TIMESTAMP}"
else
	echo "No .env found at ${APP_DIR}/.env (skipping)"
fi

# Backup logs
echo "Backing up logs..."
if [ -d "${APP_DIR}/logs" ]; then
	tar -czf "${BACKUP_DIR}/logs_backup_${TIMESTAMP}.tar.gz" "${APP_DIR}/logs"
else
	echo "No logs directory found at ${APP_DIR}/logs (skipping)"
fi

# Keep only last 7 days of backups
echo "Cleaning old backups..."
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +7 -delete || true
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +7 -delete || true
find "${BACKUP_DIR}" -name "env_backup_*" -mtime +7 -delete || true

echo "Backup completed: ${BACKUP_DIR}"
ls -lh "${BACKUP_DIR}" | tail -5

echo ""
echo "Restore example:"
echo "  gunzip -c ${DB_BACKUP_FILE} | docker compose exec -T db sh -lc 'mysql -u root -p"'$MYSQL_ROOT_PASSWORD'" "$MYSQL_DATABASE"'"
