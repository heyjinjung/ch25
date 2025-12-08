-- Seed helper for external ranking + season-pass sanity rows (idempotent)

-- External ranking data (per-user manual inputs)
CREATE TABLE IF NOT EXISTS external_ranking_data (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  deposit_amount INT NOT NULL DEFAULT 0,
  play_count INT NOT NULL DEFAULT 0,
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

-- Optional sample rows (commented out)
-- INSERT INTO external_ranking_data (user_id, deposit_amount, play_count, memo)
-- VALUES (999, 50000, 3, '입금 5만원'),
--        (1001, 30000, 5, '이벤트 참여 5회');
