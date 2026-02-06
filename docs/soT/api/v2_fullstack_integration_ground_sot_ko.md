문서 타입: 설계
버전: v1.0
작성일: 2026-01-24
작성자: GitHub Copilot
대상 독자: BE/FE/QA/운영

# V2 Full-Stack Integration Ground SoT

## 1. 목적 (Purpose)
V2 전 구간(Frontend ↔ Backend ↔ DB/Redis) 연동의 단일 기준(SoT)을 제공하여, v1 시기 산출물의 혼선을 해소하고 배포/검증 기준을 일원화한다.

## 2. 범위 (Scope)
- 프론트 라우팅 → API 연동 → DB/Redis 반영까지의 End-to-End 흐름
- 인증/헤더/에러/타임아웃/버전 정책의 단일 기준
- 전형적 사용자/운영 시나리오의 통합 관찰 포인트

## 3. 용어 정의 (Definitions)
- Full-Stack Ground: UI 진입부터 API 호출, DB/Redis 반영, 화면 반영까지의 단일 진실 레이어
- Evidence: API 요청/응답, DB SELECT, Redis Key, 로그, 스크린샷, 네트워크 HAR
- v2-only: v1 엔드포인트/서비스 의존 제거 상태

## 4. SoT 기준 문서 (References)
- 라우팅 SoT: docs/v2_specs/00_sot_meta/v2_frontend_routing_sot_ko.md
- 통합 가이드: docs/v2_specs/03_api/v2_api_integration_guide_ko.md
- OpenAPI: docs/v2_specs/03_api/v2_openapi.yaml
- 게임 계약: docs/v2_specs/03_api/v2_game_api_contract_ko.md
- 인증/유저 계약: docs/v2_specs/03_api/v2_auth_user_api_contract_ko.md
- Golden 계약: docs/v2_specs/07_golden/v2_golden_api_contract_ko.md

## 5. 공통 연동 규칙 (Policy)
### 5.1 인증/헤더
- Authorization: Bearer <token>
- Admin 요청은 관리자 토큰 필수 (ROLE 기반)

### 5.2 타임아웃/재시도
- FE 기본 타임아웃: 10s (표준)
- 동일 요청 재시도 시 idempotency 키 사용 (구매/지급/출금 등)

### 5.3 에러 포맷
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Korean message",
    "trace_id": "uuid"
  }
}
```

### 5.4 시간 기준
- 모든 비즈니스 날짜/리셋 기준: KST, 오전 9시 리셋

## 6. Full-Stack 통합 맵 (요약)

| 구간 | FE 진입 | API 엔드포인트 | DB/Redis 포인트 | 증거 | 성공 기준 |
|---|---|---|---|---|---|
|✅ Auth | /landing | POST /api/v2/auth/token | user, activity | 응답/로그 | 토큰 발급/유저 로드 | (개발모드 테스트 권장) |
|✅ **Game (Dice)** | /game/dice | POST /api/v2/dice/play | v2_dice_log, vault_ledger | DB row/응답 | Outcome/Reward/SP/배수 반영 |
|✅ **Game (Roulette)** | /game/roulette | POST /api/v2/roulette/play | v2_roulette_log, vault_ledger | DB row/응답 | Segment/Reward/SP 반영 |
|✅ **Game (Lottery)** | /game/lottery | POST /api/v2/lottery/play | v2_lottery_log, vault_ledger | DB row/응답 | Prize/Collection/SP 반영 |
| Team Battle | /team-battle | POST /api/v2/team-battle/teams/join | team_members | DB row/응답 | 팀 가입/시즌 연동 |
| Survey | /surveys | POST /api/v2/surveys/{id}/responses/complete | survey_responses | DB row/응답 | 설문 완료/보상 지급 |
| Shop | /shop | POST /api/v2/shop/purchase | v2_shop_order, inventory | DB row/응답 | 주문/인벤 반영 (Idempotency) |
| Inventory | /inventory | POST /api/v2/inventory/use | inventory_ledger | DB row/응답 | 아이템 소모/효과 반영 |
| Vault | /vault | POST /api/v2/vault/withdraw | vault_withdrawal_request | DB row/응답 | 회차/쿨다운 정책 적용 |
| **Mission (Daily)** | /missions | POST /api/v2/mission/{id}/claim | mission_claim, ledger | DB row/응답 | 일간 보상/중복방지 (X-Idempotency) |
| **Mission (Weekly)** | /missions | POST /api/v2/mission/{id}/claim | mission_claim, ledger | DB row/응답 | 주간 보상/진척도/XP 반영 |
| **Mission (New)** | /missions | POST /api/v2/mission/{id}/claim | mission_claim | DB row/응답 | 신규전역 보상(1회성) 검증 |
| **Mission (Streak)** | /missions | POST /api/v2/mission/streak/claim | user_activity, wallet | DB row/응답 | 연속 출석 배수/보상 반영 |
| **Mission (Free)** | /missions | POST /api/v2/mission/daily-gift | wallet_ledger | DB row/응답 | 무료 티켓 지급/시간제한 확인 |
| Level/XP | n/a | POST /api/v2/admin/users/{id}/xp | level_xp_log, user.level | DB row/로그 | XP 상한/레벨업 검증 |
| Golden | n/a | POST /api/v2/golden/intervention/resolve | golden_log | DB row/응답 | eligible/보상 산출 |
|✅ **Admin (Dash)** | /v2/admin/dashboard | GET /api/v2/admin/ops/status | admin_audit_log | 응답/Audit | 권한 체크 / 시스템 상태 확인 |
|✅ **Admin (C-Radar)**| /v2/admin/dashboard/radar | GET /api/v2/admin/dashboard/metrics | retention_state | 응답/Metrics | 이탈 위험군 / 매출 지표 시각화 |
| **Admin (CRMs)** | /v2/admin/marketing/messages | POST /api/v2/admin/marketing/messages | admin_message | DB row/Audit | 전역/타겟 메시지 발송 & 팬아웃 |
| **Admin (Users)** | /v2/admin/users | GET /api/v2/admin/users | users | 응답/Audit | 회원 검색 & 상세 프로필 로드 |
| **Admin (UserAdj)**| /v2/admin/users/{id} | POST /api/v2/admin/users/{id}/wallet/adjust | user_game_wallet | DB row/Audit | 관리자 수동 재화 조정 (금고/티켓) |
| **Admin (CC-Depo)**| /v2/admin/economy/deposits | POST /api/v2/admin/economy/deposits/{id}/confirm | admin_cc_deposit | DB row/Audit | 무통장 입금 승인 & XP/레벨 연동 |
| **Admin (G-Config)**| /v2/admin/game/* | PUT /api/v2/admin/game/{game}/config | v2_{game}_config | DB row/Audit | 확률/상금/정책 실시간 반영 |
| **Admin (InvGrant)**| /v2/admin/inventory/* | POST /api/v2/admin/inventory/items | user_inventory_ledger | DB row/Audit | 관리자 아이템 지급 & 만료 설정 |

## 7. 전형 시나리오 (표준)
1) SignUp → Shop → Play → Vault
2) TicketZero → Play Again
3) Admin Intervention → Inbox → User Claim
4) Golden Hour Dice → 배수 반영
5) Mission Claim → Duplicate 방지

각 시나리오별 상세 증거와 커맨드는 테스트 로그 문서에 기록한다.

## 8. 운영/검증 (QA)
- **스키마 준수**: FE/BE에서 동일한 DTO/스키마를 사용하고 있는지 확인 (v2_api_integration_guide 참조)
- **v1 잔재 제거/라우팅 연결**:
  - 프론트엔드 코드 내 `/admin/api/` 또는 `/api/admin/` 등 v1 스타일 경로의 v2 교체 여부 확인
  - `/admin/` 라우팅 하위에서 V2 컴포넌트가 로드될 때 `admin_token` 프록시 전달 정상 동작 확인
  - `adminApi.ts` 등 공통 API 모듈에서 `api/v2/admin/` 접두어 강제 적용 여부 확인
- **오류 코드**: 오류 코드가 `/api/v2/` 명세에 따른 공통 포맷으로 반환되는지 확인
- **보안**: `/v2/` 경로 호출 시 유저 토큰 vs 관리자 토큰의 오사용 사례가 없는지 네트워크 패킷 검증

## 9. 변경 이력
- v1.0 (2026-01-24, GitHub Copilot): 최초 작성
