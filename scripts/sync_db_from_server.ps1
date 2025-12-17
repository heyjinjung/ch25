# Server Configuration
$SERVER_IP = "149.28.135.147"
$REMOTE_USER = "root"
$REMOTE_APP_DIR = "/root/ch25"
$REMOTE_DB_CONTAINER = "xmas-db"
$REMOTE_DB_NAME = "xmas_event"
$REMOTE_DB_ROOT_PASSWORD = "rootpassword" # Check your server .env if changed

# Local Configuration
$LOCAL_DB_CONTAINER = "xmas-db"
$LOCAL_DB_NAME = "xmas_event"
$LOCAL_DB_ROOT_PASSWORD = "rootpassword" # Match docker-compose.yml

# Temp File
$DUMP_FILE = "server_dump.sql"

Write-Host "1. Dumping remote database..." -ForegroundColor Cyan
# Use cmd /c to avoid PowerShell encoding issues (UTF-16 default) and ensure UTF-8/Binary preservation
# Also added --default-character-set=utf8mb4 to mysqldump
cmd /c "ssh $REMOTE_USER@$SERVER_IP ""docker exec $REMOTE_DB_CONTAINER mysqldump --default-character-set=utf8mb4 -u root -p$REMOTE_DB_ROOT_PASSWORD $REMOTE_DB_NAME"" > $DUMP_FILE"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error dumping database. Check SSH connection and credentials." -ForegroundColor Red
    exit 1
}

Write-Host "2. Importing to local database..." -ForegroundColor Cyan
# Use cmd /c for import as well to handle the file stream correctly
# Added --default-character-set=utf8mb4 to mysql import
cmd /c "type $DUMP_FILE | docker exec -i $LOCAL_DB_CONTAINER mysql --default-character-set=utf8mb4 -u root -p$LOCAL_DB_ROOT_PASSWORD $LOCAL_DB_NAME"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error importing database." -ForegroundColor Red
    exit 1
}

Write-Host "3. Cleaning up..." -ForegroundColor Cyan
Remove-Item $DUMP_FILE

Write-Host "Database sync completed successfully!" -ForegroundColor Green
