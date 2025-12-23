# Vault(금고) 통합 설계서 — Phase 1 Reset + 기존유저 전략 + 적립 단위(50판 황금선)

- 문서 타입: 통합(정책 + UX 흐름 + 상태머신 + BE/FE/DB 맵핑)
- 버전: v2.1
- 작성일: 2025-12-23
- 대상 독자: 기획자, 백엔드/프론트엔드 개발자
- 스코프: Phase 1(Reset) + Phase 2 확장 가드레일(Protect)까지

통합 대상(레거시 문서)
- `docs/05_modules/05_module_vault_master_reset_phase1.md`
- `docs/05_modules/05_module_vault_existing_user_strategy_v2.0.md`

운영 원칙
- 앞으로 Phase 1/2 정책/상태머신/용어는 본 문서를 단일 기준(source of truth)으로 사용한다.

---

## 0) TL;DR

이 문서는 기존에 분리되어 있던 두 문서의 목적을 하나로 통합한다.

- (기술 기준선) Phase 1 Reset: `locked → available → expired` + locked 24h 만료 + ticket=0에서 Vault Modal/CTA로 유도
- (리텐션 철학) 기존유저용 Vault: “보너스 이벤트”가 아니라 “내가 이미 벌어둔 자산이 잠겨 있다”는 Lock-in 자산
- (핵심 추가) Phase 1 적립 단위를 게임 플레이(비용 소모 + 결과 확정) 기반으로 정의한다.
  - 50판 기준 locked 누적이 11,000~14,000원(황금선)으로 수렴하도록 단위를 설계한다.

---

## 1) 핵심 철학(Existing User Strategy 요약)

### 1.1 Activity Lock Vault
- 정의: 유저의 활동(플레이/출석/팀 기여)을 화폐 가치로 환산하여 금고(locked)에 “가둔다”.
- 심리: “충전하면 드림”이 아니라 “이미 벌어둔 자산이 묶여있다”.
- 목적: 티켓 소진/이탈 직전에 ‘손해’를 인지시키고 잔존/복귀 행동을 만든다.

### 1.2 Phase 1의 UI 톤
- 금고는 ‘즉시 보상’이 아니라 ‘락인 자산’ 역할 고정

권장 운영 원칙
- 소액 잭팟/특수 결과는 보유머니(즉시)로만 지급하고, 금고 적립에는 섞지 않는다.

### 1.3 기존유저 Vault 생성 트리거(Activation) — 로드맵

기존유저(Active/Dormant)에게 Vault는 “가입 즉시 지급”이 아니라 특정 활동/정산 시점에 생성되는 것이 자연스럽다.

- 시즌 패스 레벨 3 도달
- 팀 배틀 3회 이상 참여
- 최근 7일 내 게임 5판 이상 플레이
- 티켓 소진(0개) + 이탈 징후 감지

정리
- Phase 1: 트리거를 단순화(예: “플레이 결과 확정 시 locked 적립” + ticket=0에서 강제 노출)
- Phase 2/3: 세그먼트/행동 기반 트리거로 확장(VIP/일반/복귀)

### 1.4 기존유저 전용 3단 구조(골드/플래티넘/다이아) — Phase 3 확장안

기존유저 전략의 “골드/플래티넘/다이아”는 Phase 1의 상태머신(locked/available/expired)을 깨지 않고도 UI/정책 레이어로 올릴 수 있다.

- [골드] 정산 완료된 내 돈
  - 성격: 미션/조건 없음, 자동 적립
  - UI: 정산 내역서 형태(산정 기준 표시)

- [플래티넘] 여기서 멈추면 손해
  - 성격: 실질적인 과금/리텐션 유도 구간
  - 해금 조건(예시): 단일 50,000원 충전 + 출석 2일 추가
  - 소멸 정책(예시): 72h
  - 카피: “충전하면 드림”이 아니라 “조건 안 맞추면 사라짐”

- [다이아] 성장 앵커
  - 성격: 장기 목표(진행률 % 중심)
  - 누적 활동(충전/플레이)로 게이지가 참

Phase 관계
- Phase 1: 24h 만료 + 단위 적립으로 ‘락인 자산’ 감각을 먼저 만든다.
- Phase 2: PROTECT(연장/보호)로 ‘지키는 행동’을 추가한다.
- Phase 3: 3단 구조를 program/UI 레이어로 올려 장기 리텐션(정산/성장)을 표현한다.

---

## 2) Phase 1 용어(기준)

- Locked: 금고에 적립되었으나 즉시 사용 불가(만료 대상)
- Available: 잠김이 풀려 즉시 사용 가능(Phase 1에서는 실제 경제가 cash 지급을 유지할 수 있음)
- Expired: 24시간 만료로 소멸(잠긴 잔액만)
- expires_at: locked 만료 시각(Phase 1에서는 “다음 만료 시각 1개”로 시작)
- recommended_action: ticket=0 등 상황에서 프론트가 수행해야 하는 권장 행동(예: `OPEN_VAULT_MODAL`)

Phase 1 단일 기준(중요)
- 계산/쓰기 기준은 `user.vault_locked_balance`(source of truth)
- `user.vault_balance`는 레거시 UI 호환용 read-only mirror

---

## 3) 현재 레포 구현 스냅샷(2025-12-23)

> 이 섹션은 Phase 1 Reset 문서의 “현재 구현”을 통합본에 요약 이관한 것이다.

### 3.1 DB
- `app/models/user.py`
  - `vault_locked_balance` (Phase 1 단일 기준)
  - `vault_balance` (mirror)
  - `vault_available_balance` (Phase 2/3 확장용; 현재 v1 경제에서는 실사용 안 함)
  - `vault_locked_expires_at` (locked 만료 시각)
  - `cash_balance`, `vault_fill_used_at`

- `app/models/vault2.py` (스캐폴딩/관측 확장)
  - `vault_program`, `vault_status`
  - `unlock_rules_json` 등 룰 기반 UI 표시용 필드 확장됨

### 3.2 API
- Public
  - `GET /api/vault/status`
    - `locked_balance`, `available_balance`, `expires_at`, `recommended_action`, `cta_payload`
    - (옵션) `program_key`, `unlock_rules_json`
  - `POST /api/vault/fill` (eligible 유저 1회 무료 fill)
  - `GET /api/ui-copy/ticket0` (ticket=0 모달 운영 카피)

- Admin
  - `POST /admin/api/vault2/tick?limit=500` (Vault2 전이 helper)
  - `PUT /api/admin/ui-copy/ticket0` (운영 카피 갱신)

### 3.3 서비스
- `VaultService.get_status()`: status 조회로 자동 시드하지 않음
- `VaultService.fill_free_once()`: 1회 제한 + 시드 보장 로직 포함
- `VaultService.handle_deposit_increase_signal()`: deposit delta 기반 해금 계산/적용(locked 감소 + cash 지급)
- `AdminExternalRankingService.upsert_many()`: deposit 증가 감지 → VaultService에 위임

### 3.4 프론트 UI 접점
- `src/api/vaultApi.ts:getVaultStatus()`
- `src/pages/HomePage.tsx` (상단 배너)
- `src/components/game/TicketZeroPanel.tsx` (ticket=0 패널)
- `src/components/vault/VaultModal.tsx` (ticket0 카피 fetch)

---

## 4) ✅ Phase 1 적립 정책(권장): “50판 황금선(11,000~14,000)”

### 4.1 적립 단위(기본)
- 트리거: **비용 소모 + 결과 확정**(ticket/coin spend AND game result finalized)
- 판당 기본 적립(비용 소모 + 결과 발생 시): **200원**
- 패배 추가 적립(lose 보정): **+100원**

권장 운영 원칙
- 금고는 “락인 자산” 역할 고정(예측 가능한 누적/만료/해금)

### 4.2 50판 예시 계산(승패 50:50)
- 기본: 50판 × 200원 = 10,000원
- 패배 보정: 25패 × 100원 = 2,500원
- 결과: locked_balance = **12,500원** (황금선 중앙)

### 4.3 범위 체크(현실적인 승률 편차)
- 패배 40%(20패): 10,000 + 2,000 = 12,000
- 패배 70%(35패): 10,000 + 3,500 = 13,500

=> 대부분 **1.2~1.35만**에 수렴(“버리기 아까움” 구간)

---

## 5) 🧭 Phase 1 유저 다이어그램(인지/전환 흐름)

```mermaid
flowchart TD
  A["게임 입장"] --> B["티켓/코인 소모 + 결과 확정"]
  B -->|"즉시"| C["금고(locked) 누적 카운트업\n카피: 내가 벌어둔 돈"]
  C --> D["티켓 부족/0 도달"]
  D -->|"자동"| E["Vault Modal 오픈\n금고에 12,500원 보관 중\n해결 CTA"]

  E -->|"A"| F["씨씨 이용하기(입금 확인)"]
  F --> G["해금(정책: 일부/전액)\nlocked 감소 + available/cash 증가"]
  G --> H["즉시 플레이 재개"]

  E -->|"B (Phase2부터)"| I["유지/보호 행동"]
  I --> J["expires_at 연장/보호\n이탈 방지"]

  E -->|"미조치"| K["24h 경과"]
  K --> L["locked 만료(expired)"]
  L --> M["다음 접속 시 손실 메시지"]
```

---

## 6) 🔁 상태 머신 요약(단위/트리거 포함)

### 6.1 상태 전이(Phase 1 기준)

```mermaid
stateDiagram-v2
  [*] --> LOCKED : 비용 소모 + 결과 확정\n(기본 +200/판, LOSE +100/패)

  LOCKED --> AVAILABLE : 입금 확인(해금)\n(정책: 일부/전액)
  LOCKED --> EXPIRED : expires_at 도래\nlocked_balance = 0

  AVAILABLE --> [*] : (Phase 1에서는 경제/사용 정책에 따라\n보유머니(cash)로 지급 유지 가능)
```

### 6.2 Phase 1 만료 타이머 규칙(최소/명확)
- 첫 적립 시 expires_at 생성: `now + 24h`
- 추가 적립이 있어도 expires_at은 **갱신하지 않음**
  - 단순/예측 가능
  - Phase 1 의도(“미루면 사라짐”)를 유지
- Phase2부터 “보호/연장(PROTECT)”로만 갱신 가능

---

## 7) ✅ VaultEarnType 정의표(Phase 1/2: EARN + PROTECT)

권장 설계
- category: `EARN | PROTECT`
- phase: `PHASE_1 | PHASE_2 | BOTH`
- amount_policy:
  - `FIXED`: 단위 고정(+200/+100)
  - `RULED`: 룰(JSON) 기반 산출
  - `NONE`: 금액 변화 없음(연장/보호만)

### 7.1 Phase 1 — 비용+결과 기반 적립(EARN)

| VaultEarnType | Category | Phase | 트리거 조건 | 금고 효과(단위) | 비고 |
|---|---|---|---|---|---|
| GAME_PLAY_SPEND_RESULT | EARN | PHASE_1 | 티켓/코인 소모 + 결과 확정 | `+200/판` | “판수=자산” 핵심 |
| GAME_LOSE_BONUS | EARN | PHASE_1 | 결과가 LOSE | `+100/패` | 운 나쁜 날 더 쌓임 |
| TEAM_BATTLE_PLAY_SPEND_RESULT | EARN | PHASE_1 | 팀배틀 참여 + 결과 확정 | `+200/판 (+100/패)` | 단위 통일 |
| TICKET_SPEND_ONLY_BLOCKED | EARN | PHASE_1 | (선택) 소모만 있고 결과 취소/에러 | `+0` | 금지 권장(가치/결과 없음) |

### 7.2 Phase 2 — 유지/보호/연장(PROTECT)

| VaultEarnType | Category | Phase | 트리거 조건 | 금고 효과 | 비고 |
|---|---|---|---|---|---|
| PROTECT_DAILY_LOGIN_STREAK | PROTECT | PHASE_2 | 연속 접속 N일 달성 | `expires_at +24h`(또는 +12h) | “연장” 핵심 |
| PROTECT_DAILY_QUEST_COMPLETE | PROTECT | PHASE_2 | 일일 퀘스트 완료 | `expires_at +12h` | 가벼운 유지 행동 |
| PROTECT_TEAM_BATTLE_ACTIVE | PROTECT | PHASE_2 | 팀배틀 참여 중 + 당일 최소 플레이 | `expires_at +24h` | 팀 이탈 방지 |
| PROTECT_DEPOSIT_CONFIRM | PROTECT | PHASE_2 | 입금 확인 | `locked → available` 전환 | 분류상 PROTECT지만 사실상 회수/해금 |

### 7.3 (선택) Phase 2 — 소량 적립(EARN)

| VaultEarnType | Category | Phase | 트리거 조건 | 금고 효과(예시) | 비고 |
|---|---|---|---|---|---|
| EARN_DAILY_QUEST_SMALL | EARN | PHASE_2 | 일일 퀘스트 완료 | `+300 ~ +700` | 체감용(과도하면 경제 붕괴) |

---

## 8) 구현 가이드(Phase 1에 “게임당 적립”을 넣기 위한 최소 변경)

### 8.1 필요한 성질
- 정확한 트리거: “비용 소모”가 아니라 반드시 “결과 확정”까지 포함
- 중복 방지(idempotency): 같은 게임 결과가 2번 들어와도 2번 적립되지 않도록 이벤트 ID 필요
- 로그/관측: Phase 2/3로 갈수록 earn log가 필요(최소라도 남기는 것을 권장)

### 8.2 최소 변경 권장안
- Vault2(또는 별도 로그)에 `earn_event_id`, `earn_type`, `amount`, `created_at` 기록
- `vault_locked_balance += amount` (source of truth)
- `vault_locked_expires_at`는 첫 적립 시에만 세팅(Phase 1 규칙)

---

## 9) 정책-카피-코드 일치(중요)

- 홈 배너/티켓0 패널/모달 카피에서 반드시 한 줄 고정:
  - “다음 해금 조건: ___ 하면 ___원 해금”
- `GET /api/vault/status`의 `unlock_rules_json`을 사용해 프론트 하드코딩을 제거하는 방향이 안전

---

## 10) 체크리스트(이 문서를 기준으로)

- [ ] Phase 1 적립 훅: “비용 소모 + 결과 확정” 지점에 locked 적립 연결
- [ ] lose 판정 경로에서 +100 보정 추가
- [ ] expires_at 규칙(Phase 1: 갱신 없음) 보장
- [ ] ticket=0에서 `recommended_action=OPEN_VAULT_MODAL` + `cta_payload`로 연결
- [ ] UI 고정 한 줄: “다음 해금 조건” 표시를 룰(JSON) 기반으로 정렬
- [ ] 테스트: 중복 적립 방지 + 만료 + 해금(부분/전액) 시나리오 추가/정리

---

## 11) 오픈 퀘스천(확정 필요)

- “판당 적립”을 어떤 게임들(룰렛/주사위/복권/팀배틀)에 동일 적용할지
- 결과 확정 이벤트의 식별자(게임 로그 ID 등) 확보 방식
- 해금 정책(부분/전액) 룰을 Phase 1에서 고정할지, 즉시 `unlock_rules_json`로 전환할지
