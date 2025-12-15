#!/bin/sh
set -e
apk add --no-cache openssh-client sshpass >/dev/null
sshpass -p '2wP?+!Etm8#Qv4Mn' ssh -o StrictHostKeyChecking=no root@149.28.135.147 "apt-get update >/dev/null && apt-get install -y mysql-client >/dev/null && mysqldump --no-tablespaces -h127.0.0.1 -P3307 -uxmasuser -p'2wP?+!Etm8#Qv4Mn' xmas_event" > /work/remote_dump.sql
