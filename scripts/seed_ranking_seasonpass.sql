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

-- Season pass levels (7-step curve, cumulative XP)
DELETE FROM season_pass_level;
INSERT INTO season_pass_level (season_id, level, required_xp, reward_type, reward_amount, auto_claim) VALUES
  (1, 1,    0, 'LOTTERY_TICKET',   1, 0),
  (1, 2,   80, 'DICE_TICKET',      2, 0),
  (1, 3,  150, 'ROULETTE_TICKET',  2, 0),
  (1, 4,  300, 'TICKET_BUNDLE',    3, 0),   -- 복권2 + 주사위1
  (1, 5,  500, 'TICKET_BUNDLE',    5, 0),   -- 주사위3 + 룰렛2
  (1, 6,  750, 'TICKET_BUNDLE',    6, 0),   -- 복권3 + 룰렛3
  (1, 7, 1000, 'TICKET_BUNDLE',   15, 0);   -- 각 5장씩 총 15

-- Align max level to 7 for the active season
UPDATE season_pass_config SET max_level = 7, base_xp_per_stamp = 40 WHERE id = 1;
UPDATE season_pass_config SET base_xp_per_stamp = 20 WHERE id = 1;

-- Optional sample rows (commented out)
-- INSERT INTO external_ranking_data (user_id, deposit_amount, play_count, memo)
-- VALUES (999, 50000, 3, '입금 5만원'),
--        (1001, 30000, 5, '이벤트 참여 5회');
