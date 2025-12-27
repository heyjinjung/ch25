-- 1. 유저 11명 생성 (중복 무시)
INSERT IGNORE INTO user (external_id, nickname, password_hash, vault_locked_balance, vault_balance, vault_locked_expires_at, level, xp, status, created_at, updated_at)
SELECT name, name, '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', 10000, 10000, '2025-12-28 23:59:59', 1, 0, 'ACTIVE', NOW(), NOW()
FROM (
  SELECT '힙합중' AS name UNION SELECT '해조다요' UNION SELECT '진심펀치' UNION SELECT '민아가자' UNION 
  SELECT '걸리면다이' UNION SELECT '벵에돔낚시' UNION SELECT '민보이' UNION SELECT '자르반이루' UNION 
  SELECT 'ryan0218' UNION SELECT '승아지' UNION SELECT '휴식시간'
) AS t;

-- 2. 금고 해금 조건 (1만 원 입금 시 1만 원 해금)
-- column name 'key' is a reserved keyword, using backticks
SET @program_id := (SELECT id FROM vault_program WHERE `key` = 'NEW_MEMBER_VAULT');
UPDATE vault_program SET unlock_rules_json = JSON_SET(COALESCE(unlock_rules_json, '{}'), '$.phase1_deposit_unlock.tiers', JSON_ARRAY(JSON_OBJECT('min_deposit_delta', 10000, 'unlock_amount', 10000))) WHERE id = @program_id;

-- 3. 티켓 지급
INSERT INTO user_game_wallet (user_id, token_type, balance, updated_at)
SELECT id, 'ROULETTE_COIN', 3, NOW() FROM user WHERE nickname IN ('힙합중','해조다요','진심펀치','민아가자','걸리면다이','벵에돔낚시','민보이','자르반이루','ryan0218','승아지','휴식시간')
ON DUPLICATE KEY UPDATE balance = balance + 3, updated_at = NOW();

INSERT INTO user_game_wallet (user_id, token_type, balance, updated_at)
SELECT id, 'DICE_TOKEN', 2, NOW() FROM user WHERE nickname IN ('힙합중','해조다요','진심펀치','민아가자','걸리면다이','벵에돔낚시','민보이','자르반이루','ryan0218','승아지','휴식시간')
ON DUPLICATE KEY UPDATE balance = balance + 2, updated_at = NOW();
