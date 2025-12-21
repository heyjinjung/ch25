-- Optional helper: make only the UI seed teams active (so auto-assign lands on them)
-- Target DB: xmas_event_dev (MySQL)

SET @team_a = (SELECT id FROM team WHERE name = '산타팀' LIMIT 1);
SET @team_b = (SELECT id FROM team WHERE name = '루돌프팀' LIMIT 1);

-- Safety check
SELECT @team_a AS team_a_id, @team_b AS team_b_id;

UPDATE team
SET is_active = CASE WHEN id IN (@team_a, @team_b) THEN 1 ELSE 0 END,
    updated_at = UTC_TIMESTAMP();

SELECT id, name, is_active FROM team ORDER BY id;
