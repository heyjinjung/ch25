-- Seed tables for external ranking + basic season-pass checks (idempotent)

-- 외부 랭킹 입력 테이블
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

-- 외부 랭킹 보상 로그
CREATE TABLE IF NOT EXISTS external_ranking_reward_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reward_type VARCHAR(50) NOT NULL,
  reward_amount INT NOT NULL,
  reason VARCHAR(100) NOT NULL,
  season_name VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 테스트 데이터 예시 (필요 시 주석 해제)
-- INSERT INTO external_ranking_data (user_id, deposit_amount, play_count, memo)
-- VALUES (999, 50000, 3, '테스트 입금/플레이');

