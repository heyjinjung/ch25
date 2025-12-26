# Server Configuration
$SERVER_IP = "149.28.135.147"
$REMOTE_USER = "root"
$REMOTE_DB_CONTAINER = "xmas-db"

# Local Configuration
$LOCAL_DB_CONTAINER = "xmas-db"

# Temp File
$DUMP_FILE = "server_dump.sql"

# SSH options (avoid interactive host key prompts)
$SSH_OPTS = "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

# Local backup (safety)
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$LOCAL_BACKUP_FILE = "local_backup_$TIMESTAMP.sql"

function Get-LocalContainerEnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$Container,
        [Parameter(Mandatory = $true)][string]$Name
    )
    try {
        $val = (docker exec $Container sh -lc "printenv $Name" 2>$null)
        return ($val -join "\n").Trim()
    } catch {
        return ""
    }
}

function Get-RemoteContainerEnvValue {
    param(
        [Parameter(Mandatory = $true)][string]$Server,
        [Parameter(Mandatory = $true)][string]$User,
        [Parameter(Mandatory = $true)][string]$Container,
        [Parameter(Mandatory = $true)][string]$Name
    )
    try {
        $val = (ssh $SSH_OPTS "$User@$Server" "docker exec $Container sh -lc 'printenv $Name'" 2>$null)
        return ($val -join "\n").Trim()
    } catch {
        return ""
    }
}

$LOCAL_DB_ROOT_PASSWORD = Get-LocalContainerEnvValue -Container $LOCAL_DB_CONTAINER -Name "MYSQL_ROOT_PASSWORD"
$LOCAL_DB_NAME = Get-LocalContainerEnvValue -Container $LOCAL_DB_CONTAINER -Name "MYSQL_DATABASE"

if (-not $LOCAL_DB_ROOT_PASSWORD) { $LOCAL_DB_ROOT_PASSWORD = "rootpassword" }
if (-not $LOCAL_DB_NAME) { $LOCAL_DB_NAME = "xmas_event" }

$REMOTE_DB_ROOT_PASSWORD = Get-RemoteContainerEnvValue -Server $SERVER_IP -User $REMOTE_USER -Container $REMOTE_DB_CONTAINER -Name "MYSQL_ROOT_PASSWORD"
$REMOTE_DB_NAME = Get-RemoteContainerEnvValue -Server $SERVER_IP -User $REMOTE_USER -Container $REMOTE_DB_CONTAINER -Name "MYSQL_DATABASE"

if (-not $REMOTE_DB_ROOT_PASSWORD) { $REMOTE_DB_ROOT_PASSWORD = "rootpassword" }
if (-not $REMOTE_DB_NAME) { $REMOTE_DB_NAME = "xmas_event" }

Write-Host "Local DB: $LOCAL_DB_NAME (container: $LOCAL_DB_CONTAINER)" -ForegroundColor DarkGray
Write-Host "Remote DB: $REMOTE_DB_NAME (container: $REMOTE_DB_CONTAINER on $SERVER_IP)" -ForegroundColor DarkGray

Write-Host "0. Backing up local database to $LOCAL_BACKUP_FILE ..." -ForegroundColor Cyan
cmd /c "docker exec $LOCAL_DB_CONTAINER mysqldump --default-character-set=utf8mb4 -u root -p$LOCAL_DB_ROOT_PASSWORD $LOCAL_DB_NAME > $LOCAL_BACKUP_FILE"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error backing up local database. Aborting to avoid data loss." -ForegroundColor Red
    exit 1
}

Write-Host "1. Dumping remote database..." -ForegroundColor Cyan
# Use cmd /c to avoid PowerShell encoding issues (UTF-16 default) and ensure UTF-8/Binary preservation
# Also added --default-character-set=utf8mb4 to mysqldump
cmd /c "ssh $SSH_OPTS $REMOTE_USER@$SERVER_IP ""docker exec $REMOTE_DB_CONTAINER mysqldump --default-character-set=utf8mb4 -u root -p$REMOTE_DB_ROOT_PASSWORD $REMOTE_DB_NAME"" > $DUMP_FILE"

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
