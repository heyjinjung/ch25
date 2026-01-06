
Write-Host "Connecting to remote server to perform DB backup..."
# SSH command using single quotes for the remote command to prevent PowerShell expansion of $(date)
# Inner single quotes are escaped as ''
# Added --single-transaction for non-blocking consistent backup
ssh root@149.28.135.147 'cd /root/ch25 && docker compose exec -T db mysqldump --single-transaction --no-tablespaces -u root -p''2026'' xmas_event | gzip > db_backup_$(date +%Y%m%d_%H%M%S).sql.gz && echo ''Backup created:'' && ls -lh db_backup_*.sql.gz | tail -n 1'
