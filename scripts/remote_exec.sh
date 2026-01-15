#!/bin/sh
set -e
export SSHPASS='2wP?+!Etm8#Qv4Mn'

# Find the project directory
echo "🔍 Searching for project directory..."
REMOTE_DIR=$(sshpass -e ssh -o StrictHostKeyChecking=no root@149.28.135.147 "find /root -maxdepth 2 -name ch25 -type d | head -n 1")

if [ -z "$REMOTE_DIR" ]; then
    echo "❌ Could not find 'ch25' directory. Listing /root:"
    sshpass -e ssh -o StrictHostKeyChecking=no root@149.28.135.147 "ls -F /root"
    exit 1
fi

echo "✅ Found project at: $REMOTE_DIR"

# Ensure scripts dir exists
sshpass -e ssh -o StrictHostKeyChecking=no root@149.28.135.147 "mkdir -p $REMOTE_DIR/scripts"

# Copy the python script
echo "📤 Copying report script..."
sshpass -e scp -o StrictHostKeyChecking=no /work/scripts/fetch_full_config_report.py root@149.28.135.147:$REMOTE_DIR/scripts/fetch_full_config_report.py

# Execute
echo "🚀 Running report on remote..."
sshpass -e ssh -o StrictHostKeyChecking=no root@149.28.135.147 "cd $REMOTE_DIR && docker cp scripts/fetch_full_config_report.py xmas-backend:/app/scripts/fetch_full_config_report.py && docker compose exec -T backend python scripts/fetch_full_config_report.py"
