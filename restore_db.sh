#!/bin/sh
echo "Restoring database from /tmp/ch25_backup.sql.gz..."
zcat /tmp/ch25_backup.sql.gz | mysql -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"
echo "Done."
