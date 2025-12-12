# 기본 핵심 레벨/XP 보상안

- 목적: 모든 사용자 공통으로 적용되는 핵심 레벨/XP 보상 정책을 별도 관리
- 원칙: 자동 레벨업, 자동 보상 지급, 중복 지급 방지(idempotent)
- 분리: 팀 대항전 포인트·미션 보상과는 별개로 운영

## 레벨 테이블 (자동 지급)
| 레벨 | 필요 XP | 보상 | 비고 |
|------|--------:|------|------|
| 🎅 1 | 40  | 룰렛티켓 1장 | 자동 지급 |
| 🎁 2 | 100 | 주사위티켓 2장 | 자동 지급 |
| 🧊 3 | 180 | 복권티켓 2장 | 자동 지급 |
| 🧣 4 | 300 | 편의점 기프티콘 1만 | 관리자수동지급 |
| 🔔 5 | 450 | 룰렛티켓 3장 | 자동 지급 |
| ❄️ 6 | 600 | 복권티켓 3장 | 자동 지급 |
| ⛄ 7 | 1,000 | 배민 2만 | 관리자수동지급 |

## 처리 플로우 (개요)
- XP 적립(현행 코드 기준):
	- 게임 플레이 후 시즌 패스 스탬프 적립: [app/services/game_common.py](app/services/game_common.py) `apply_season_pass_stamp()`이 실행되어 `base_xp_per_stamp`(시즌 설정) + `xp_bonus`만큼 `current_xp`를 누적.
	- 스탬프/레벨업 처리: [app/services/season_pass_service.py](app/services/season_pass_service.py) `add_stamp()`가 XP 증가, 레벨업 판정, 보상 로그(`SeasonPassRewardLog`) 기록을 한 트랜잭션으로 처리하고 `SeasonPassStampLog`로 중복 스탬프를 방지.
	- 외부랭킹 연동: [app/services/admin_external_ranking_service.py](app/services/admin_external_ranking_service.py)에서 예치 10만 단위·이용 1회당 20 XP를 `add_bonus_xp()`로 추가, 주간 TOP10은 `maybe_add_stamp()`로 스탬프를 지급.
	- 게임 보상 포인트→XP 옵션: [app/services/reward_service.py](app/services/reward_service.py)에서 환경변수 `XP_FROM_GAME_REWARD`가 켜져 있으면 포인트 보상 수치를 그대로 `add_bonus_xp()`로 전달해 XP를 추가.
	- 관리 콘솔: [app/services/admin_user_service.py](app/services/admin_user_service.py)에서 XP를 수정하면 `SeasonPassProgress`와 게임 레벨을 동기화.
- 시즌 패스 ↔ 코어 레벨 동기화: [app/services/season_pass_service.py](app/services/season_pass_service.py)에서 `add_stamp`/`add_bonus_xp`가 `LevelXPService.add_xp`를 베스트에포트로 호출해 코어 레벨 진행도와 로그를 함께 갱신.
- 외부랭킹 안티어뷰즈: [app/services/admin_external_ranking_service.py](app/services/admin_external_ranking_service.py)에서 `deposit_remainder`로 10만 단위 스텝 계산, 일일 리셋 시 0 초기화, 일일 최대 스텝/쿨다운을 환경변수(`EXTERNAL_RANKING_DEPOSIT_*`)로 제어.
- 레벨업 판정: XP 갱신 시 필요 XP 이상이면 자동 레벨업
- 지급 트랜잭션: 레벨 상승 + 보상 지급 + 지급 로그를 한 트랜잭션으로 처리
- 중복 방지: 레벨별로 한 번만 지급 (unique 제약 또는 보상 로그 검증)

## 데이터 모델 (제안)
- user_level_progress(user_id PK, level INT, xp INT, updated_at)
- user_level_reward_log(id, user_id, level, reward_type, reward_payload JSON, created_at)

## 운영 메모
- 보상 타입 예시: ticket_roulette, ticket_dice, ticket_lottery, coupon(convenience, 배민 등)
- 동시성: XP 업데이트 시 행 잠금으로 레벨업/보상 중복 방지
- 확장: 레벨 7 이후 단계 추가 시 표만 확장하면 됨

## DB/스키마 통합 고려
- 기존 사용자/티켓/쿠폰 테이블 연계: `user_level_progress.user_id` → `user.id` FK, 보상 지급 시 티켓/쿠폰 재고/지급 로그 테이블과 트랜잭션으로 묶기.
- XP 적립 이벤트 로그(선택): `user_xp_event_log(id, user_id, source, delta, meta JSON, created_at)`를 두어 재계산·감사 가능하게 유지.
- 지급 로그: `user_level_reward_log`에 unique(user_id, level) 인덱스로 중복 지급 방지.
- 성능/인덱스: `user_level_progress`는 PK로 커버; 로그 테이블은 `user_id, created_at` 복합 인덱스로 조회 최적화.
- 운영자 수동 지급 단계(예: 레벨 4, 7): `user_level_reward_log`에 `granted_by`(admin_id) 필드 추가하여 감사 가능하게 관리.

## 마이그레이션 초안 (Alembic)
```sql
-- 필수: 진행/지급 로그
CREATE TABLE user_level_progress (
	user_id INT NOT NULL PRIMARY KEY,
	level INT NOT NULL DEFAULT 1,
	xp INT NOT NULL DEFAULT 0,
	updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT fk_ul_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE TABLE user_level_reward_log (
	id BIGINT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NOT NULL,
	level INT NOT NULL,
	reward_type VARCHAR(50) NOT NULL,
	reward_payload JSON NULL,
	auto_granted TINYINT(1) NOT NULL DEFAULT 0,
	granted_by INT NULL, -- admin_id (수동 지급 추적)
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	UNIQUE KEY uq_user_level_reward (user_id, level),
	INDEX idx_ulrl_user_created (user_id, created_at),
	CONSTRAINT fk_ulrl_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

-- 선택: XP 이벤트 근거 로그 (재계산/감사)
CREATE TABLE user_xp_event_log (
	id BIGINT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NOT NULL,
	source VARCHAR(100) NOT NULL, -- GAME_ROULETTE, EXTERNAL_RANKING_DEPOSIT 등
	delta INT NOT NULL,
	meta JSON NULL,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	INDEX idx_uxel_user_created (user_id, created_at),
	CONSTRAINT fk_uxel_user FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);
```

### Alembic 메모
- 새 revision에서 위 2~3개 테이블 생성. 선택 로그는 운영 판단에 따라 생략 가능.
- 기존 `user` 테이블과 FK 연결 확인 후 배포 전 백필(backfill) 로직이 필요하면 같은 migration 안에서 처리.
- 수동 지급 관리자 추적용 `granted_by`는 `admin_user` 테이블 키를 FK로 묶거나, 일단 INT로 두고 나중에 FK 추가 가능.
- 트랜잭션 범위: XP 증가/레벨업/보상 로그/티켓·쿠폰 지급이 한 트랜잭션에 묶이도록 서비스 계층도 함께 점검.
- 자동 지급 여부는 `auto_granted`에 표시되고, 티켓류는 현재 로그만 남기고 실제 발급은 후속 구현(RewardService 연계)에서 처리.
