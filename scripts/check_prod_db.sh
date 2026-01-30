#!/bin/bash
cd /opt/ch25
echo "=== 1. v2_user 테이블 password_hash 컬럼 확인 ==="
docker compose exec -T db mysql -u xmasuser -p2026 -D xmas_event -e "SHOW COLUMNS FROM v2_user WHERE Field='password_hash';"

echo ""
echo "=== 2. admin 계정 확인 ==="
docker compose exec -T db mysql -u xmasuser -p2026 -D xmas_event -e "SELECT id, cc_id, role, status, created_at, updated_at, password_hash IS NOT NULL as has_password FROM v2_user WHERE cc_id='admin';"

echo ""
echo "=== 3. alembic 현재 버전 확인 ==="
docker compose exec -T backend alembic current

echo ""
echo "=== 4. 최근 v2_user 생성된 계정 5개 ==="
docker compose exec -T db mysql -u xmasuser -p2026 -D xmas_event -e "SELECT id, cc_id, role, status, created_at FROM v2_user ORDER BY created_at DESC LIMIT 5;"
