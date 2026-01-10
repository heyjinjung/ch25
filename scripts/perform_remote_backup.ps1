
Write-Host "Connecting to remote server to perform DB backup..."
# SSH command using single quotes for the remote command to prevent PowerShell expansion of $(date)
# Inner single quotes are escaped as ''
# Added --single-transaction for non-blocking consistent backup
ssh -i c:\Users\JAVIS\.ssh\id_ed25519_vultr -o StrictHostKeyChecking=no root@158.247.222.179 'cd /root/ch25 && docker compose exec -T db mysqldump --single-transaction --no-tablespaces -u root -p''2026'' xmas_event | gzip > db_backup_$(date +%Y%m%d_%H%M%S).sql.gz && echo ''Backup created:'' && ls -lh db_backup_*.sql.gz | tail -n 1'
