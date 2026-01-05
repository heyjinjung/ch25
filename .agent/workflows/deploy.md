---
description: Standard Deployment Workflow via SSH
---
# 1. Server Login
# ssh root@149.28.135.147
# cd /root/ch25

# 2. Disk & Health Check
df -h
docker system df
docker compose ps
git status -sb

# 3. Pull & Reset Code (Safety First)
git fetch dev-fork
git reset --hard dev-fork/temp-merge2
git status -sb

# 4. Rebuild & Deploy
# Force rebuild to ensure latest code/env
docker compose up -d --build
docker compose ps

# 5. Database Migration
docker compose exec backend alembic upgrade head

# 6. Final Restart (Nginx Config Reload)
docker compose restart nginx
docker compose ps
