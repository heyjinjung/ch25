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
  (1, 1,   0,  'COIN',  100, 0),
  (1, 2,  30,  'COIN',  200, 0),
  (1, 3,  80,  'COIN',  300, 0),
  (1, 4, 150,  'COIN',  500, 0),
  (1, 5, 240,  'COIN',  800, 0),
  (1, 6, 350,  'COIN', 1200, 0),
  (1, 7, 480,  'COIN', 2000, 0);

-- Align max level to 7 for the active season
UPDATE season_pass_config SET max_level = 7 WHERE id = 1;

-- Optional sample rows (commented out)
-- INSERT INTO external_ranking_data (user_id, deposit_amount, play_count, memo)
-- VALUES (999, 50000, 3, '입금 5만원'),
--        (1001, 30000, 5, '이벤트 참여 5회');
