# V1 Legacy API List & Security Audit (Phase 0-3)

**문서 타입**: Audit Report
**작성일**: 2026-01-19
**대상**: V2 마이그레이션 팀

---

## 1. 개요
현재 운영 중인 V1 시스템의 API 엔드포인트를 전수 조사하고, 보안 취약점 및 V2 이관 시 고려사항을 정리했습니다.
- **추출 방식**: `app.openapi()` (FastAPI) 자동 추출 및 소스 코드(`app/api/routes`) 전수 검사
- **기준**: V1 Backend Source Code

## 2. API 요약 통계
- **Total Endpoints**: 45+
- **Major Domains**: `Game`, `TeamBattle`, `Inventory`, `Retention`, `Mission`

---

## 3. 상세 API 리스트 (By Tag)

### 3.1 Dev / Testing (⚠️ Security Risk)
> **Note**: 프로덕션 환경에서 비활성화 필수.
- `POST /api/dev/create-test-user`: 테스트 유저 생성 (DB Write)
- `POST /api/dev/grant-game-tokens`: 재화 임의 지급 (Admin 권한 없이 가능?)
- `GET /api/dev/test-auth`: 인증 테스트
- `POST /api/dev/ch25-events/publish`: 이벤트 강제 발행

### 3.2 Auth & User
- `POST /api/auth/token`: JWT 토큰 발급
- `POST /api/activity/record`: 유저 활동 기록
- `POST /api/telegram/link-token`: 텔레그램 링크용 단축 코드 발급
- `POST /api/telegram/auth`: 텔레그램 initData 인증/유저 생성
- `POST /api/telegram/unlink-request`: 텔레그램 연결 해제 요청
- `GET /api/new-user/status`: 신규 유저 상태/미션 요약
- `POST /api/new-user/claim-welcome`: 웰컴 보상 수령

**근거 코드**:
- [app/api/routes/auth.py](../../../app/api/routes/auth.py#L19-L170)
- [app/api/routes/activity.py](../../../app/api/routes/activity.py#L15-L86)
- [app/api/routes/telegram.py](../../../app/api/routes/telegram.py#L16-L110)
- [app/api/routes/telegram_unlink.py](../../../app/api/routes/telegram_unlink.py#L14-L86)
- [app/api/routes/new_user_onboarding.py](../../../app/api/routes/new_user_onboarding.py#L24-L204)

### 3.3 Game Logic (Legacy)
#### Roulette
- `GET /api/roulette/status`: 룰렛 상태 조회 (티켓 타입별)
- `POST /api/roulette/play`: 룰렛 플레이 (Ticket/Coin 소모)

**누락/이슈**:
- `payload` 스키마가 느슨함 (Optional Pydantic). V2에서 엄격한 검증 필요.
- 골든아워 배수 로직이 Service 레벨에 숨겨져 있어 API 명세만으로 확인 불가.

**어드민**:
- `GET /admin/api/roulette-config/`: 설정 목록
- `GET /admin/api/roulette-config/{config_id}`: 설정 단건 조회
- `POST /admin/api/roulette-config/`: 설정 생성
- `PUT /admin/api/roulette-config/{config_id}`: 설정 수정
- `POST /admin/api/roulette-config/{config_id}/activate`: 설정 활성화
- `POST /admin/api/roulette-config/{config_id}/deactivate`: 설정 비활성화
- `DELETE /admin/api/roulette-config/{config_id}`: 설정 삭제

**근거 코드**:
- [app/api/routes/roulette.py](../../../app/api/routes/roulette.py#L12-L36)
- [app/api/admin/routes/admin_roulette.py](../../../app/api/admin/routes/admin_roulette.py#L9-L50)


#### Dice
- `GET /api/dice/status`: 주사위 상태 (일일 사용량 등)
- `POST /api/dice/play`: 주사위 플레이

**누락/이슈**:
- 음수 차감(패배 페널티) API 문서화 누락
- 골든아워 배수 관련 API 부재

**어드민**:
- `GET /admin/api/dice-config/event-params`: 이벤트 파라미터 조회
- `PUT /admin/api/dice-config/event-params`: 이벤트 파라미터 업데이트
- `GET /admin/api/dice-config/`: 설정 목록
- `GET /admin/api/dice-config/{config_id}`: 설정 단건 조회
- `POST /admin/api/dice-config/`: 설정 생성
- `PUT /admin/api/dice-config/{config_id}`: 설정 수정
- `POST /admin/api/dice-config/{config_id}/activate`: 설정 활성화
- `POST /admin/api/dice-config/{config_id}/deactivate`: 설정 비활성화

**근거 코드**:
- [app/api/routes/dice.py](../../../app/api/routes/dice.py#L12-L25)
- [app/api/admin/routes/admin_dice.py](../../../app/api/admin/routes/admin_dice.py#L11-L60)

#### Lottery
- `GET /api/lottery/status`: 복권 상태
- `POST /api/lottery/play`: 복권 플레이

**누락/이슈**:
- 신규 조각 모음(컬렉션 퍼즐) 관련 API 부재

**어드민**:
- `GET /admin/api/lottery-config/`: 설정 목록
- `GET /admin/api/lottery-config/{config_id}`: 설정 단건 조회
- `POST /admin/api/lottery-config/`: 설정 생성
- `PUT /admin/api/lottery-config/{config_id}`: 설정 수정
- `POST /admin/api/lottery-config/{config_id}/activate`: 설정 활성화
- `POST /admin/api/lottery-config/{config_id}/deactivate`: 설정 비활성화

**근거 코드**:
- [app/api/routes/lottery.py](../../../app/api/routes/lottery.py#L12-L25)
- [app/api/admin/routes/admin_lottery.py](../../../app/api/admin/routes/admin_lottery.py#L9-L44)

#### Team Battle (New Logic)
- `GET /api/team-battle/seasons/active`: 현재 시즌 정보
- `GET /api/team-battle/teams`: 가입 가능 팀 목록
- `POST /api/team-battle/teams/join`: 팀 가입
- `POST /api/team-battle/teams/leave`: 팀 탈퇴
- `GET /api/team-battle/teams/me`: 내 팀 정보
- `GET /api/team-battle/teams/leaderboard`: 팀 랭킹

**근거 코드**:
- [app/api/routes/roulette.py](../../../app/api/routes/roulette.py)
- [app/api/routes/dice.py](../../../app/api/routes/dice.py)
- [app/api/routes/lottery.py](../../../app/api/routes/lottery.py)
- [app/api/routes/team_battle.py](../../../app/api/routes/team_battle.py)

### 3.4 Inventory & Shop
- `GET /api/inventory`: 내 인벤토리 및 지갑 조회 (Diamond 포함)
- `POST /api/inventory/use`: 아이템(Voucher) 사용
- `GET /api/shop/products`: 상점 상품 목록
- `POST /api/shop/purchase`: 상품 구매 (SKU)

**어드민**:
- `GET /admin/api/shop/products`: 어드민 상점 상품 목록
- `GET /admin/api/shop/products/overrides`: SKU 오버라이드 조회
- `PUT /admin/api/shop/products/overrides`: SKU 오버라이드 갱신
- `POST /admin/api/game-tokens/grant`: 게임 토큰/인벤토리 지급
- `POST /admin/api/game-tokens/revoke`: 게임 토큰/인벤토리 회수
- `GET /admin/api/game-tokens/wallets`: 유저 지갑/토큰 조회
- `GET /admin/api/game-tokens/play-logs`: 룰렛/주사위/복권 플레이 로그 통합 조회
- `GET /admin/api/reward-types`: 보상 타입 정의/메타데이터 조회

**근거 코드**:
- [app/api/routes/inventory_shop.py](../../../app/api/routes/inventory_shop.py#L14-L113)
- [app/api/admin/routes/admin_shop.py](../../../app/api/admin/routes/admin_shop.py#L16-L123)
- [app/api/admin/routes/admin_game_tokens.py](../../../app/api/admin/routes/admin_game_tokens.py#L29-L220)
- [app/api/admin/routes/admin_reward_types.py](../../../app/api/admin/routes/admin_reward_types.py#L7-L158)

### 3.5 Mission & Retention
- `GET /api/mission/`: 미션 목록 및 진행도
- `POST /api/mission/{mission_id}/claim`: 미션 보상 수령
- `POST /api/mission/daily-gift`: 데일리 선물 수령
- `GET /api/mission/streak/rules`: 스트릭 규칙 조회
- `POST /api/mission/streak/claim`: 스트릭 보상 수령
- `POST /api/retention/intervention/resolve`: 이탈 방지 개입 처리
- `POST /api/retention/reengagement/queue`: 재계약 큐 등록

**어드민**:
- `GET /api/admin-mission/`: 미션 목록(비활성 포함)
- `POST /api/admin-mission/`: 미션 생성
- `PUT /api/admin-mission/{mission_id}`: 미션 수정
- `DELETE /api/admin-mission/{mission_id}`: 미션 삭제
- `GET /admin/api/user-missions/{user_id}`: 유저 미션 진행 조회
- `GET /admin/api/user-missions/by-identifier/{identifier}`: 식별자 기준 조회
- `PUT /admin/api/user-missions/{user_id}/{mission_id}`: 진행도 업데이트
- `PUT /admin/api/user-missions/by-identifier/{identifier}/{mission_id}`: 식별자 기준 업데이트
- `GET /admin/api/user-missions/approvals/queue`: 승인 대기 큐
- `POST /admin/api/user-missions/approvals/batch`: 승인 일괄 처리
- `GET /admin/api/streak-rewards/daily-counts`: 스트릭 지급 집계
- `GET /admin/api/streak-rewards/user-events`: 스트릭 지급 로그 조회

**근거 코드**:
- [app/api/routes/mission.py](../../../app/api/routes/mission.py#L17-L193)
- [app/api/routes/retention_intervention.py](../../../app/api/routes/retention_intervention.py#L8-L36)
- [app/api/routes/admin_mission.py](../../../app/api/routes/admin_mission.py#L12-L106)
- [app/api/admin/routes/admin_user_missions.py](../../../app/api/admin/routes/admin_user_missions.py#L12-L202)
- [app/api/admin/routes/admin_streak_rewards.py](../../../app/api/admin/routes/admin_streak_rewards.py#L22-L108)

### 3.6 System / Ops
- `GET /api/health`: 헬스 체크
- `GET /api/today-feature`: 오늘의 기능 (Feature Flag)
- `GET /metrics`: 프로메테우스 메트릭

**근거 코드**:
- [app/api/routes/health.py](../../../app/api/routes/health.py#L4-L11)
- [app/api/routes/today_feature.py](../../../app/api/routes/today_feature.py#L16-L61)
- [app/api/routes/metrics.py](../../../app/api/routes/metrics.py#L4-L8)

---

## 4. 보안 감사 결과 (Security Audit)

### 🚨 Critical Findings
1.  **Dev Endpoints Exposure**:
    - `/api/dev/*` 경로가 Swagger에 노출되어 있음.
    - 프로덕션 배포 시 `creation_test_user` 등이 열려있으면 **치명적**(데이터 조작 및 Free Grant 가능).
    - **조치 권고**: `openapi_url` 설정에서 제외하거나, 미들웨어로 IP 화이트리스트/제거 처리 필수.

### ⚠️ Warning Findings
1.  **Implicit Typing**:
    - Shop/Intervention API가 `payload: dict` 형태로 Pydantic 검증 없이 사용됨. 악의적 Payload 주입 취약.
2.  **Idempotency Key Usage**:
    - `Inventory`, `Mission`에서 `X-Idempotency-Key` 헤더를 지원하나, 강제성이 코드 레벨에서 보장되지 않는 경우가 있음 (Optional Header).

---

## 5. V2 마이그레이션 계획
- [ ] **Unified Game Router**: `/api/v2/game/{type}`로 표준화.
- [ ] **Strict Schema**: 모든 `payload: dict` 제거 및 Pydantic V2 적용.
- [ ] **Auto-Generated Docs**: `docs/v2_specs/03_api/` 자동 생성 파이프라인 구축.
