# V2 통합 배포/검증 표준 가이드 (V2 Integrated Verification Standard)

**문서 번호**: VS-20260207-MASTER
**버전**: v1.0
**최종 업데이트**: 2026-02-07
**작성자**: Antigravity (Consolidated)
**대상 독자**: BE/FE/OPS/QA

---

## 1. 개요 (Overview)
본 문서는 XMAS 지급/보상 시스템의 V1 → V2 이관에 따른 **기능 맵핑 상황**, **검증 표준 절차**, 그리고 **검증 로그 기록 표준**을 통합 정의합니다. 모든 V2 배포 및 검증 작업은 본 가이드를 준수해야 합니다.

---

## 2. V1 → V2 기능 이관 및 검증 현황 맵핑
> 원본: `flow_feature_mapping_v1_v2.md` (2026-01-29 기준)

**핵심 원칙**:
- **Full-stack Observability**: 모든 검증은 `app.v2` 네임스페이스 동작 및 실제 E2E 증거(로그/DB) 수렴 여부를 기준으로 합니다.
- **V1 의존성 제거**: V2 라우트/서비스에서 V1 직접 import는 제거되어야 합니다.

### 2.1 도메인별 검증 현황

| 도메인 | 기능 (내역) | 상태 | 검증 근거 및 API |
| :--- | :--- | :---: | :--- |
| **가입/인증** | 텔레그램 인증, Refresh Token, Auth Event | ✅ 완료 | **[2026-01-29]** V2 Telegram Auth SoT 구현 완료<br>- Hash 검증, 30일/7일 갱신 윈도우<br>- DB: `v2_user`, `v2_user_auth_event` |
| **게임진행** | 룰렛 / 주사위 / 복권 | ✅ 완료 | **[2026-01-24]** E2E 검증 완료 (Status 200)<br>- 원장 분리 검증 (Ledger Separation)<br>- API: `/api/v2/*/play` |
| **환경/SoT** | Phase 1 환경/SoT 정합성 | ✅ 완료 | Health Check (200 OK), Alembic 버전 확인 |
| **코어경제** | 금고(Vault) & 장부(Ledger) | ✅ 완료 | Vault 입출금 및 상태 조회 (200 OK)<br>- API: `/api/v2/vault/status` |
| **상점/인벤** | 상품 조회/구매/사용 | ✅ 완료 | V2 Inventory Use, Shop Purchase (200 OK)<br>- DB: `v2_shop_order`, `v2_inventory` |
| **팀배틀** | 랭킹 / 보상 / 조회 | ✅ 완료 | Team Battle V2 Routes Payload 검증 완료 |
| **미션** | 조회 / 보상 클레임 | ✅ 완료 | 중복 클레임 차단(`ALREADY_CLAIMED`) 확인 |
| **AdminOps** | RBAC / Ops Plans | ✅ 완료 | Ops Plan 실행 및 Inventory Grant 검증 완료 |

### 2.2 보상 항목별 V2 백엔드 상태

| 보상 항목 | 상태 | 담당 서비스 | 비고 |
| :--- | :---: | :--- | :--- |
| **티켓** | ✅ 완료 | `V2InventoryService` | 룰렛/주사위/복권 소모 확인 |
| **금고 포인트** | ✅ 완료 | `V2VaultService` | Vault 상태 응답 및 SoT 반영 |
| **조각** | ✅ 완료 | `V2InventoryService` | 복권/골드키 조각 모음 로직 |
| **미션 보상** | ✅ 완료 | `V2MissionService` | 클레임 시 즉시 지급 |
| **상점 교환** | ✅ 완료 | `V2ShopService` | 상품권/아이템 교환 로직 |
| **레벨업** | ✅ 완료 | `LevelXPService` | CC Deposit → XP 적립 → 보상 |

---

## 3. 주요 기술 검증 절차 (Verification Procedures)
> 원본: `20260207_timestamp_reward_routing_verification_guide_ko.md`

최근 변경사항 및 잠재적 충돌 포인트에 대한 표준 검증 절차입니다.

### 3.1 타임스탬프 정합성 검증
**목적**: ORM 기본값(KST)과 DB server_default(시스템 타임존) 간의 정합성 확인.

1. **DB 타임존 확인**:
   ```sql
   SELECT @@global.time_zone AS global_tz, @@session.time_zone AS session_tz;
   ```
2. **기본값 동작 확인**:
   - `INSERT` 시 별도 시간 지정 없이 생성 후 `SELECT` 하여 시간 확인.
3. **판단 기준**:
   - ✅ KST 기준 1분 오차 내 동기화.
   - 🔴 UTC 등으로 설정되어 KST와 오프셋 불일치 시 수정 필요.

### 3.2 상점 보상 라우팅 검증
**목적**: `BUNDLE`, `TICKET_BUNDLE` 보상이 `reward_amount` 설정에 따라 올바른 로직(`V2RewardService.deliver`)을 타는지 확인.

1. **절차**:
   - 테스트 SKU (BUNDLE/TICKET_BUNDLE) 구매 테스트.
   - `v2_shop_order`의 `reward_type`, `reward_amount` 확인.
   - 실제 지급 내역(`user_game_wallet`, `user_inventory_item`, `vault_locked_balance`) 교차 검증.
2. **판단 기준**:
   - ✅ `reward_amount` 분기에 맞춰 정확한 아이템/재화 지급.

### 3.3 Telegram Unlink 및 V2User FK 검증
**목적**: `telegram_unlink_request` 등 레거시 연결 고리가 V2User FK로 정상 전환되었는지 확인.

1. **절차**:
   - `telegram_unlink_request` 테이블 조회 시 `current_user_id`가 `v2_user`와 조인되는지 확인.
   - 레거시 User 테이블 의존성 제거 확인.

### 3.4 게임 로그 및 Golden 개입 검증
1. **게임 로그 (`v2_game_log`)**:
   - `created_at`, `updated_at` 컬럼 존재 확인.
   - 로그 생성 시 해당 컬럼 자동 채움(Auto-fill) 확인.
2. **Golden 개입 (`v2_golden_intervention_log`)**:
   - 기본 상태값 `PENDING_APPROVAL` 확인.
   - 승인 API 호출 후 `SENT` 전환 확인.

---

## 4. 검증 로그 포맷 표준 (Verification Log Template)
> 원본: `v2_verification_log_template_ko.md`

모든 검증 수행 시 아래 Markdown 템플릿을 사용하여 기록을 남깁니다.

```markdown
문서 타입: 검증 로그
버전: v1.0
검증 날짜: YYYY-MM-DD
작성자: (작성자명)
환경: (local/staging/prod)
배포 버전/커밋: (Git Hash or Tag)

## 1. 목적
(검증의 주 목적 기술)

## 2. Unit & Integration 테스트
- 실행 커맨드: (예: pytest tests/v2/...)
- 결과: (PASS/FAIL)
- 실패 항목: (없으면 '없음')

## 3. E2E 스모크 테스트
- 시나리오 목록:
  - CASE 1: (시나리오명) - (PASS/FAIL)
- 결과: (PASS/FAIL)

## 4. 트래픽/로그 샘플링
- 샘플 수:
- 에러 로그 유무:
- 특이사항:

## 5. 결론 및 조치
- (배포 진행 / 롤백 / 추가 수정 필요 등)
```

---

## 5. 운영 점검 체크리스트 (Operations Checklist)
매 배포/운영 작업 시 확인해야 할 필수 항목입니다.

- [ ] **Timezone**: DB 및 애플리케이션 타임존이 `Asia/Seoul (KST)`인지 확인.
- [ ] **Reset Hour**: 일일 초기화 기준 시간이 `09:00 KST` 인지 확인.
- [ ] **V1 Imports**: V2 코드 내 V1 모듈 직접 임포트가 없는지 확인 (Shim 사용).
- [ ] **Security**: `DEV_LOGIN_ENABLED` 플래그가 PROD 환경에서 `False` 인지 확인.
- [ ] **Schema Compliance**: API 요청/응답이 정의된 스키마(Enum 등)를 준수하는지 확인.
