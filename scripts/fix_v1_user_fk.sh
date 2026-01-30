#!/bin/bash
cd /opt/ch25

# V1 user 테이블에 admin 레코드 추가 (FK 제약조건 충족을 위함)
docker compose exec -T db mysql -u xmasuser -p2026 -D xmas_event -e "
INSERT IGNORE INTO user (id, telegram_id, external_id, nickname, status, created_at, updated_at)
SELECT id, telegram_id, cc_id, nickname, 'active', created_at, updated_at
FROM v2_user
WHERE cc_id = 'admin';
"

echo "=== V1 user 테이블 확인 ==="
docker compose exec -T db mysql -u xmasuser -p2026 -D xmas_event -e "SELECT id, external_id, nickname, status FROM user WHERE external_id='admin';"

echo ""
echo "=== 로그인 테스트 ==="
curl -s -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"cc_id":"admin","password":"20260130"}'
