문서 타입: SoT
버전: v1.0
작성일: 2026-02-06
작성자: GitHub Copilot
대상: BE/FE/OPS/QA
상태: SoT

# V2 Team Battle SoT (통합 최신본)

## 1. 목적 (Purpose)
V2 팀배틀(Team Battle)의 **현행 구현(app/v2)** 및 **DB 마이그레이션(Alembic)**, 그리고 기존 정책 문서(docs/SOT/00_game)를 근거로,
단일 기준(SoT) 문서로 통합한다.

## 2. 범위 (Scope)
- 데이터 모델: 시즌/팀/멤버십/팀 점수/이벤트 로그
- 공개 API: 시즌/팀 목록/가입·탈퇴/내 팀/리더보드 + status/rankings alias
- 어드민 API: 시즌/팀/멤버 관리 및 기여도(점수) 조정
- 운영/검증 체크리스트

## 3. SoT 우선순위 및 충돌 처리
### 3.1 우선순위
1) **DB 스키마(최신 마이그레이션 상태)**
2) **V2 구현 코드(app/v2)**
3) docs/SOT/00_game의 패치 노트 및 보조 문서(learned 성격)
4) 과거 아카이브 SoT(레거시 경로 기반 문서)

### 3.2 충돌 표기 규칙
- 🔴 정책/구현 충돌: 즉시 문서에 명시하고, 우선 기준(보통 DB→코드)을 적는다.
- 🟡 정합성 검토 필요: 불명확/미완성/운영상 임시 허용 등

## 4. 데이터 모델 (DB)
### 4.1 테이블 요약
- `team_season`
  - 핵심 필드: `id`, `name`, `starts_at`, `ends_at`, `is_active`, `rewards_schema`
- `team`
  - 핵심 필드: `id`, `name`, `icon`, `is_active`
- `team_member`
  - 핵심 필드: `user_id`, `team_id`, `role`, `joined_at`
- `team_score`
  - 핵심 필드: `team_id`, `season_id`, `points`, `updated_at`
- `team_event_log`
  - 핵심 필드: `id`, `team_id`, `user_id`, `season_id`, `action`, `delta`, `meta`, `created_at`

### 4.2 유저 FK 기준(중요)
- **DB SoT(최신)**: `team_member.user_id`, `team_event_log.user_id`는 `v2_user.id`를 참조하도록 마이그레이션에서 전환됨.
  - 근거: `alembic/versions/20260131_0400_fix_remaining_fk_to_v2_user.py`

- 🔴 정책/구현 충돌: `app/v2/models/core/team_battle.py`는 여전히 `ForeignKey("user.id")`로 정의되어 있음.
  - 문서 기준: DB 스키마가 우선이므로, 코드 모델의 FK 정의는 **추후 정비 대상**이다.

## 5. 공개 API (Public)
근거:
- 라우트: `app/v2/api/routes.py`
- 계약(보조): `docs/SOT/00_game/v2_team_battle_api_contract_ko.md`

### 5.1 시즌
- `GET /api/v2/team-battle/seasons/active`
  - 활성 시즌이 존재하면 시즌 정보를 반환

### 5.2 팀 목록
- `GET /api/v2/team-battle/teams`
  - 가입 가능한(정원 미달) 팀 목록을 반환하는 view 기반 응답

### 5.3 팀 가입/탈퇴
- `POST /api/v2/team-battle/teams/join`
  - Request: `{ "team_id": number }`
  - 제약: 선택 윈도우(시즌 시작 후 48h) 내에서만 허용
  - 에러(대표): `TEAM_NOT_FOUND`, `ALREADY_IN_TEAM`, `TEAM_FULL`, `TEAM_SELECTION_CLOSED`

- `POST /api/v2/team-battle/teams/leave`
  - 제약: 선택 윈도우 종료 후에는 `TEAM_LOCKED`

### 5.4 내 팀
- `GET /api/v2/team-battle/teams/me`
  - 멤버십 + 팀 요약(멤버 수/점수 등) 반환

### 5.5 자동 팀 배정
- `POST /api/v2/team-battle/teams/auto-assign`
  - 정원 여유가 있는 팀 중 **현재 멤버 수가 가장 적은 팀** 우선 배정
  - 제약: 선택 윈도우 내

### 5.6 리더보드(정식 Canonical)
- `GET /api/v2/team-battle/teams/leaderboard`
  - Query: `season_id?`, `limit`(최대 100), `offset`(0 이상)

### 5.7 status/rankings (호환 alias)
- `GET /api/v2/team-battle/status`
  - 활성 시즌 + 내 팀 요약 + 상위 팀 요약(limit=5)

- `GET /api/v2/team-battle/rankings`
  - `teams/leaderboard`의 alias(view)로 동작

## 6. 어드민 API (Admin)
근거:
- 라우트: `app/v2/api/admin/team_battle_routes.py`
- 서비스: `app/v2/services/team_battle_admin_service.py`

### 6.1 멤버/기여도 관리
- `GET /api/v2/admin/team-battle/teams/{team_id}/members`
  - 팀 멤버 목록(가입일 포함)

- `GET /api/v2/admin/team-battle/teams/{team_id}/members/{user_id}/contributions`
  - 기여도 내역(`team_event_log`) 조회

- `PATCH /api/v2/admin/team-battle/members/{user_id}/joined-at`
  - 가입일(`team_member.joined_at`) 수정 허용

- `POST /api/v2/admin/team-battle/members/contributions/adjust`
  - **기여도 조정은 새 로그 추가만 허용**(기존 로그 수정/삭제 금지)

### 6.2 시즌/팀 관리(요약)
- 시즌 생성/수정/종료 및 활성화는 어드민 서비스(`TeamBattleAdminService`)를 기준으로 한다.

## 7. 핵심 정책(현행 구현 기준)
근거: `app/v2/services/team_battle_service.py`

- 팀 선택 가능 시간(Selection Window): `TEAM_SELECTION_WINDOW_HOURS = 48`
- 팀 최대 인원: `TEAM_MAX_MEMBERS = 7`
- 팀 가입 가능 조건(요약):
  - 활성 시즌 존재
  - 선택 윈도우 내
  - 팀 존재 및 활성
  - 기존 팀 소속이 아니어야 함
  - 팀 정원 미달

## 8. 점수/기여도(TeamScore/TeamEventLog)
### 8.1 기본 원칙
- `team_score.points`는 음수가 되지 않아야 한다.
- 기여도 변경 이력은 `team_event_log`에 **append-only**로 남긴다.

### 8.2 관리자 조정(현행 확정)
근거: `TeamBattleAdminService.adjust_member_contribution`
- `delta != 0` 필수
- 적용 후 팀 점수는 `max(0, points + delta)`
- 실제 적용된 delta(`applied_delta`)를 로그(`team_event_log.delta`)에 기록
- 감사 로그(`V2AdminAuditService`)를 남긴다.

### 8.3 🔴 정책/구현 충돌: 게임 플레이 포인트 적립 경로
- `app/v2/services/game_common.py`에서 팀배틀 포인트 적립을 위해 `ensure_current_season`, `add_points`, `POINTS_PER_PLAY`를 호출하는데,
  현행 `V2TeamBattleService`에는 해당 멤버/상수가 존재하지 않는다.
- 따라서 **자동 포인트 적립의 정식 경로는 아직 SoT로 확정할 수 없으며**, 운영상 점수 변경은 8.2의 어드민 조정 경로가 가장 안전한 기준이다.

## 9. 시즌 운영
### 9.1 활성 시즌 판정
근거: `V2TeamBattleService.get_active_season`
- `team_season.is_active = true`인 시즌 중 최신(id desc)을 선택
- 선택한 시즌이 현재 시각(now) 기준으로 `starts_at <= now <= ends_at`를 만족하면 활성로 간주

### 9.2 시즌 생성/종료
근거: `TeamBattleAdminService`
- 시즌 생성/수정/종료는 어드민 기능으로 제공된다.

### 9.3 🔴 정책/구현 충돌: 자동 롤링 시즌 생성
- 아카이브 SoT에는 “활성 시즌이 없으면 롤링 시즌(2일)을 자동 생성” 규칙이 존재하나,
  현행 V2 서비스(`V2TeamBattleService`)에는 자동 생성 로직이 확인되지 않는다.

## 10. 타임존/시간(운영 원칙 및 현행 구현)
- 시스템 운영 원칙: `Asia/Seoul`(KST) 및 오전 9시 리셋 정책(다른 도메인 공통 원칙)
- 🟡 정합성 검토 필요:
  - 현행 팀배틀 서비스는 `datetime.utcnow()` 기반의 naive datetime을 사용하고,
    시즌의 `starts_at/ends_at`이 naive일 때는 별도 변환 없이 UTC-naive로 취급될 수 있다.
  - 시즌 시간이 KST 기준으로 입력되는 운영 절차가 있다면, 저장/비교 기준을 명확히 해야 한다.

## 11. 운영/검증 (QA)
- [ ] 선택 윈도우(48h) 외 가입 차단 확인
- [ ] 선택 윈도우 종료 후 탈퇴 차단(TEAM_LOCKED) 확인
- [ ] 팀 정원(7명) 초과 가입 차단 확인
- [ ] `teams/leaderboard`의 limit/offset 제약(limit<=100, offset>=0) 확인
- [ ] `status`, `rankings`가 canonical view와 일치하는지 smoke 확인
- [ ] 어드민 기여도 조정이 로그 append-only로 남는지 확인

## 12. 근거 문서/파일 (Source)
- 구현(서비스/라우트)
  - `app/v2/services/team_battle_service.py`
  - `app/v2/api/routes.py`
  - `app/v2/services/team_battle_admin_service.py`
  - `app/v2/api/admin/team_battle_routes.py`
- DB 마이그레이션
  - `alembic/versions/20260131_0400_fix_remaining_fk_to_v2_user.py`
- 기존 문서(통합 대상)
  - `docs/SOT/00_game/v2_team_battle_api_contract_ko.md`
  - `docs/SOT/00_game/20260127_team_battle_status_endpoint_update.md`
  - `docs/SOT/00_game/20260127_team_battle_rankings_endpoint_update.md`
  - `docs/SOT/00_game/20260126_team_battle_nickname_lookup_update.md`
  - `docs/SOT/00_game/04.team_battle.md`
  - `docs/SOT/00_game/learned_context_summary_team_battle.md`
  - `docs/SOT/00_game/아카이브/v2_team_battle_sot_ko.md`

## 13. 변경 이력
- v1.0 (2026-02-06, GitHub Copilot): 분산 문서/패치 노트/현행 V2 코드/DB 마이그레이션을 근거로 통합 최신본 작성
