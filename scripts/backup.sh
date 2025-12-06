#!/bin/bash

# Backup script for database and important files
# Run this before major updates or regularly via cron

set -e

BACKUP_DIR="/opt/backups/xmas-event"
APP_DIR="/opt/xmas-event"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p ${BACKUP_DIR}

echo "Starting backup at ${TIMESTAMP}..."

# Backup database
echo "Backing up database..."
docker-compose exec -T db mysqldump -u root -p${MYSQL_ROOT_PASSWORD} ${MYSQL_DATABASE} | gzip > ${BACKUP_DIR}/db_backup_${TIMESTAMP}.sql.gz

# Backup environment files
echo "Backing up configuration files..."
cp ${APP_DIR}/.env ${BACKUP_DIR}/env_backup_${TIMESTAMP}

# Backup logs
echo "Backing up logs..."
tar -czf ${BACKUP_DIR}/logs_backup_${TIMESTAMP}.tar.gz ${APP_DIR}/logs

# Keep only last 7 days of backups
echo "Cleaning old backups..."
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +7 -delete
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +7 -delete
find ${BACKUP_DIR} -name "env_backup_*" -mtime +7 -delete

echo "Backup completed: ${BACKUP_DIR}"
ls -lh ${BACKUP_DIR} | tail -5
