-- Seed helper for external ranking + season-pass sanity rows (idempotent)

-- External ranking data (per-user manual inputs)
CREATE TABLE IF NOT EXISTS external_ranking_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  deposit_amount INT NOT NULL DEFAULT 0,
  play_count INT NOT NULL DEFAULT 0,
  daily_base_deposit INT NOT NULL DEFAULT 0,
  daily_base_play INT NOT NULL DEFAULT 0,
  last_daily_reset DATE NULL,
  memo VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_external_ranking_user (user_id)
);

-- Reward audit log for external ranking payouts
CREATE TABLE IF NOT EXISTS external_ranking_reward_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reward_type VARCHAR(50) NOT NULL,
  reward_amount INT NOT NULL,
  reason VARCHAR(100) NOT NULL,
  season_name VARCHAR(50) NOT NULL,
  data_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Season pass levels (10-step, active season)
-- NOTE: Uses the currently active season (is_active=1). If multiple actives exist, it picks the highest id.
SET @season_id := (SELECT id FROM season_pass_config WHERE is_active = 1 ORDER BY id DESC LIMIT 1);

DELETE FROM season_pass_level WHERE season_id = @season_id;
INSERT INTO season_pass_level (season_id, level, required_xp, reward_type, reward_amount, auto_claim) VALUES
  (@season_id,  1,    0, 'TICKET_ROULETTE',  3, 1),
  (@season_id,  2,   50, 'TICKET_DICE',     3, 1),
  (@season_id,  3,  100, 'TICKET_BUNDLE',   1, 1), -- 올인원 티켓 번들 (룰1+주1+복1)
  (@season_id,  4,  200, 'TICKET_LOTTERY',  3, 1),
  (@season_id,  5,  300, 'TICKET_BOMB',     1, 1), -- 티켓 폭탄 (룰렛3+주사위3)
  (@season_id,  6,  450, 'TICKET_LOTTERY',  7, 1),
  (@season_id,  7,  600, 'POINT_AND_ITEM',  1, 1), -- 1만 P + 골드 키 (Special handling required via code or separate columns, simplified here as placeholder)
  (@season_id,  8,  800, 'POINT',       30000, 0),
  (@season_id,  9, 1000, 'POINT',       50000, 0),
  (@season_id, 10, 1300, 'POINT_AND_ITEM',  2, 0); -- 10만 P + 다이아몬드 키

-- Align max level to 10 for the active season (XP per stamp = 20)
UPDATE season_pass_config SET max_level = 10, base_xp_per_stamp = 20 WHERE id = @season_id;

-- Ensure stamp log has reward columns for audit
ALTER TABLE season_pass_stamp_log
  ADD COLUMN IF NOT EXISTS reward_type VARCHAR(50) NOT NULL DEFAULT 'XP',
  ADD COLUMN IF NOT EXISTS reward_amount INT NOT NULL DEFAULT 0;

-- Optional sample rows (commented out)
-- INSERT INTO external_ranking_data (user_id, deposit_amount, play_count, memo)
-- VALUES (999, 50000, 3, '입금 5만원'),
--        (1001, 30000, 5, '이벤트 참여 5회');
