INSERT INTO mission (title, description, category, logic_key, action_type, target_value, reward_type, reward_amount, xp_reward, is_active, created_at)
VALUES 
('첫 게임 플레이', '아무 게임이나 1회 플레이하세요.', 'NEW_USER', 'NEW_USER_PLAY_1', 'PLAY_GAME', 1, 'CASH_UNLOCK', 2500, 0, 1, NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), action_type=VALUES(action_type), reward_type=VALUES(reward_type), reward_amount=VALUES(reward_amount);

INSERT INTO mission (title, description, category, logic_key, action_type, target_value, reward_type, reward_amount, xp_reward, is_active, created_at)
VALUES 
('게임 마스터 (3회)', '게임을 3회 더 플레이해보세요.', 'NEW_USER', 'NEW_USER_PLAY_3', 'PLAY_GAME', 3, 'CASH_UNLOCK', 2500, 0, 1, NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), action_type=VALUES(action_type), reward_type=VALUES(reward_type), reward_amount=VALUES(reward_amount);

INSERT INTO mission (title, description, category, logic_key, action_type, target_value, reward_type, reward_amount, xp_reward, is_active, created_at)
VALUES 
('커뮤니티 함께하기', '공식 채널에 입장하거나 스토리를 공유하세요.', 'NEW_USER', 'NEW_USER_VIRAL', 'JOIN_CHANNEL', 1, 'CASH_UNLOCK', 2500, 0, 1, NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), action_type=VALUES(action_type), reward_type=VALUES(reward_type), reward_amount=VALUES(reward_amount);

INSERT INTO mission (title, description, category, logic_key, action_type, target_value, reward_type, reward_amount, xp_reward, is_active, created_at)
VALUES 
('2일차 출석 체크', '내일 다시 접속하여 출석체크를 완료하세요.', 'NEW_USER', 'NEW_USER_LOGIN_DAY2', 'daily_checkin', 1, 'CASH_UNLOCK', 2500, 0, 1, NOW())
ON DUPLICATE KEY UPDATE title=VALUES(title), description=VALUES(description), action_type=VALUES(action_type), reward_type=VALUES(reward_type), reward_amount=VALUES(reward_amount);
