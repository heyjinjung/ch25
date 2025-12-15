#!/bin/bash

# Backup script for database and important files
# Run this before major updates or regularly via cron

set -e

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

mkdir -p ${BACKUP_DIR}

echo "Starting backup at ${TIMESTAMP}..."

# Backup database
echo "Backing up database..."
${DC} exec -T db sh -lc 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' | gzip > ${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz

# Backup environment files
echo "Backing up configuration files..."
cp ${APP_DIR}/.env ${BACKUP_DIR}/env_backup_${TIMESTAMP}

# Backup logs
echo "Backing up logs..."
if [ -d "${APP_DIR}/logs" ]; then
	tar -czf ${BACKUP_DIR}/logs_backup_${TIMESTAMP}.tar.gz ${APP_DIR}/logs
else
	echo "No logs directory found at ${APP_DIR}/logs (skipping)"
fi

# Keep only last 7 days of backups
echo "Cleaning old backups..."
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +7 -delete
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +7 -delete
find ${BACKUP_DIR} -name "env_backup_*" -mtime +7 -delete

echo "Backup completed: ${BACKUP_DIR}"
ls -lh ${BACKUP_DIR} | tail -5
