$ErrorActionPreference = "Stop"

Write-Host "Copying init_ssl.sh to server..."
scp scripts/init_ssl.sh root@149.28.135.147:/opt/2026/

Write-Host "Executing init_ssl.sh on server..."
ssh -t root@149.28.135.147 "sed -i 's/\r$//' /opt/2026/init_ssl.sh && chmod +x /opt/2026/init_ssl.sh && cd /opt/2026 && ./init_ssl.sh"

Write-Host "Done!"
