#!/bin/bash
cd /opt/ch25

# V2 user의 모든 레코드를 V1 user에 동기화 (같은 ID로)
docker compose exec -T db mysql -u xmasuser -p2026 -D xmas_event -e "
-- 먼저 기존 V1 user 테이블 확인
SELECT 'V1 user 테이블 기존 데이터:' as info;
SELECT id, external_id, nickname, status FROM user ORDER BY id;

-- V2 user의 레코드를 V1에 추가 (ID 충돌 방지)
INSERT INTO user (id, telegram_id, external_id, nickname, status, created_at, updated_at)
SELECT v2.id, v2.telegram_id, v2.cc_id, v2.nickname, 'active', v2.created_at, v2.updated_at
FROM v2_user v2
WHERE v2.id NOT IN (SELECT id FROM user)
ON DUPLICATE KEY UPDATE external_id=VALUES(external_id);

SELECT 'V1 user 동기화 후:' as info;
SELECT id, external_id, nickname, status FROM user ORDER BY id;
"

echo ""
echo "=== 로그인 테스트 ==="
curl -s -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"cc_id":"admin","password":"20260130"}'
