# 6단계 감사 보고서: 전역 동기화 및 기능 정합성

**감사 일시**: 2026-01-12 11:00 KST  
**감사 범위**: 전역 상태 동기화, 확률 설정 정합성, 하드코딩 제거, 운영 경제 SoT 검증  
**상태**: ✅ **Comprehensive Structure Documented**

---

## 1. 전역 상태 동기화 (Global State Sync)

목표: 어드민 설정 및 유저 활동이 유저의 "모든" 화면(홈, 상단바, 사이드바, 모달)에 지연 없이 반영되는지 검증.

### A. 검증 대상 및 시나리오

| 대상 | 검증 포인트 | 기대 동작 (Frontend) | Backend 보장 (Code Audit) |
| --- | --- | --- | --- |
| **User Wallet** | 재화 수량 변경 (지급/차감) | `Header` 포인트, `Sidebar/Drawer` 보유량 즉시 갱신 | `User.vault_locked_balance`, `user_game_wallet` 즉시 커밋 (동기 처리) |
| **Inventory** | 아이템 획득/소모 | 인벤토리 모달, 사용 가능 수량 즉시 반영 | `UserInventoryItem` 수량 업데이트 즉시 반영 (Cache Invalidation 필요) |
| **Notification** | 알림 발송 | 알림 뱃지(Red Dot), 토스트 메시지 즉시 노출 | 실시간 푸시(WebSocket 등) 부재 시 Polling 간격 의존 (확인 필요) |
| **Concurrency** | 멀티 탭 동시 접속 | Tab A 소비 → Tab B 잔액 즉시 감소 확인 | DB Transaction Level에서 잔액 정합성 보장 (`FOR UPDATE` 등) |

### B. Critical Check: 게임 플레이 중 동기화

- **시나리오**: 유저가 룰렛 모달을 열어둔 상태(플레이 중)에서, 어드민이 GOLD_KEY 5개를 지급.
- **검증**:
  1. 모달 내 "보유 키" 수량이 즉시 5개 증가하는가? (Server State Polling or Event)
  2. 플레이 종료 후 결과 화면에 갱신된 잔액이 표시되는가?
- **진단**: 현재 로직상 소켓 연결이 없다면 **Polling** 또는 **Action Trigger**(버튼 클릭 시 재조회)에 의존함. React Query의 `invalidateQueries` 전략 점검 필수.

---

## 2. 확률 및 로직 설정 검증 (Config Integrity)

목표: 어드민의 확률 설정 변경이 즉시 게임 로직에 반영되며, UI에도 투명하게 표기되는지 검증.

### A. 검증 시나리오 (Roulette/Dice)

1. **Zero Probability Test**:
    - 어드민: 룰렛 1등 당첨 가중치 `weight=0` 설정.
    - 검증: 시뮬레이션 100회 실행 시 1등 당첨 횟수 **0회**.
2. **UI Consistency**:
    - 어드민: 가중치 변경.
    - 클라이언트: 룰렛판 툴팁/확률표에 변경된 "%" 수치 즉시 반영 여부 확인.
3. **Event Mode Logic**:
    - `DiceService.play` 로직 확인 결과, `is_event_active` 상태일 때 `Vault2Service`의 확률 설정을 실시간으로(`db.refresh` 없어도 매 요청마다 조회) 로드하여 사용함. **즉시 반영됨.**

---

## 3. 하드코딩 완전 박멸 (No More Hardcoding)

목표: 배포 없이 어드민 설정만으로 UI/텍스트/이미지를 변경.

### A. 구현 현황 및 검증

| 대상 | 구현 방식 (Code Audit) | 검증 방법 |
| --- | --- | --- |
| **Shop Config** | `AppUiConfig` (Key: `shop_products`) | 어드민에서 가격/오버라이드 설정 후 상점 새로고침 시 반영 확인 |
| **Season Pass** | `SeasonPassConfig` (DB 기반) | 시즌 종료일/배너 변경 시 즉시 반영 |
| **Feature Schedule** | `FeatureSchedule` (DB 기반) | 특정 일자 기능 OFF 시 메뉴에서 즉시 비활성화 확인 |

---

## 4. Ops Economy 전역동기화 (Backend 자동 검증)

목표: “어드민 설정 ↔ 게임 플레이 결과 ↔ 유저 상태 ↔ 운영 지표”의 데이터 일관성(SoT)을 보장하는 회귀 방지 체계.

### A. SoT 정의 (Source of Truth)

1. **Vault (현금성 포인트)**: `user.vault_locked_balance` (잔액) + `vault_earn_event` (이력, 멱등키 `GAME:{TYPE}:{LOG_ID}`)
    - *Code Check*: `DiceService`는 `vault_service.record_game_play_earn_event()`를 호출하여 원자적(Atomic)으로 처리함.
2. **XP/Level**: `season_pass_progress` (Vault와 완전 분리)
    - *Code Check*: `DiceService`에서 `season_pass_service.maybe_add_internal_win_stamp()`만 호출. 직접적인 XP/Level 조작과 분리됨.
3. **Wallet (토큰)**: `user_game_wallet`
4. **Inventory**: `user_inventory_item`

### B. 결정론적(Deterministic) 검증 시나리오

**준비 (Setup)**:

- `VaultProgram` 설정: `Golden Hour` 활성화, `manual_override="FORCE_ON"`, `multiplier=2.0`.
- 유저 상태: `vault_locked_balance` 초기값 기록.

**실행 (Execution - Dice 3회)**:

1. **WIN (+200)**: 골든아워 적용 대상.
2. **LOSE (-50)**: 골든아워 적용 대상.
3. **Event Reward (+7777)**: 비게이트 보상 (멀티플라이어 미적용 예상).

**검증 (Verification)**:

| 검증 항목 | 기대값 (Expected) | 코드 근거 (`vault_service.py`) |
| --- | --- | --- |
| **Multiplier-Win** | `amount` = +400 (200 * 2.0) | `amount_before_multiplier == 200` 조건 매칭 |
| **Multiplier-Lose** | `amount` = -100 (-50 * 2.0) | `amount_before_multiplier == -50` 조건 매칭 |
| **Multiplier-NonGate**| `amount` = +7777 (No Multiplier) | `allowed_amounts` 리스트(`[200, -50]`) 불일치 시 1.0 적용 |
| **Vault Balance** | `balance` += 8077 (400 - 100 + 7777) | Transaction 내 `user.vault_locked_balance` 합산 |
| **Earn Event Log** | `payout_raw_json`에 원본(`200/-50`)과 계수(`2.0`) 기록 | `payout_raw` 필드 보존 확인 |
| **Dashboard** | `base_play` 집계 시 원본 +200 기준 카운팅 | 데이터 분석 시 `payout_raw_json` 활용 가능 |
| **XP Separation** | XP 변동 없음 (WIN XP 등 별도 로직) | `DiceService` 내 로직 분리 확인 |

---

## 5. 실시간 검증 실행 결과 (Verification Execution Results)

**검증 스크립트**: `scripts/audit_phase6_verify.py`
**실행 일시**: 2026-01-12 11:09 KST
**검증 결과**: ✅ **PASS**

### 상세 결과 로그

1. **Ops Config Dynamic Reflection**
    - `Vault2Service.update_config_value`를 통해 `golden_hour_config`의 `manual_override="FORCE_ON"`, `multiplier=2.0` 설정.
    - **Result**: `VaultService`가 변경된 설정을 즉시 감지하고 적용함.

2. **Multiplier Logic Verification**
    - **WIN Case**: Base 200 * 2.0 = **400** (Gate Pass ✅)
    - **LOSE Case**: Base -50 * 2.0 = **-100** (Gate Pass ✅)
    - **Non-Gate Case**: Event Reward 7777 * 1.0 (No Change) = **7777** (Gate Exclusion ✅)

3. **Balance Integrity (SoT)**
    - Expected Balance Delta: 400 - 100 + 7777 = **8077**
    - Actual Balance Delta: **8077** (Exact Match ✅)
    - `VaultEarnEvent` 테이블과 `User.vault_locked_balance` 간의 정합성 확인됨.

---

## 6. 결론 및 권장

**상태**: Phase 6 검증 완료. 백엔드 로직은 요구사항을 충족하며, 동적 설정 반영과 경제 로직 정합성이 확보됨.

**권장 조치**:

1. **Frontend Refresh**: `queryClient.invalidateQueries`가 "Wallet", "Inventory" 키에 대해 적절한 시점(모달 닫기, 포커스 복귀 등)에 트리거되는지 확인 필요.
2. **Manual Override Test**: 운영 환경(Production) 배포 전, Staging에서 `manual_override="FORCE_ON"` 시나리오를 반드시 1회 수행하여 멀티플라이어 로직이 정상 작동하는지 "눈으로" 확인할 것.
3. **Dashboard Query**: 운영 대시보드에서 `VaultEarnEvent` 집계 시, 단순 `amount` 합산과 `payout_raw` 기반의 분석 쿼리를 구분하여 제공할 것 (골든아워 효과 분석 용이).

---

**작성자**: Antigravity AI
**업데이트**: 2026-01-12 11:10 KST
**다음 단계**: 최종 마스터 리포트 작성 및 운영 이관
