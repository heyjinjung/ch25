-- Deactivate old seasons
UPDATE season_pass_config SET is_active = 0 WHERE is_active = 1;

-- Insert new bridge season
INSERT INTO season_pass_config (season_name, start_date, end_date, max_level, base_xp_per_stamp, is_active) 
VALUES ('연말 브릿지 시즌 (12/25-1/1)', '2025-12-25', '2026-01-01', 10, 50, 1);

-- Get the last insert id and use it for levels
-- In a script, we can query it or use a variable if the shell supports it, but since we are piping or running via exec, let's just use a subquery for safety.

INSERT INTO season_pass_level (season_id, level, required_xp, reward_type, reward_amount, auto_claim) 
SELECT id, 1, 0, 'ROULETTE_TICKET', 1, 1 FROM season_pass_config WHERE is_active = 1 AND season_name = '연말 브릿지 시즌 (12/25-1/1)' ORDER BY id DESC LIMIT 1;

INSERT INTO season_pass_level (season_id, level, required_xp, reward_type, reward_amount, auto_claim) 
SELECT id, 2, 50, 'DICE_TICKET', 1, 1 FROM season_pass_config WHERE is_active = 1 AND season_name = '연말 브릿지 시즌 (12/25-1/1)' ORDER BY id DESC LIMIT 1;

INSERT INTO season_pass_level (season_id, level, required_xp, reward_type, reward_amount, auto_claim) 
SELECT id, 3, 100, 'ROULETTE_TICKET', 2, 1 FROM season_pass_config WHERE is_active = 1 AND season_name = '연말 브릿지 시즌 (12/25-1/1)' ORDER BY id DESC LIMIT 1;

INSERT INTO season_pass_level (season_id, level, required_xp, reward_type, reward_amount, auto_claim) 
SELECT id, 4, 200, 'LOTTERY_TICKET', 1, 1 FROM season_pass_config WHERE is_active = 1 AND season_name = '연말 브릿지 시즌 (12/25-1/1)' ORDER BY id DESC LIMIT 1;

INSERT INTO season_pass_level (season_id, level, required_xp, reward_type, reward_amount, auto_claim) 
SELECT id, 5, 300, 'TICKET_BUNDLE', 1, 1 FROM season_pass_config WHERE is_active = 1 AND season_name = '연말 브릿지 시즌 (12/25-1/1)' ORDER BY id DESC LIMIT 1;

INSERT INTO season_pass_level (season_id, level, required_xp, reward_type, reward_amount, auto_claim) 
SELECT id, 6, 450, 'LOTTERY_TICKET', 2, 1 FROM season_pass_config WHERE is_active = 1 AND season_name = '연말 브릿지 시즌 (12/25-1/1)' ORDER BY id DESC LIMIT 1;

INSERT INTO season_pass_level (season_id, level, required_xp, reward_type, reward_amount, auto_claim) 
SELECT id, 7, 600, 'CC_POINT', 10000, 0 FROM season_pass_config WHERE is_active = 1 AND season_name = '연말 브릿지 시즌 (12/25-1/1)' ORDER BY id DESC LIMIT 1;

INSERT INTO season_pass_level (season_id, level, required_xp, reward_type, reward_amount, auto_claim) 
SELECT id, 8, 800, 'CC_POINT', 10000, 0 FROM season_pass_config WHERE is_active = 1 AND season_name = '연말 브릿지 시즌 (12/25-1/1)' ORDER BY id DESC LIMIT 1;

INSERT INTO season_pass_level (season_id, level, required_xp, reward_type, reward_amount, auto_claim) 
SELECT id, 9, 1000, 'CC_POINT', 50000, 0 FROM season_pass_config WHERE is_active = 1 AND season_name = '연말 브릿지 시즌 (12/25-1/1)' ORDER BY id DESC LIMIT 1;

INSERT INTO season_pass_level (season_id, level, required_xp, reward_type, reward_amount, auto_claim) 
SELECT id, 10, 1300, 'CC_POINT', 100000, 0 FROM season_pass_config WHERE is_active = 1 AND season_name = '연말 브릿지 시즌 (12/25-1/1)' ORDER BY id DESC LIMIT 1;
