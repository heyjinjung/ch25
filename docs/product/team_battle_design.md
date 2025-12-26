# 팀 대항전(게이미피케이션) 설계 초안

## 개요
- 목표: 팀 단위 포인트 누적으로 시즌 랭킹 경쟁, 팀/개인 기여도 보상
- 범위: 시즌 운영, 포인트 소스 연계(게임 결과, 미션), 리더보드 노출, 보상 정산

## 데이터 모델 (DDL 초안)
```sql
-- 시즌
CREATE TABLE season (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 0,
  rewards_schema JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_season_active (is_active),
  INDEX idx_season_time (starts_at, ends_at)
);

-- 팀
CREATE TABLE team (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_team_name (name)
);

-- 팀 멤버십
CREATE TABLE team_member (
  user_id INT NOT NULL,
  team_id INT NOT NULL,
  role ENUM('member','leader') NOT NULL DEFAULT 'member',
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id),
  INDEX idx_team_member_team (team_id),
  CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
  CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE
);

-- 팀 시즌 점수(집계 테이블)
CREATE TABLE team_score (
  team_id INT NOT NULL,
  season_id INT NOT NULL,
  points BIGINT NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY(team_id, season_id),
  INDEX idx_team_score_points (season_id, points DESC),
  CONSTRAINT fk_ts_team FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
  CONSTRAINT fk_ts_season FOREIGN KEY (season_id) REFERENCES season(id) ON DELETE CASCADE
);

-- 포인트 변동 로그(정산/리더보드 재계산용 근거)
CREATE TABLE team_event_log (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  team_id INT NOT NULL,
  user_id INT NULL,
  season_id INT NOT NULL,
  action VARCHAR(50) NOT NULL, -- e.g., GAME_ROULETTE, GAME_DICE, MISSION_DAILY
  delta INT NOT NULL,
  meta JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tel_season_team (season_id, team_id, created_at),
  INDEX idx_tel_user (user_id),
  CONSTRAINT fk_tel_team FOREIGN KEY (team_id) REFERENCES team(id) ON DELETE CASCADE,
  CONSTRAINT fk_tel_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL,
  CONSTRAINT fk_tel_season FOREIGN KEY (season_id) REFERENCES season(id) ON DELETE CASCADE
);
```

## 포인트 소스 예시
- 게임 결과: 룰렛/주사위/복권/랭킹 등에서 승리/참여 시 팀 포인트 적립
- 미션: 일일 출석, 특정 게임 n회 플레이 (보상 구조는 별도 문서에서 관리)
- 운영자 보상: 공지성 포인트 지급(이벤트)

## 레벨/XP 보상 설계 (초안)
※ 팀 대항전 포인트와 분리되는 기본(핵심) 레벨/XP 보상안. 미션 보상 체계는 별도 문서로 분리 관리.

- XP 획득: 게임 플레이, 미션 완료, 팀 기여 보상 등을 XP로 환산
- 자동 레벨업: 필요 XP 달성 시 자동 지급, 중복 지급 방지(idempotent) 로직 필요

| 레벨 | 필요 XP | 보상 | 비고 |
|------|--------:|------|------|
| 🎅 1 | 40  | 룰렛티켓 1장 | 자동 지급 |
| 🎁 2 | 100 | 주사위티켓 2장 | 자동 지급 |
| 🧊 3 | 180 | 복권티켓 2장 |  |
| 🧣 4 | 300 | 편의점 기프티콘 1만 |  |
| 🔔 5 | 450 | 룰렛티켓 3장 |  |
| ❄️ 6 | 600 | 복권티켓 3장 |  |
| ⛄ 7 | 1,000 | 배민 2만 |  |

### 구현 메모
- 테이블: `user_level_progress(user_id PK, level INT, xp INT, updated_at)`
- 보상 지급 로그: `user_level_reward_log(id, user_id, level, reward_type, reward_payload JSON, created_at)`
- 레벨업 처리: XP 업데이트 → 필요 XP 달성 시 트랜잭션으로 레벨 상승 및 보상 지급 기록
- 보상 타입 예시: ticket_roulette, ticket_dice, ticket_lottery, coupon(convenience, 배민 등)
- 방어 로직: 한 레벨당 한 번만 지급(idempotent), 동시성 잠금(행 잠금 or unique key)

## 비즈니스 룰
- 시즌 범위 내 발생한 이벤트만 `season_id`에 집계
- 팀 변경 정책: 시즌 중 팀 변경 제한(예: 하루 1회, 혹은 시즌 중 이동 불가) 권장
- 포인트 상한: 소스별/일별 cap (예: 일일 최대 5,000점)으로 과도한 적립 방지
- 보상: 시즌 종료 시 랭킹 확정 → 보상 테이블/큐에 기록 후 지급(쿠폰/포인트/뱃지)

## API 스펙 (초안)
- 팀 관리
  - `POST /api/teams` (admin) 팀 생성
  - `GET /api/teams` 팀 목록
  - `POST /api/teams/{team_id}/join` 팀 가입 (정책에 따라 승인/자동)
  - `POST /api/teams/{team_id}/leave` 팀 탈퇴
- 리더보드/기여도
  - `GET /api/teams/leaderboard?season_id&limit&offset` 팀 랭킹
  - `GET /api/teams/{team_id}/contributors?season_id&limit&offset` 팀 내 개인 기여도
- 시즌
  - `GET /api/seasons/active` 현재 시즌 정보
  - `POST /api/seasons` (admin) 시즌 생성/시작/종료 플래그 관리
- 포인트 적립 (내부/백오피스용)
  - `POST /api/teams/{team_id}/points` {action, delta, user_id?, meta, season_id}
    - 트랜잭션으로 `team_event_log` 기록 후 `team_score.points` 가산

## 운영/정합성
- 레이트리밋/안티부정: 포인트 소스별 상한, 동일 이벤트 중복 차단 키(meta의 unique hash) 적용 가능
- 리더보드 최신화: 실시간 반영 또는 배치/캐시(예: 1분 캐시) 선택
- 재계산: `team_score`는 `team_event_log`에서 재집계 가능하도록 근거 로그 보존

## 단계적 도입
1) 스키마/테이블 추가 + 포인트 로그/집계 API + 리더보드 조회
2) 시즌 운영/보상 스키마 적용, 보상 확정/지급 플로우 추가
3) 미션·이벤트 연계, 실시간 알림(WebSocket) 필요 시 확장

## 보안/권한
- 관리자 전용: 팀 생성/삭제, 시즌 생성/종료, 보상 확정 API
- 사용자: 팀 가입/탈퇴, 본인 기여도 조회

## 프론트 UX 아이디어
- 팀 선택/가입 화면 + 시즌 배너
- 팀 대시보드: 팀 점수, 시즌 남은 시간, 팀 내 기여도 상위 목록
- 리더보드: 전체 팀 순위, 개인 기여도(팀 내)
- 진행도 게이지/마일스톤: 누적 포인트에 따른 보상 단계 시각화

## 추가 개발 아이디어 / 우선순위 후보
- 실시간/준실시간 알림: 팀 포인트 적립, 레벨업, 미션 완료 시 Toast/Inbox(알림 센터) 노출. 이벤트 소스는 `team_event_log`/`user_level_reward_log`를 기반으로 WebSocket 또는 폴링.
- 팀 미션 확장: 일일/주간 미션 외에 팀 합산 미션(예: 팀 전체 1,000회 플레이, 총 500만 포인트 적립) 달성 시 보상 지급. 미션 정의/상태 테이블 분리 권장.
- 팀 버프/부스트: 특정 기간 팀 전체 XP/포인트 1.1~1.3배 버프. `team_score` 업데이트 시 버프 배수 적용, 로그에 버프 ID 기록.
- PvP 이벤트 매치업: 기간 한정으로 두 팀 매칭 후 포인트/승률 경쟁. 매칭 테이블과 결과 테이블 추가, 시즌과 분리 가능.
- 출석/연속 접속 보상 팀화: 개인 출석이 팀 포인트로 전환되도록 `team_event_log`에 일일 출석 소스 추가.
- 리플레이/하이라이트: 팀 내 상위 기여도 유저 액션(예: 대규모 포인트 적립)을 로그로 노출해 동기부여.

## 로깅/문서화 규칙 반영
- 핵심 로그 테이블: `team_event_log`(소스/델타/season_id/user_id/team_id), `team_score`(집계), `user_level_reward_log`(레벨 보상), `user_xp_event_log`(XP 근거), `team_member`(역할/시간). 추가 미션/버프는 별도 테이블이 아닌 경우에도 `meta`에 식별자 남길 것.
- 중복 방지: 이벤트 키(`meta`의 unique hash 또는 period_key)를 만들어 동일 이벤트 재처리를 차단.
- 재현 가능성: 집계 테이블(`team_score`)은 언제든 `team_event_log`에서 리빌드 가능하도록 로그를 손실 없이 유지.
- 변경 시 문서 트리: 설계/스키마 변경은 `docs/05_modules` 하위에 기능별 md 추가 또는 본 문서에 섹션 추가, API 스펙 변경은 `docs/03_api` 갱신.
