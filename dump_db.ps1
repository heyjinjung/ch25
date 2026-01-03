Write-Host "1. Connecting to server to dump database..."
# Escape logic: Powerhshell string uses double quotes. ` escapes $.
# Remote command: " ... "
# We want remote to see: mysqldump ... -p"$MYSQL_ROOT_PASSWORD" ...
# So we need to pass `$` literally to ssh.
ssh root@149.28.135.147 "cd /root/ch25 && set -a; . ./.env; set +a; docker compose exec -T db mysqldump -u root -p`"`$MYSQL_ROOT_PASSWORD`" `$MYSQL_DATABASE | gzip > /tmp/backup.sql.gz"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to dump database via SSH."
    exit $LASTEXITCODE
}

Write-Host "2. Downloading database..."
scp root@149.28.135.147:/tmp/backup.sql.gz ./ch25_backup.sql.gz

if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to download database via SCP."
    exit $LASTEXITCODE
}

Write-Host "3. Cleaning up server..."
ssh root@149.28.135.147 "rm /tmp/backup.sql.gz"

Write-Host "Done! Saved to $(Resolve-Path ./ch25_backup.sql.gz)"
