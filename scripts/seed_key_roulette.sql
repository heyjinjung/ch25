-- Seed Gold Key Roulette
INSERT INTO roulette_config (name, ticket_type, is_active, max_daily_spins, created_at, updated_at)
SELECT 'Gold Key Roulette', 'GOLD_KEY', 1, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roulette_config WHERE ticket_type = 'GOLD_KEY');

SET @gold_config_id = (SELECT id FROM roulette_config WHERE ticket_type = 'GOLD_KEY' LIMIT 1);

-- Clear existing segments if re-running
DELETE FROM roulette_segment WHERE config_id = @gold_config_id;

-- Gold Segments (Base 1000)
-- 1. 5000 (60%) -> 600
-- 2. 5000 (15%) -> 150
-- 3. 10000 (15%) -> 150
-- 4. 10000 (8%) -> 80
-- 5. 30000 (1.5%) -> 15
-- 6. 100000 (0.5%) -> 5
INSERT INTO roulette_segment (config_id, slot_index, label, reward_type, reward_amount, weight, is_jackpot, created_at, updated_at)
VALUES
(@gold_config_id, 0, '5,000 P', 'POINT', 5000, 600, 0, NOW(), NOW()),
(@gold_config_id, 1, '5,000 P', 'POINT', 5000, 150, 0, NOW(), NOW()),
(@gold_config_id, 2, '10,000 P', 'POINT', 10000, 150, 0, NOW(), NOW()),
(@gold_config_id, 3, '10,000 P', 'POINT', 10000, 80, 0, NOW(), NOW()),
(@gold_config_id, 4, '30,000 P', 'POINT', 30000, 15, 0, NOW(), NOW()),
(@gold_config_id, 5, '100,000 P', 'POINT', 100000, 5, 1, NOW(), NOW());


-- Seed Diamond Key Roulette
INSERT INTO roulette_config (name, ticket_type, is_active, max_daily_spins, created_at, updated_at)
SELECT 'Diamond Key Roulette', 'DIAMOND_KEY', 1, 0, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roulette_config WHERE ticket_type = 'DIAMOND_KEY');

SET @diamond_config_id = (SELECT id FROM roulette_config WHERE ticket_type = 'DIAMOND_KEY' LIMIT 1);

-- Clear existing segments
DELETE FROM roulette_segment WHERE config_id = @diamond_config_id;

-- Diamond Segments (Base 1000)
-- 1. 10000 (53%) -> 530
-- 2. 30000 (31.4%) -> 314
-- 3. 50000 (10%) -> 100
-- 4. 70000 (5%) -> 50
-- 5. 100000 (0.5%) -> 5
-- 6. 200000 (0.1%) -> 1
INSERT INTO roulette_segment (config_id, slot_index, label, reward_type, reward_amount, weight, is_jackpot, created_at, updated_at)
VALUES
(@diamond_config_id, 0, '10,000 P', 'POINT', 10000, 530, 0, NOW(), NOW()),
(@diamond_config_id, 1, '30,000 P', 'POINT', 30000, 314, 0, NOW(), NOW()),
(@diamond_config_id, 2, '50,000 P', 'POINT', 50000, 100, 0, NOW(), NOW()),
(@diamond_config_id, 3, '70,000 P', 'POINT', 70000, 50, 0, NOW(), NOW()),
(@diamond_config_id, 4, '100,000 P', 'POINT', 100000, 5, 0, NOW(), NOW()),
(@diamond_config_id, 5, '200,000 P', 'POINT', 200000, 1, 1, NOW(), NOW());
