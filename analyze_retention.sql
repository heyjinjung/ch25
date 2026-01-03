-- User Stats
SELECT 'Total Users' as metric, count(*) as value FROM user;
SELECT 'Users with Locked Balance > 0' as metric, count(*) as value FROM user WHERE vault_locked_balance > 0;

-- Game Participation
SELECT 'Total Roulette Spins' as metric, count(*) as value FROM roulette_log;
SELECT 'Total Dice Rolls' as metric, count(*) as value FROM dice_log;

-- Mission Stats (Top 5 completed missions)
SELECT m.title, count(*) as completions 
FROM user_mission_progress ump
JOIN mission m ON ump.mission_id = m.id
WHERE ump.is_completed = 1
GROUP BY m.title
ORDER BY completions DESC
LIMIT 5;

-- Vault Stats
SELECT sum(vault_locked_balance) as total_locked_balance, avg(vault_locked_balance) as avg_locked_balance FROM user;

-- Season Pass Levels
SELECT current_level, count(*) as user_count 
FROM season_pass_progress 
GROUP BY current_level 
ORDER BY current_level DESC;
