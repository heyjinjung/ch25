# 2단계 감사 보고서: 경제 및 게임 운영

**감사 일시**: 2026-01-11 23:18 KST  
**감사 범위**: Vault, Cash, Game Tokens, Economy 관련 모델, 라우트, 서비스  
**상태**: ⚠️ **Partial Verified** (OP 미검증 / 언락·만료 정책 비활성 확인)

---

## 1. TL;DR (3~5줄)

- **Vault SoT**: `User.vault_locked_balance`가 SoT, `vault_balance`는 레거시 미러 (Phase 1 주석 명시)
- **Game Token**: 7종 토큰 타입 (`ROULETTE_COIN`, `DICE_TOKEN`, `TRIAL_TOKEN`, `LOTTERY_TICKET`, `GOLD_KEY`, `DIAMOND_KEY`, `DIAMOND`)
- **Ledger 패턴**: 모든 재화 변동은 Ledger 테이블에 `delta/balance_after` 기록 (audit trail 확보)
- **이중 라우터**: `admin_vault_ops.py`에서 `/admin/api/vault/*`와 `/api/admin/vault/*` 동시 노출 (NGINX 호환)
- **검증 현황**: OP-001~006, US-001/003, INT-001~003 자동 테스트 통과; US-002는 언락→cash 비활성, US-004는 만료 비활성(정책 상태)

---

## 2-0) 통합 경제 SoT(단일 기준) + 범위

### A. 재화 유형 분류

| 재화 유형 | SoT 테이블 | Balance 컬럼 | Ledger 테이블 | 비고 |
| --- | --- | --- | --- | --- |
| **Vault (잠금)** | `user` | `vault_locked_balance` | `vault_earn_event` | 게임 플레이로 적립 |
| **Vault (가용)** | `user` | `vault_available_balance` | - | Phase 2 스캐폴드 |
| **Cash (현금)** | `user` | `cash_balance` | `user_cash_ledger` | 출금 가능 잔액 |
| **Game Token** | `user_game_wallet` | `balance` | `user_game_wallet_ledger` | 7종 토큰 |
| **Vault 2.0** | `vault_status` | `locked_amount` | - | 프로그램별 상태 |
| **기프트콘/바우처** | `user_inventory_ledger` | (ledger 합산) | `user_inventory_ledger` | 시즌/프로모션 지급·사용 |
| **Season Pass 보상(별도 감사 예정)** | (추가 정의 예정) | - | - | Game Token 7종 외 별도 스펙 수립 필요 |

### B. SoT 계층 구조

```
┌─────────────────────────────────────────────────────────┐
│ Level 1: User Account (user 테이블)                     │
│   → vault_locked_balance (SoT)                          │
│   → vault_balance (레거시 미러, 읽기 전용 권장)          │
│   → cash_balance                                        │
│   → total_charge_amount (VIP 조건)                      │
├─────────────────────────────────────────────────────────┤
│ Level 2: Token Wallets (user_game_wallet 테이블)         │
│   → per token_type balance                              │
│   → 7종: ROULETTE_COIN, DICE_TOKEN, TRIAL_TOKEN,        │
│          LOTTERY_TICKET, GOLD_KEY, DIAMOND_KEY, DIAMOND │
├─────────────────────────────────────────────────────────┤
│ Level 3: Vault Programs (vault_status 테이블)            │
│   → per program_id: locked_amount, available_amount     │
│   → state: LOCKED / AVAILABLE / EXPIRED                 │
└─────────────────────────────────────────────────────────┘
```

### C. 범위 경계

| 포함 | 제외 |
| --- | --- |
| Vault 잠금/가용 잔액 | 인벤토리/아이템 |
| Cash 잔액 | 외부 결제 연동 |
| Game Token 7종 | Season Pass 보상 (별도 감사) |
| Accrual/Unlock 이벤트 | 마케팅 바우처 (admin_shop 별도) |

**주의(⚠️) 표시는 무시 대상이 아님**: 해당 항목은 “미사용/검증 필요” 상태를 뜻하며, 후속 단계에서 활성화 또는 폐기 여부를 결정해야 함.

---

## 2-1) 페이지/엔드포인트/테이블 매핑

### A. Admin API 엔드포인트

| 엔드포인트 | 라우트 파일 | 기능 | 연관 테이블 |
| --- | --- | --- | --- |
| `/admin/api/vault/{user_id}` | `admin_vault_ops.py` | Vault 상태 조회 | `user` |
| `/admin/api/vault/{user_id}/timer` | `admin_vault_ops.py` | 타이머 제어 | `user` |
| `/admin/api/vault/by-identifier/{id}` | `admin_vault_ops.py` | 식별자 기반 조회 | `user`, identity 서비스 |
| `/admin/api/vault2/tick` | `admin_vault2.py` | Vault2 상태 전이 | `vault_status` |
| `/admin/api/game-tokens/grant` | `admin_game_tokens.py` | 토큰 지급 | `user_game_wallet` |
| `/admin/api/game-tokens/revoke` | `admin_game_tokens.py` | 토큰 회수 | `user_game_wallet` |
| `/admin/api/game-tokens/` | `admin_game_tokens.py` | 지갑 목록 | `user_game_wallet` |
| `/admin/api/game-tokens/ledger` | `admin_game_tokens.py` | 토큰 변동 로그 | `user_game_wallet_ledger` |
| `/admin/api/economy/stats` | `admin_economy_stats.py` | 경제 통계 | `user_inventory_ledger`, `idempotency` |

### B. 레거시 라우터 (NGINX 호환)

| 레거시 경로 | 정규 경로 | 비고 |
| --- | --- | --- |
| `/api/admin/vault/*` | `/admin/api/vault/*` | 동일 핸들러 |

### C. Frontend 페이지 (실제 확인)

| 페이지/경로 | 주요 API | 표시 데이터 | 근거 파일 |
| --- | --- | --- | --- |
| 금고 운영 관리 `/admin/vault` | `/admin/api/vault/{id}`, `/admin/api/vault/{id}/timer`, `/admin/api/vault-programs/*` | locked/available/reserved, 타이머, 프로그램 설정 | [src/admin/pages/VaultAdminPage.tsx](src/admin/pages/VaultAdminPage.tsx) |
| 티켓 통합 관리 `/admin/game-tokens` | `/admin/api/game-tokens/grant`, `/admin/api/game-tokens/revoke`, `/admin/api/game-tokens/ledger`, `/admin/api/game-tokens/play-logs`, `/admin/api/game-tokens/wallets` | 토큰별 잔액, 부여/회수, 플레이/레저 로그 | [src/admin/pages/TicketManagerPage.tsx](src/admin/pages/TicketManagerPage.tsx) + [src/admin/api/adminGameTokenApi.ts](src/admin/api/adminGameTokenApi.ts) |
| 경제 지표 `/admin/economy` | `/admin/api/economy/stats` | 상점 구매 집계, 바우처 사용, idempotency 상태 | [src/admin/pages/AdminEconomyStatsPage.tsx](src/admin/pages/AdminEconomyStatsPage.tsx) + [src/admin/api/adminEconomyApi.ts](src/admin/api/adminEconomyApi.ts) |

---

## 2-2) 재화별 SoT/테이블 분석

### A. Vault (금고) 시스템

| 필드 | 테이블.컬럼 | 타입 | SoT 여부 | 비고 |
| --- | --- | --- | --- | --- |
| 잠금 잔액 | `user.vault_locked_balance` | Integer | ✅ **SoT** | 게임 적립분 |
| 레거시 잔액 | `user.vault_balance` | Integer | ❌ 미러 | Phase 1 주석 명시 |
| 가용 잔액 | `user.vault_available_balance` | Integer | ⚠️ Phase 2 | 미사용(무시 금지, 활성/폐기 결정 필요) |
| 만료일시 | `user.vault_locked_expires_at` | DateTime | ✅ | 24H 만료 기준 |
| 누적 충전 | `user.total_charge_amount` | Integer | ✅ | VIP 조건 |

**Accrual Log (적립 로그)**:

| 컬럼 | 용도 |
| --- | --- |
| `earn_event_id` | 멱등성 키 (예: `GAME:DICE:123`) |
| `earn_type` | GAME_PLAY / TRIAL_PAYOUT |
| `amount` | 적립 금액 |
| `source` | DICE / ROULETTE / LOTTERY |

### B. Cash (현금) 시스템

| 필드 | 테이블.컬럼 | 타입 | SoT 여부 |
| --- | --- | --- | --- |
| 현금 잔액 | `user.cash_balance` | Integer | ✅ **SoT** |
| 변동 로그 | `user_cash_ledger` | - | ✅ 감사 추적 |

**Cash Ledger 구조**:

| 컬럼 | 용도 |
| --- | --- |
| `delta` | 변동량 (+/-) |
| `balance_after` | 변동 후 잔액 |
| `reason` | VAULT_UNLOCK / ADMIN_GRANT 등 |
| `label` | 표시용 라벨 |
| `meta_json` | 추가 메타데이터 |

### C. Game Token (게임 토큰) 시스템

| 토큰 타입 | 용도 | 소비처 |
| --- | --- | --- |
| `ROULETTE_COIN` | 룰렛 게임 | 룰렛 플레이 |
| `DICE_TOKEN` | 다이스 게임 | 다이스 플레이 |
| `TRIAL_TOKEN` | 체험 토큰 | 무료 체험 |
| `LOTTERY_TICKET` | 복권 | 복권 구매 |
| `GOLD_KEY` | 골드 키 | 특수 보상 |
| `DIAMOND_KEY` | 다이아몬드 키 | 프리미엄 보상 |
| `DIAMOND` | 다이아몬드 | 미션 보상 화폐 |

**Wallet 구조**:

| 테이블 | 복합 유니크 | 비고 |
| --- | --- | --- |
| `user_game_wallet` | `(user_id, token_type)` | 잔액 저장 |
| `user_game_wallet_ledger` | - | 변동 로그 |

### D. 기프트콘/바우처 재화 (신규 반영)

| 필드/개념 | 테이블.컬럼 | SoT 여부 | 비고 |
| --- | --- | --- | --- |
| 기프트콘/바우처 수량 | `user_inventory_ledger` (ledger 합산) | ✅ Ledger 기반 SoT | 지급/사용 모두 ledger 기록 필요 |
| 사용 사유 | `reason` (e.g., `USE_VOUCHER`) | ✅ | AdminEconomyStatsPage에서 집계 |
| 지급 사유 | `reason` (e.g., `SHOP_PURCHASE:<sku>`) | ✅ | 스토어/프로모션 지급 시 사용 |

### E. Vault 2.0 (프로그램별 상태)

| 테이블 | 용도 | 상태 |
| --- | --- | --- |
| `vault_program` | 프로그램 정의 | 운영 중 |
| `vault_status` | 유저별 상태 | Phase 2 스캐폴드 |

**VaultStatus 상태값**:

| 상태 | 의미 |
| --- | --- |
| `LOCKED` | 잠금 (적립 중) |
| `AVAILABLE` | 출금 가능 |
| `EXPIRED` | 만료됨 |

---

## 2-3) 최소 검증 시나리오

### A. 운영자 시나리오

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| OP-001 | 유저 Vault 상태 조회 | `/admin/api/vault/{id}` → locked_balance, expires_at 표시 | ☑ (자동 테스트 통과) |
| OP-002 | 타이머 리셋 | `/admin/api/vault/{id}/timer` → 만료 연장 | ☑ (자동 테스트 통과) |
| OP-003 | 토큰 수동 지급 | `grant_tokens` → 잔액 증가 + Ledger 기록 | ☑ (자동 테스트 통과) |
| OP-004 | 토큰 회수 | `revoke_tokens` → 잔액 감소 + Ledger 기록 | ☑ (자동 테스트 통과) |
| OP-005 | 식별자 기반 조회 | `by-identifier/{nickname}` → 유저 Vault 반환 | ☑ (자동 테스트 통과) |
| OP-006 | Vault2 상태 전이 | `tick_vault2_transitions` → LOCKED→AVAILABLE 전이 | ☑ (자동 테스트 통과) |
※ OP-001~006: 자동 테스트로 검증 완료 (관리자 인증 불필요 엔드포인트 기준).

### B. 유저 시나리오 (영향 검증)

| ID | 시나리오 | 검증 포인트 | 체크 |
| --- | --- | --- | --- |
| US-001 | 게임 플레이 후 적립 | `vault_locked_balance` 증가, `vault_earn_event` 기록 | ☑ (자동 테스트 통과) |
| US-002 | Vault 언락 | `cash_balance` 증가, `vault_locked_balance` 감소 | ☒ (언락→cash 비활성) |
| US-003 | 토큰 소비 | 게임 플레이 시 토큰 차감 + Ledger | ☑ (자동 테스트 통과) |
| US-004 | 만료 처리 | 24H 후 `vault_locked_balance` → 0 (정책 확인) | ⚠️ (만료 로직 비활성) |
※ US-001/003 자동 테스트 통과, US-002는 현행 정책상 언락→cash 미지원, US-004는 만료 로직 비활성로 유지.

### C. 데이터 정합성 검증

| ID | 검증 항목 | SQL 예시 | 체크 |
| --- | --- | --- | --- |
| INT-001 | Wallet 잔액 = Ledger 합산 | `SUM(delta) = balance` | ☑ (자동 테스트 통과) |
| INT-002 | Vault 잔액 = Earn 합산 | `SUM(amount) = locked_balance` (조건: 미만료) | ☑ (자동 테스트 통과) |
| INT-003 | Cash 잔액 = Ledger 합산 | `SUM(delta) = cash_balance` | ☑ (자동 테스트 통과) |
※ INT-001~003 자동 테스트 통과.

---

## 3. 발견 이슈

### 🟡 MEDIUM-001: vault_balance 레거시 미러

**상태**: ✅ 코드 반영 완료 (vault2_service에서 locked-only 미러, 테스트 통과)

**현황**: `User.vault_balance`가 `vault_locked_balance`의 미러로 존재

**리스크**: 두 값이 동기화되지 않을 경우 혼란

**권장**: 레거시 필드 폐기 또는 자동 동기화 트리거

### 🟡 MEDIUM-002: Vault2 Phase 2 스캐폴드

**상태**: ⏳ 미해결(계획 필요)

**현황**: `vault_status`, `vault_program` 테이블이 존재하나 미사용 ("not yet wired into gameplay")

**리스크**: 향후 마이그레이션 시 데이터 정합성 이슈 가능

**권장**: 활성화 전 마이그레이션 계획 문서화

### 🟢 LOW-001: 이중 라우터 노출

**상태**: ⏳ 미해결(정책 검토 필요)

**현황**: `/admin/api/vault/*`와 `/api/admin/vault/*` 동시 노출

**영향**: 기능 이상 없음, NGINX 리라이트 지원용

---

## 4. 권장 조치 요약

| 우선순위 | ID | 조치 내용 | 예상 작업량 |
| --- | --- | --- | --- |
| ✅ 1 | MEDIUM-001 | vault_balance 폐기 또는 동기화 | 완료 |
| 🟡 2 | MEDIUM-002 | Vault2 활성화 계획 문서화 | 1시간 (미해결) |
| 🟢 3 | LOW-001 | 레거시 라우터 폐기 일정 협의 | 30분 (미해결) |

---

## 5. 부록: 테이블 스키마 요약

### A. user (경제 관련 필드만)

```sql
vault_balance INT DEFAULT 0          -- 레거시 미러
vault_locked_balance INT DEFAULT 0   -- SoT
vault_available_balance INT DEFAULT 0 -- Phase 2
vault_locked_expires_at DATETIME     -- 만료
cash_balance INT DEFAULT 0           -- 현금
total_charge_amount INT DEFAULT 0    -- 누적 충전
diamond_key_count INT DEFAULT 0      -- V6
```

### B. user_game_wallet

```sql
user_id INT FK
token_type ENUM(...) -- 7종
balance INT DEFAULT 0
UNIQUE(user_id, token_type)
```

### C. vault_earn_event

```sql
earn_event_id VARCHAR(128) UNIQUE  -- 멱등성 키
earn_type VARCHAR(50)              -- GAME_PLAY 등
amount INT                         -- 적립량
source VARCHAR(50)                 -- DICE/ROULETTE
```

---

**작성자**: Antigravity AI  
**다음 단계**: 3단계 감사 (보상/미션/시즌) 진행

---

## 6. 금고 출금 (Withdrawal) 플로우 분석

> **⚠️ 운영 이슈 발견**: 출금 요청 후 승인 전까지 유저 잔액에 미반영

### 6-1) 출금 플로우 다이어그램

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. 유저 출금 요청                                                    │
│    → request_withdrawal(user_id, amount)                            │
│    → 조건: amount >= 10,000 + 당일 입금 이력 필수                     │
├─────────────────────────────────────────────────────────────────────┤
│ 2. VaultWithdrawalRequest 생성 (status=PENDING)                      │
│    ⚠️ 잔액 차감 없음, reserved로만 계산                              │
├─────────────────────────────────────────────────────────────────────┤
│ 3. 운영자 처리 (process_withdrawal)                                  │
│    → APPROVE: vault_locked_balance -= amount (실제 차감)             │
│    → REJECT: 아무 변화 없음 (reserved 해제)                          │
└─────────────────────────────────────────────────────────────────────┘
```

### 6-2) 잔액 계산 로직

| 항목 | 계산식 |
| --- | --- |
| **Total** | `User.vault_locked_balance` |
| **Reserved** | `SUM(VaultWithdrawalRequest.amount WHERE status='PENDING')` |
| **Available** | `Total - Reserved` |

### 6-3) 핵심 이슈: 승인 전 잔액 미반영

```
⚠️ 현재 로직:
   - 출금 요청 시 "예약(reserved)"만 되고 실제 차감은 APPROVE 시점
   - 만료 처리를 하지 않는 이상, 유저가 보는 잔액에 출금 반영 안 됨
   - 10,000 단위로 쪼개서 처리(운영)할 때 각 건이 PENDING 상태로 쌓임
```

**현재 코드 (vault_service.py L1133)**:

```python
if action == "APPROVE":
    user.vault_locked_balance = total - int(req.amount)  # ← 승인 시에만 차감
```

### 6-4) VaultWithdrawalRequest 모델

| 컬럼 | 타입 | 용도 |
| --- | --- | --- |
| `user_id` | FK | 요청 유저 |
| `amount` | Integer | 출금 요청액 (≥ 10,000) |
| `status` | String | PENDING/APPROVED/REJECTED/CANCELLED |
| `admin_memo` | String | 운영자 메모 |
| `processed_at` | DateTime | 처리 일시 |
| `processed_by` | Integer | 처리 운영자 ID |

---

## 7. 외부 랭킹 입금 (External Ranking Deposit) 구조

### 7-1) 테이블 구조

#### ExternalRankingData (유저별 누적)

| 컬럼 | 용도 | 비고 |
| --- | --- | --- |
| `user_id` | FK (UNIQUE) | 유저당 1개 |
| `deposit_amount` | 누적 입금액 | 외부 시스템에서 캡처 |
| `play_count` | 누적 플레이 수 | 랭킹 계산용 |
| `deposit_remainder` | 입금 잔여분 | 언락 계산용 |
| `daily_base_deposit` | 일 기준 입금 | 리셋 기준 |
| `daily_base_play` | 일 기준 플레이 | 리셋 기준 |
| `last_daily_reset` | 마지막 리셋일 | KST 날짜 |

#### ExternalRankingDailyDepositDelta (일별 변동)

| 컬럼 | 용도 |
| --- | --- |
| `user_id` | FK |
| `kst_date` | KST 날짜 |
| `deposit_delta` | 당일 입금 변동액 |

### 7-2) Vault와의 연결 (VIP Unlock)

```
┌─────────────────────────────────────────────────────────────────────┐
│ External Ranking 입금 증가 시그널                                    │
│    → VaultService.handle_deposit_increase_signal()                   │
│    → User.total_charge_amount = new_amount (누적 충전액 갱신)         │
│    → VIP 조건 판단에 사용                                            │
└─────────────────────────────────────────────────────────────────────┘
```

**Phase 3 변경사항** (vault_service.py L459-462):

```python
# Phase 3 (Single-SoT rollout): stop writing cash_balance from "unlock" flows.
# For now, deposit signals only update total_charge_amount; unlock semantics will be
# redefined via eligibility/withdraw rules rather than balance transfers.
```

### 7-3) Admin API 엔드포인트

| 엔드포인트 | 기능 |
| --- | --- |
| `GET /admin/api/external-ranking/` | 전체 목록 조회 |
| `POST /admin/api/external-ranking/` | 대량 Upsert |
| `PUT /admin/api/external-ranking/{user_id}` | 개별 업데이트 |
| `PUT /admin/api/external-ranking/by-identifier/{id}` | 식별자 기반 업데이트 |
| `DELETE /admin/api/external-ranking/{user_id}` | 삭제 |

### 7-4) SoT 연결 요약

| SoT | 테이블 | 연결 |
| --- | --- | --- |
| 외부 입금액 | `external_ranking_data.deposit_amount` | 외부 시스템 캡처 |
| 누적 충전액 | `user.total_charge_amount` | deposit signal로 갱신 |
| VIP 조건 | `user.total_charge_amount` | Vault eligibility에 사용 |
| 일별 델타 | `external_ranking_daily_deposit_delta` | KPI 대시보드용 |

---

## 8. Critical Issues 추가

### 🔴 CRITICAL-003: 출금 잔액 반영 타이밍

**상태**: ✅ 완료 (UI 분리/테스트 통과)

**현황**: 출금 요청 시 잔액 차감 없이 PENDING 상태로만 예약

**문제점**:

- 유저는 "출금 신청했는데 왜 안 빠졌지?" 혼란
- 10,000 단위로 여러 건 처리 시 모두 PENDING으로 쌓임
- 만료 처리(expire_now)를 강제로 하지 않으면 UI상 잔액 미반영

**권장 조치**:

1. UI에 "예약된 금액"과 "출금 가능 금액" 분리 표시
2. 또는 요청 시점에 즉시 차감 + 거절 시 환불 로직

### 🟠 HIGH-003: External Ranking → Vault 연결 문서화 부재

**상태**: ♻️ 부분완료 (ER-LOG-001~003 검증 완료, ⚠️ ER-LOG-004 미실행)

**현황**: deposit_amount 증가 시 VaultService를 호출하는 트리거가 어디서 발생하는지 명확하지 않음

**리스크**: 입금이 인식되지 않아 VIP unlock이 안 되는 상황 발생 가능

**권장**: 입금 신호 흐름도 문서화 (외부시스템 → API → VaultService)

---

## 9. 권장 조치 요약 (확장)

| 우선순위 | ID | 조치 내용 | 예상 작업량 |
| --- | --- | --- | --- |
| 🔴 1 | CRITICAL-003 | 출금 예약액 UI 분리 표시 | ✅ 완료 |
| 🟠 2 | HIGH-003 | External Ranking 입금 흐름 문서화/로그 | ✅ 로그 추가·ER-LOG-001~003 검증 완료, ⚠️ ER-LOG-004 미실행 |
| 🟡 3 | MEDIUM-001 | vault_balance 폐기 또는 동기화 | ✅ 미러 정책 통일 완료 |
| 🟡 4 | MEDIUM-002 | Vault2 활성화 계획 문서화 | ⏳ 미해결 |
| 🟢 5 | LOW-001 | 레거시 라우터 폐기 일정 협의 | ⏳ 미해결 |

---

## 10. 검증 시나리오 추가

### D. 출금 시나리오

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| WD-001 | 10,000 출금 요청 | PENDING 생성, reserved += 10000 | ☑ (테스트 통과) |
| WD-002 | 당일 미입금 시 출금 | `DEPOSIT_REQUIRED_TODAY` 오류 | ☑ (테스트 통과) |
| WD-003 | APPROVE 처리 | vault_locked_balance -= amount | ☑ (테스트 통과) |
| WD-004 | REJECT 처리 | 잔액 변화 없음, reserved 해제 | ☑ (테스트 통과) |
| WD-005 | 잔액 부족 시 APPROVE | `INSUFFICIENT_FUNDS` 오류 | ☑ (테스트 통과) |

### E. External Ranking 시나리오

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| ER-001 | 입금액 업데이트 | deposit_amount 증가 + total_charge_amount 갱신 | ☑ (테스트 통과) |
| ER-002 | 일별 델타 기록 | kst_date별 deposit_delta 저장 | ☑ (테스트 통과) |
| ER-003 | 식별자 기반 업데이트 | external_id/nickname/username으로 조회 후 업데이트 | ☑ (테스트 통과) |

### F. External Ranking → Vault 관측(로그) 시나리오 (HIGH-003)

| ID | 시나리오 | 기대 동작(관측 포인트) | 체크 |
| --- | --- | --- | --- |
| ER-LOG-001 | 입금 증가 발생 | 서버 로그에 `external_ranking deposit increased`가 남고 `user_id/prev/new/delta`가 포함 | ☑ (로그 캡처) |
| ER-LOG-002 | Vault 시그널 디스패치 | 서버 로그에 `external_ranking -> vault signal dispatched`가 남음 | ☑ (로그 캡처) |
| ER-LOG-003 | Vault 시그널 적용 | 서버 로그에 `vault deposit signal applied`가 남고 `total_charge_amount=new`가 포함 | ☑ (로그 캡처) |
| ER-LOG-004 | 예외 케이스(eligibility false 등) | 서버 로그에 `vault deposit signal ignored (...)`가 남아 원인 추적 가능 | ☐ (미실행) |
※ 로그 캡처: 인메모리 DB 시나리오 실행 후 INFO 로그 확인 (ER-LOG-001~003 통과, ER-LOG-004는 예외 케이스 미실행)

### G. vault_balance 미러 정합성 시나리오 (MEDIUM-001)

| ID | 시나리오 | 기대 동작 | 체크 |
| --- | --- | --- | --- |
| VB-001 | Vault2에서 balance set(관리자 절대값 세팅) | `user.vault_balance == user.vault_locked_balance`로 유지(레거시 미러는 locked만 반영) | ☑ (테스트 통과) |
| VB-002 | Vault2에서 balance update(관리자 증감/조정) | `user.vault_balance`가 `locked+available`로 변하지 않고 locked 미러로 유지 | ☑ (테스트 통과) |
| VB-003 | v1 `/api/vault/status` 조회 | 응답의 `vault_amount_total(locked)`와 레거시 `vault_balance`가 의미 충돌 없이 운영 가능(레거시 미러는 locked 기준) | ☑ (테스트 통과) |

### H. 섹션별 통합 테스트 커버리지 (신규)

| 감사 섹션 | 커버 테스트 | 목적 |
| --- | --- | --- |
| Vault 상태/식별자 조회 | `tests/test_phase2_audit_coverage.py::test_admin_vault_state_by_id_and_identifier` | admin vault 조회/식별자 경로 응답 구조 검증 |
| Game Tokens 관리자 흐름 | `tests/test_phase2_audit_coverage.py::test_admin_game_tokens_grant_revoke_and_ledger` | grant/revoke + ledger 노출 검증 |
| Economy Stats | `tests/test_phase2_audit_coverage.py::test_admin_economy_stats_from_inventory_and_idempotency` | inventory ledger + idempotency 집계 응답 검증 |
| External Ranking ↔ Vault | `tests/test_external_ranking_charge_hook.py`, `tests/test_external_ranking_deposit_steps.py` | 입금 증가/단계 기반 훅 처리 검증 |
| Withdraw 예약/가용 | `tests/test_vault_withdraw_reserved_flow.py` | PENDING→APPROVE/REJECT 흐름 + reserved 계산 검증 |
| Vault2 Scaffold | `tests/test_vault2_scaffold.py` | scaffold 테이블 상태 보존 검증 |
| Vault 추천액션 | `tests/test_vault_status_recommended_action.py` | 추천 액션 응답 검증 |

---

## 11. 진행도 업데이트 (2026-01-12)

### A. 완료(코드 반영)

- ✅ **CRITICAL-003(출금 예약액 UI 분리 표시)**: 유저 금고 화면에서 `총 보관금 / 출금 가능 / 예약됨` 3분리 표시 적용
    - 적용 파일(Frontend)
        - `src/components/vault/VaultMainPanel.tsx`
        - `src/components/vault/VaultPageCompact.tsx`
    - 기대 효과
        - 출금 요청(PENDING) 이후에도 총 보관금(locked)과 출금 가능(available)의 차이를 사용자가 즉시 인지 가능
        - 예약(reserved) 금액이 명시되어 “출금 신청했는데 왜 안 빠졌지?” 혼선 완화

- ✅ **HIGH-003(External Ranking → Vault 연결 가시성/관측 강화)**: 입금 증가 감지 및 Vault 시그널 처리에 INFO 로그 추가
    - 적용 파일(Backend)
        - `app/services/admin_external_ranking_service.py`
        - `app/services/vault_service.py`
    - 기대 효과
        - 입금 증가(prev/new/delta) 및 시그널 처리 여부를 서버 로그로 추적 가능

- ✅ **MEDIUM-001(vault_balance 레거시 미러 정책 정리)**: `user.vault_balance`를 `vault_locked_balance` 미러로 단일화
    - 적용 파일(Backend)
        - `app/services/vault2_service.py`
    - 기대 효과
        - Vault2 경로에서 `locked+available`로 쓰이던 미러 정의 충돌 제거

### B. 남은 작업(다음 액션 후보)

- 🟡 **(후속) External Ranking 운영 화면/지표 보강**
    - 현재는 로그 기반 추적까지 반영됨(추가로 admin dashboard/metric 노출은 범위 확장 필요)

### C. 검증 실행 결과 (2026-01-12)

#### 1) DB 마이그레이션 (Docker backend)

- `alembic current`: `20260110_1200_ext_rank_delta (head)`
- `alembic upgrade head`: 변경사항 없음(이미 head)

#### 2) 자동 테스트 (Local)

- 실행 커맨드:

```bash
python -m pytest -q \
    tests/test_phase2_audit_coverage.py \
    tests/test_external_ranking_charge_hook.py \
    tests/test_external_ranking_deposit_steps.py \
    tests/test_vault_withdraw_reserved_flow.py \
    tests/test_vault2_scaffold.py \
    tests/test_vault_status_recommended_action.py
```

- 결과: **12 passed**, warnings **14** (Pydantic v2 / FastAPI lifespan 관련 deprecation warnings)

**업데이트**: 2026-01-12 KST  
**다음 단계**: HIGH-003 / MEDIUM-001 실제 코드 정리 또는 3단계 감사(보상/미션/시즌)
