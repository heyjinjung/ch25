# Server Configuration
$SERVER_IP = "149.28.135.147"
$REMOTE_USER = "root"
$REMOTE_DB_CONTAINER = "xmas-db"
$KEY_PATH = "C:\Users\JAVIS\ch\ch25\.ssh\id_ed25519_vultr"
if (-not (Test-Path $KEY_PATH)) {
    $KEY_PATH = "C:\Users\JAVIS\.ssh\id_ed25519_vultr"
}

# Local Configuration
$LOCAL_DB_CONTAINER = "xmas-db"

# Temp File
$DUMP_FILE = "server_dump.sql"

# SSH options
$SSH_OPTS = "-i `"$KEY_PATH`" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

# Local backup (safety)
$TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
$LOCAL_BACKUP_FILE = "local_backup_$TIMESTAMP.sql"

function Get-ContainerEnvMap {
    param([Parameter(Mandatory = $true)][string]$Container)
    $map = @{}
    try {
        $envLines = docker inspect $Container --format "{{range .Config.Env}}{{println .}}{{end}}" 2>$null
        foreach ($line in ($envLines -split "`r?`n")) {
            $trimmed = $line.Trim()
            if (-not $trimmed) { continue }
            $idx = $trimmed.IndexOf("=")
            if ($idx -lt 1) { continue }
            $key = $trimmed.Substring(0, $idx)
            $val = $trimmed.Substring($idx + 1)
            $map[$key] = $val
        }
    }
    catch {}
    return $map
}

function Test-MySqlAuth {
    param($Container, $User, $Password)
    & docker exec -e "MYSQL_PWD=$Password" $Container mysqladmin ping -u $User -h 127.0.0.1 --silent 2>$null
    return ($LASTEXITCODE -eq 0)
}

function Wait-ForMySqlReady {
    param($Container, $DbName, $RootPassword, $User, $UserPassword, $TimeoutSeconds = 90)
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-MySqlAuth -Container $Container -User "root" -Password $RootPassword) {
            return @{ user = "root"; password = $RootPassword }
        }
        if (Test-MySqlAuth -Container $Container -User $User -Password $UserPassword) {
            return @{ user = $User; password = $UserPassword }
        }
        Start-Sleep -Seconds 2
    }
    return $null
}

$localEnv = Get-ContainerEnvMap -Container $LOCAL_DB_CONTAINER
$LOCAL_DB_ROOT_PASSWORD = $localEnv["MYSQL_ROOT_PASSWORD"]
$LOCAL_DB_NAME = $localEnv["MYSQL_DATABASE"]
$LOCAL_DB_USER = $localEnv["MYSQL_USER"]
$LOCAL_DB_PASSWORD = $localEnv["MYSQL_PASSWORD"]

if (-not $LOCAL_DB_ROOT_PASSWORD) { $LOCAL_DB_ROOT_PASSWORD = "2026" }
if (-not $LOCAL_DB_NAME) { $LOCAL_DB_NAME = "xmas_event" }
if (-not $LOCAL_DB_USER) { $LOCAL_DB_USER = "xmasuser" }
if (-not $LOCAL_DB_PASSWORD) { $LOCAL_DB_PASSWORD = "2026" }

Write-Host "Fetching Remote DB environment..." -ForegroundColor Cyan
# SSH call to get remote env
$REMOTE_DB_ROOT_PASSWORD = (ssh -i $KEY_PATH -o StrictHostKeyChecking=no root@$SERVER_IP "docker exec $REMOTE_DB_CONTAINER printenv MYSQL_ROOT_PASSWORD" 2>$null)
$REMOTE_DB_NAME = (ssh -i $KEY_PATH -o StrictHostKeyChecking=no root@$SERVER_IP "docker exec $REMOTE_DB_CONTAINER printenv MYSQL_DATABASE" 2>$null)

if (-not $REMOTE_DB_ROOT_PASSWORD) { $REMOTE_DB_ROOT_PASSWORD = "2026" }
if (-not $REMOTE_DB_NAME) { $REMOTE_DB_NAME = "xmas_event" }

Write-Host "Local DB: $LOCAL_DB_NAME" -ForegroundColor DarkGray
Write-Host "Remote DB: $REMOTE_DB_NAME on $SERVER_IP" -ForegroundColor DarkGray

$auth = Wait-ForMySqlReady -Container $LOCAL_DB_CONTAINER -DbName $LOCAL_DB_NAME -RootPassword $LOCAL_DB_ROOT_PASSWORD -User $LOCAL_DB_USER -UserPassword $LOCAL_DB_PASSWORD -TimeoutSeconds 30
if (-not $auth) {
    Write-Host "Error: Local MySQL not ready." -ForegroundColor Red
    exit 1
}

$localAuthUser = $auth.user
$localAuthPassword = $auth.password

Write-Host "0. Backing up local database to $LOCAL_BACKUP_FILE ..." -ForegroundColor Cyan
& docker exec -e "MYSQL_PWD=$localAuthPassword" $LOCAL_DB_CONTAINER mysqldump --default-character-set=utf8mb4 -u $localAuthUser $LOCAL_DB_NAME > $LOCAL_BACKUP_FILE

Write-Host "1. Dumping remote database..." -ForegroundColor Cyan
# We use cmd /c here because redirection of a remote stream over SSH to a file is most reliably done this way in Windows
$remoteDumpCmd = "ssh -i `"$KEY_PATH`" -o StrictHostKeyChecking=no $REMOTE_USER@$SERVER_IP `"docker exec $REMOTE_DB_CONTAINER mysqldump --default-character-set=utf8mb4 -u root -p$REMOTE_DB_ROOT_PASSWORD $REMOTE_DB_NAME`" > $DUMP_FILE"
cmd /c $remoteDumpCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error dumping database." -ForegroundColor Red
    exit 1
}

Write-Host "2. Importing to local database..." -ForegroundColor Cyan
# Use cmd /c for type piping
$importCmd = "type $DUMP_FILE | docker exec -i $LOCAL_DB_CONTAINER sh -lc `"export MYSQL_PWD='$localAuthPassword'; mysql --default-character-set=utf8mb4 -u '$localAuthUser' '$LOCAL_DB_NAME'`""
cmd /c $importCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error importing database." -ForegroundColor Red
    exit 1
}

Write-Host "3. Cleaning up..." -ForegroundColor Cyan
if (Test-Path $DUMP_FILE) { Remove-Item $DUMP_FILE }

Write-Host "Database sync from 149 completed successfully!" -ForegroundColor Green
