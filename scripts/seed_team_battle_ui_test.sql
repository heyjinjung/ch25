-- Team Battle UI test seed (idempotent)
-- Target DB: xmas_event_dev (MySQL)

-- 1) Active season (join window open: starts_at ~ 1h ago)
SET @season_name = CONCAT('TeamBattle UI Seed ', DATE_FORMAT(UTC_DATE(), '%Y-%m-%d'));

INSERT INTO team_season (name, starts_at, ends_at, is_active, rewards_schema, created_at, updated_at)
VALUES (
  @season_name,
  UTC_TIMESTAMP() - INTERVAL 1 HOUR,
  UTC_TIMESTAMP() + INTERVAL 48 HOUR,
  1,
  JSON_OBJECT('rank1_coupon', 300000, 'rank2_coupon', 200000, 'rank3_coupon', 50000),
  UTC_TIMESTAMP(),
  UTC_TIMESTAMP()
)
ON DUPLICATE KEY UPDATE
  starts_at = VALUES(starts_at),
  ends_at = VALUES(ends_at),
  is_active = 1,
  rewards_schema = VALUES(rewards_schema),
  updated_at = UTC_TIMESTAMP();

SET @season_id = (SELECT id FROM team_season WHERE name = @season_name LIMIT 1);
UPDATE team_season SET is_active = 0 WHERE id <> @season_id;

-- 2) Two active teams (keep other teams as-is)
INSERT INTO team (name, icon, is_active, created_at, updated_at)
VALUES
  ('산타팀', NULL, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP()),
  ('루돌프팀', NULL, 1, UTC_TIMESTAMP(), UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE
  is_active = 1,
  updated_at = UTC_TIMESTAMP();

SET @team_a = (SELECT id FROM team WHERE name = '산타팀' LIMIT 1);
SET @team_b = (SELECT id FROM team WHERE name = '루돌프팀' LIMIT 1);

-- 3) Users (for contributors list)
INSERT INTO user (external_id, nickname, status, created_at, updated_at)
VALUES
  ('tb_seed_u1', 'TB 유저1', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP()),
  ('tb_seed_u2', 'TB 유저2', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP()),
  ('tb_seed_u3', 'TB 유저3', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP()),
  ('tb_seed_u4', 'TB 유저4', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP()),
  ('tb_seed_u5', 'TB 유저5', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP()),
  ('tb_seed_u6', 'TB 유저6', 'ACTIVE', UTC_TIMESTAMP(), UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE
  nickname = VALUES(nickname),
  status = 'ACTIVE',
  updated_at = UTC_TIMESTAMP();

SET @u1 = (SELECT id FROM user WHERE external_id = 'tb_seed_u1' LIMIT 1);
SET @u2 = (SELECT id FROM user WHERE external_id = 'tb_seed_u2' LIMIT 1);
SET @u3 = (SELECT id FROM user WHERE external_id = 'tb_seed_u3' LIMIT 1);
SET @u4 = (SELECT id FROM user WHERE external_id = 'tb_seed_u4' LIMIT 1);
SET @u5 = (SELECT id FROM user WHERE external_id = 'tb_seed_u5' LIMIT 1);
SET @u6 = (SELECT id FROM user WHERE external_id = 'tb_seed_u6' LIMIT 1);

-- 4) Memberships (one team per user; idempotent update)
INSERT INTO team_member (user_id, team_id, role, joined_at)
VALUES
  (@u1, @team_a, 'leader', UTC_TIMESTAMP() - INTERVAL 55 MINUTE),
  (@u2, @team_a, 'member', UTC_TIMESTAMP() - INTERVAL 54 MINUTE),
  (@u3, @team_a, 'member', UTC_TIMESTAMP() - INTERVAL 53 MINUTE),
  (@u4, @team_b, 'leader', UTC_TIMESTAMP() - INTERVAL 52 MINUTE),
  (@u5, @team_b, 'member', UTC_TIMESTAMP() - INTERVAL 51 MINUTE),
  (@u6, @team_b, 'member', UTC_TIMESTAMP() - INTERVAL 50 MINUTE)
ON DUPLICATE KEY UPDATE
  team_id = VALUES(team_id),
  role = VALUES(role),
  joined_at = VALUES(joined_at);

-- 5) Reset seed logs/scores for a clean rerun
DELETE FROM team_event_log WHERE season_id = @season_id AND user_id IN (@u1, @u2, @u3, @u4, @u5, @u6);
DELETE FROM team_score WHERE season_id = @season_id AND team_id IN (@team_a, @team_b);

-- 6) Event logs (contributors + latest_event_at)
-- 산타팀 총점: 200
INSERT INTO team_event_log (team_id, user_id, season_id, action, delta, meta, created_at)
VALUES
  (@team_a, @u1, @season_id, 'GAME_PLAY', 40, NULL, UTC_TIMESTAMP() - INTERVAL 40 MINUTE),
  (@team_a, @u1, @season_id, 'GAME_PLAY', 30, NULL, UTC_TIMESTAMP() - INTERVAL 30 MINUTE),
  (@team_a, @u1, @season_id, 'GAME_PLAY', 30, NULL, UTC_TIMESTAMP() - INTERVAL 20 MINUTE),

  (@team_a, @u2, @season_id, 'GAME_PLAY', 30, NULL, UTC_TIMESTAMP() - INTERVAL 35 MINUTE),
  (@team_a, @u2, @season_id, 'GAME_PLAY', 20, NULL, UTC_TIMESTAMP() - INTERVAL 25 MINUTE),
  (@team_a, @u2, @season_id, 'GAME_PLAY', 20, NULL, UTC_TIMESTAMP() - INTERVAL 15 MINUTE),

  (@team_a, @u3, @season_id, 'GAME_PLAY', 10, NULL, UTC_TIMESTAMP() - INTERVAL 33 MINUTE),
  (@team_a, @u3, @season_id, 'GAME_PLAY', 10, NULL, UTC_TIMESTAMP() - INTERVAL 23 MINUTE),
  (@team_a, @u3, @season_id, 'GAME_PLAY', 10, NULL, UTC_TIMESTAMP() - INTERVAL 13 MINUTE);

-- 루돌프팀 총점: 170
INSERT INTO team_event_log (team_id, user_id, season_id, action, delta, meta, created_at)
VALUES
  (@team_b, @u4, @season_id, 'GAME_PLAY', 50, NULL, UTC_TIMESTAMP() - INTERVAL 39 MINUTE),
  (@team_b, @u4, @season_id, 'GAME_PLAY', 40, NULL, UTC_TIMESTAMP() - INTERVAL 29 MINUTE),
  (@team_b, @u4, @season_id, 'GAME_PLAY', 30, NULL, UTC_TIMESTAMP() - INTERVAL 19 MINUTE),

  (@team_b, @u5, @season_id, 'GAME_PLAY', 20, NULL, UTC_TIMESTAMP() - INTERVAL 34 MINUTE),
  (@team_b, @u5, @season_id, 'GAME_PLAY', 10, NULL, UTC_TIMESTAMP() - INTERVAL 24 MINUTE),

  (@team_b, @u6, @season_id, 'GAME_PLAY', 10, NULL, UTC_TIMESTAMP() - INTERVAL 18 MINUTE);

-- 7) Team scores = sum(logs)
INSERT INTO team_score (team_id, season_id, points, updated_at)
VALUES
  (
    @team_a,
    @season_id,
    (SELECT COALESCE(SUM(delta), 0) FROM team_event_log WHERE team_id = @team_a AND season_id = @season_id),
    UTC_TIMESTAMP()
  ),
  (
    @team_b,
    @season_id,
    (SELECT COALESCE(SUM(delta), 0) FROM team_event_log WHERE team_id = @team_b AND season_id = @season_id),
    UTC_TIMESTAMP()
  )
ON DUPLICATE KEY UPDATE
  points = VALUES(points),
  updated_at = VALUES(updated_at);

-- Done
SELECT @season_id AS season_id, @team_a AS team_a_id, @team_b AS team_b_id;
