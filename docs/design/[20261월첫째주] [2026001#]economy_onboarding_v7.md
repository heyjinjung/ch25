# 2026 Economy Onboarding v7 (스캔 결과 + 실행/검증 플랜)

> 목적: 
> - 현재 레포의 **실제 구현(코드)** 기준으로 경제/보상 흐름을 확정하고,
> - "다이아=인벤토리(교환권 경로)"로 전환하기 위한 **실행 플랜**과 **검증 플랜**을 문서화한다.
>
> 날짜: 2026-01-01

---

## 고정 레퍼런스 (v5 / v6)

- v5: 데일리 미션 시스템: [docs/design/2026!!daily_mission_system_ko_v5.md](docs/design/2026!!daily_mission_system_ko_v5.md)
- v6: 통합 경제/성장 마스터: [docs/design/2026!!unified_economy_and_progression_ko.md](docs/design/2026!!unified_economy_and_progression_ko.md)

추가 설계(인벤/바우처 v1):
- [docs/design/2026!!inventory_voucher_system_ko.md](docs/design/2026!!inventory_voucher_system_ko.md)

추가 트러블슈팅/QA 리포트:
- [docs/changelog/20260101_bugfixes_and_qa.md](docs/changelog/20260101_bugfixes_and_qa.md)

---

## 0) TL;DR (이번 v7에서 확정하는 운영 규칙)

- **다이아(DIAMOND)는 지갑이 아니라 인벤토리 SoT로 운영한다.**
  - 미션 보상도, 상점 결제도 인벤토리 DIAMOND를 기준으로 한다.
- **상점 1차 상품은 키 교환권(바우처)**: 구매 시 즉시 키 지급이 아니라 "교환권 적립 → 사용 시 키(지갑) 지급".
- **텔레그램 인증 기반이라 로컬/브라우저 유저 테스트가 막혀있다.**
  - 원인은 서버만이 아니라, 프론트 라우팅 가드가 텔레그램 initData 없으면 앱 진입을 막는 구조.
- **POINT(포인트)는 2종류로 분리해서 이해해야 한다.**
  - (A) 게임 세그먼트의 `reward_type="POINT"`는 기본적으로 **게임 보상 메타**로 처리되며, 환경 설정에 따라 XP로 변환될 수도/아무것도 안 할 수도 있다.
  - (B) Vault 적립(잠금 금고) 자체는 별도의 ledger/event로 관리되며, "POINT" 문자열과 별개다.

---

## 1) 현재 구현 스캔 결과 (코드 기준 팩트)

### 1.1 인벤토리/상점(바우처) 구현

- 인벤/상점 라우트: [app/api/routes/inventory_shop.py](app/api/routes/inventory_shop.py)
  - `GET /api/inventory`
  - `POST /api/inventory/use`
  - `GET /api/shop/products`
  - `POST /api/shop/purchase`
- 인벤 서비스(수량형 아이템 + ledger): [app/services/inventory_service.py](app/services/inventory_service.py)
  - `grant_item()` / `consume_item()` / `use_voucher()`
- 상점 서비스(하드코딩 상품): [app/services/shop_service.py](app/services/shop_service.py)
  - `InventoryService.consume_item(... item_type="DIAMOND" ...)`로 **인벤 DIAMOND 차감(SoT)**
  - `InventoryService.grant_item(... VOUCHER_... ...)`로 **교환권 인벤 적립**

현재 상태 요약:
- "교환권 적립/사용"의 큰 구조는 존재하나,
- 현재 구현은 **결제 소스가 인벤 DIAMOND(SoT)**로 정렬되어 있음.

### 1.2 텔레그램 인증이 유저 테스트를 막는 지점

- 프론트 라우팅 가드: [src/components/routing/RequireAuth.tsx](src/components/routing/RequireAuth.tsx)
  - 토큰이 없고 `initData`도 없으면, 텔레그램 접속 CTA만 렌더링
  - 즉, 로컬 브라우저에서 일반 로그인(/login)로 테스트하려면 진입 자체가 어려움
- 텔레그램 initData 공급자: [src/providers/TelegramProvider.tsx](src/providers/TelegramProvider.tsx)
  - Telegram WebApp 환경이 아니면 `initData=''`
- 서버 텔레그램 인증 엔드포인트(sole entry point): [app/api/routes/telegram.py](app/api/routes/telegram.py)
  - `POST /api/telegram/auth`
  - `initData` 검증 후 `telegram_id` 기준으로 유저 생성/링크 후 JWT 발급

### 1.3 “게임 → Vault 적립”의 실동작

- 룰렛: [app/services/roulette_service.py](app/services/roulette_service.py)
- 주사위: [app/services/dice_service.py](app/services/dice_service.py)
- Vault 적립(Phase 1 locked SoT): [app/services/vault_service.py](app/services/vault_service.py)
  - `record_game_play_earn_event()`
  - `record_trial_result_earn_event()`

중요 팩트:
- **룰렛 플레이는 (조건/플래그 충족 시) Vault locked에 +200 또는 -50이 별도로 적립**된다.
  - coin 룰렛도 기본적으로 Vault 적립이 발생한다(키 룰렛만이 아님).
- **키(골드/다이아) 관련 룰렛은 reward를 Vault로 “강제 라우팅”하는 특수 처리**가 있다.
  - 키 티켓으로 룰렛을 돌려 POINT를 얻으면 RewardService로 XP/현금 지급하지 않고 Vault 적립으로 강제.

키(골드/다이아) 룰렛에서 “세그먼트 보상이 POINT일 때 금고 누적” 증거(핵심 라인):
- 조건 분기(키 티켓 + POINT + reward_amount>0)에서 `record_trial_result_earn_event(..., force_enable=True)` 호출: [app/services/roulette_service.py](app/services/roulette_service.py#L239-L253)
- 동일 케이스에서 RewardService 지급을 `pass`로 스킵(=XP/현금으로 새지 않게 차단): [app/services/roulette_service.py](app/services/roulette_service.py#L271-L283)
- VaultService는 `force_enable=True`이면 전역 설정(`enable_trial_payout_to_vault`)과 무관하게 진행: [app/services/vault_service.py](app/services/vault_service.py#L625-L626)
- Trial earn event에서 `reward_type == POINT`는 `amount = reward_amount`로 1:1 평가: [app/services/vault_service.py](app/services/vault_service.py#L646-L651)
- 평가된 amount가 있으면 `user.vault_locked_balance`에 더해 실제 누적: [app/services/vault_service.py](app/services/vault_service.py#L692)

---

## 2) 통화/보상 맵 (티켓/Xp/다이아/키/포인트/Vault)

### 2.1 자산/재화 유형 정의

- **Ticket(게임 입장권/연료)**: 지갑 SoT (`user_game_wallet`)
  - `ROULETTE_COIN`, `DICE_TOKEN`, `LOTTERY_TICKET` 등
- **Key(고가 입장권/전환 재화)**: 지갑 SoT (`user_game_wallet`)
  - `GOLD_KEY`, `DIAMOND_KEY`
  - 참고: Ticket Zero 대응(`TRIAL_GRANT`)은 **티켓 3종만** 대상이며, 키는 trial-grant로 지급되지 않음(일일 총 3장 상한 적용).
- **Diamond(상점 결제 재화)**: (v7 목표) 인벤토리 SoT (`user_inventory_item`)
  - item_type 예: `DIAMOND` 또는 `CURRENCY_DIAMOND`(명칭은 구현 시 확정)
- **Voucher(교환권 아이템)**: 인벤토리 SoT (`user_inventory_item`)
  - `VOUCHER_GOLD_KEY_1` (사용 시 `GOLD_KEY +1`)
  - `VOUCHER_DIAMOND_KEY_1` (사용 시 `DIAMOND_KEY +1`)
- **Vault Locked Balance(잠금 금고)**: 사용자 자산(현금성) SoT (`user.vault_locked_balance`)
  - 이벤트 로그: `vault_earn_event` (idempotent)
- **Cash Balance(현금/포인트 잔액)**: `user.cash_balance` + `UserCashLedger`
  - RewardService의 `grant_point()`는 cash_balance를 올림(게임 외 지급 등)

### 2.2 “POINT”가 헷갈리는 이유 (명확히 분리)

- A) 게임 세그먼트의 `reward_type="POINT"`
  - RewardService.deliver()에서 meta.reason이 `roulette_spin/dice_play/lottery_play`이면 **"게임 보상"**으로 취급
  - 설정 `xp_from_game_reward`가 켜진 경우에만 시즌 XP로 변환될 수 있음
  - 설정이 꺼져 있으면(= v5/v6의 Strict Rule 권장) **아무것도 지급하지 않을 수 있음**

- B) Vault 적립(잠금 금고)
  - 룰렛/주사위 플레이마다 `record_game_play_earn_event()`로 locked가 변함(플래그/eligible 조건)
  - 키 관련 룰렛은 `record_trial_result_earn_event()`로 reward_amount를 Vault로 강제 적립(설정과 무관하게 force_enable)

결론:
- UI/로그에서 "POINT" 문자열이 보이더라도, 그것이 곧바로 현금/금고를 의미하지 않는다.
- **Vault 적립은 Vault ledger/event를 기준으로만 판단**한다.

### 2.3 질문: “골드/다이아 룰렛에서만 금고 누적?”

아니오(현재 코드 기준).

**근거(코드 증거): 코인 룰렛 경로도 Vault 적립 함수를 호출한다**
- 룰렛 `play()`의 기본 ticket_type은 `ROULETTE_COIN`이다: [app/services/roulette_service.py](app/services/roulette_service.py#L120-L170)
- 룰렛 플레이는 로그를 남긴 직후, ticket_type(=코인/키 구분 무관)으로 `record_game_play_earn_event()`를 호출한다: [app/services/roulette_service.py](app/services/roulette_service.py#L150-L205)
- 이 적립은 VaultService 내부에서 feature flag + eligible guard가 통과될 때만 실제로 반영된다(guard 실패 시 0 반환): [app/services/vault_service.py](app/services/vault_service.py#L440-L510)

**근거(코드 증거): 룰렛의 +200/-50 계산은 VaultService에서 payout_raw를 보고 결정한다**
- ROULETTE의 경우 `payout_raw.reward_amount == 0`을 LOSE로 보고 -50, 그 외는 +200을 기본값으로 사용한다: [app/services/vault_service.py](app/services/vault_service.py#L510-L560)

**추가 근거: 키 룰렛은 ‘추가로’ Vault 강제 라우팅(trial earn event)이 붙는다**
- (A) 룰렛 보상 자체가 KEY인 경우, POINT로 마스킹하여 Vault로 강제 적립: [app/services/roulette_service.py](app/services/roulette_service.py#L205-L235)
- (B) 사용 티켓이 KEY이고 보상이 POINT인 경우에도 Vault로 강제 적립(Trial earn event): [app/services/roulette_service.py](app/services/roulette_service.py#L205-L235)

---

## 3) 실행 플랜 (경제 구조를 유기적으로 성립시키기)

### Phase 1 — “테스트 가능 상태” 만들기 (텔레그램 인증 병목 해소)

목표: 로컬/QA에서 유저 테스트가 막히지 않게 하되, 프로덕션 보안은 유지.

- 프론트 `RequireAuth`에 "로컬/QA 전용 우회" 플래그 도입
  - 예: `VITE_ALLOW_NON_TELEGRAM_LOGIN=true`일 때 initData가 없어도 `/login`을 허용
  - 프로덕션에서는 기본 false
- 테스트 계정 시드 + `/api/auth/token` 기반 로그인로 QA 루프 실행

### Phase 2 — “다이아=인벤”으로 SoT 전환

목표: 미션/상점 모두 DIAMOND를 인벤에서 관리.

- 미션 보상 지급 경로를 인벤으로 변경(지갑 DIAMOND 사용 중지) ✅
- 상점 구매의 cost를 인벤 DIAMOND 차감으로 변경
- API 응답/프론트 표시는 "인벤 DIAMOND"를 단일 SoT로 사용

### Phase 3 — 원자성/멱등성/동시성 강화(핵심 로직 미흡 보완)

- 구매/사용 API에 `Idempotency-Key` 지원(중복 클릭/재시도 방지)
- `user_inventory_item`의 `(user_id, item_type)` UNIQUE + 락/업서트 정책 확정
- `inventory_shop` payload를 Pydantic schema로 고정(dict payload 제거)

---

## 4) 검증 플랜 ("유기적으로 돈다"를 증명하는 방법)

### 4.1 통합 시나리오(최우선)

1) 미션 완료 → DIAMOND(인벤) +N
2) 상점 구매(키 교환권) → DIAMOND(인벤) -30, VOUCHER +1
3) 교환권 사용 → VOUCHER -1, GOLD_KEY(지갑) +1
4) 골드키 룰렛 플레이 → Vault locked 변동 + (키 특수 라우팅 시 추가 Vault 적립)

### 4.2 멱등성 테스트

- 같은 `Idempotency-Key`로 구매 2회 → 1회만 반영
- 같은 `Idempotency-Key`로 사용 2회 → 1회만 반영

### 4.3 동시성/레이스 테스트

- DIAMOND 30에서 구매를 동시에 2회 → 1회 성공, 1회 실패(0 미만 금지)
- 교환권 1개에서 사용을 동시에 2회 → 1회 성공, 1회 실패

### 4.4 운영 체크리스트 (QA 문서 기반 재발 방지)

- 라우터 prefix(`/api`) 누락 재발 방지(404/502 연쇄 방지)
- seed/기본 데이터 유실 방지(룰렛 segment 0개 → 무한 로딩)
- "알림 실패가 트랜잭션을 막지 않음" 패턴 유지(try/except)

---

## 5) 다음 작업 제안(우선순위)

- 1순위: 로컬/QA에서 테스트 막는 인증 가드 우회 플래그 구현
- 2순위: DIAMOND를 인벤 SoT로 전환(미션/상점)
- 3순위: 구매/사용 멱등성 + 인벤 동시성 안전 강화

0) 시작 전 공통 체크(10분)

목표 1개만 확정: “로컬 브라우저에서 로그인→게임/미션→상점→룰렛까지 E2E가 끊기지 않는다”
현재 차단 지점 확인: RequireAuth가 initData 없으면 막는지 확인: RequireAuth.tsx
백엔드 외부 로그인 엔드포인트 존재 확인: auth.py
1) 1순위: 로컬/QA 비-텔레그램 로그인 허용(오늘 바로)

해야 할 일(프론트)
VITE_ALLOW_NON_TELEGRAM_LOGIN=true 같은 플래그를 읽어서,
initData가 없어도 /login(또는 특정 route) 진입만큼은 허용
Prod 빌드에서는 기본 false 유지
체크리스트(완료 기준)
로컬 브라우저에서 텔레그램이 아니어도 로그인 화면 접근 가능
로그인 후 보호 라우트 진입 가능(무한 리다이렉트/텔레그램 CTA 안 뜸)
플래그 OFF면 기존처럼 텔레그램만 허용(회귀 없음)
관련 파일
RequireAuth.tsx
TelegramProvider.tsx
2) 2순위: QA용 계정/토큰 발급 루프 확정(오늘)

해야 할 일(백엔드/운영)
/api/auth/token이 “존재하는 계정”에 대해 토큰을 발급하므로, QA 계정이 DB에 있어야 함
최소 1개 테스트 계정(외부 로그인용)을 seed/수동 생성
체크리스트(완료 기준)
QA 계정으로 토큰 발급 성공
프론트에서 토큰 저장 후 API 호출 정상(401 반복 없음)
3) 3순위: “통화 맵” E2E 검증 시나리오(내일 전까지)

시나리오 A: 바우처 기반 상점 루프(현재 구현 확인) = 완료 및 Phase 2 (다이아를 인벤토리 자산으로 완전 전환) 단계로 진입 
(1) 다이아 확보 → (2) 상점 구매(바우처) → (3) 인벤에서 바우처 사용 → (4) 지갑에 키 증가
체크리스트(완료 기준)
상점 구매 1회당: 다이아 -30, 바우처 +1이 원자적으로 같이 반영
바우처 사용 1회당: 바우처 -1, GOLD_KEY +1이 원자적으로 같이 반영
중복 클릭 시(2번 연속 요청) 데이터가 2번 반영되는 문제 재현 여부 기록(멱등성 전 단계라 “발견”이 목적)

4) 4순위: “키 룰렛 POINT → Vault 누적” 검증(내일 전까지)

목표: “키 티켓으로 돌렸고 세그먼트가 POINT면 Vault locked가 증가한다”를 데이터로 확인
체크리스트(완료 기준)
키 티켓으로 룰렛 1회 실행
결과가 POINT이고 amount>0인 케이스에서 vault_locked_balance가 증가
RewardService가 POINT를 XP/현금으로 지급하지 않고 스킵되는 흐름 확인(코드상 pass):

✅ 검증 결과(실측): 완료

- 키 티켓(GOLD_KEY)로 룰렛 1회 실행에서 `reward=POINT`, `amount=20000` 발생
- Vault 상태 스냅샷(before/after)에서 `locked_balance`가 **+20200** 증가 확인
- 동일 케이스에서 RewardService 지급은 `pass`로 스킵되는 흐름 확인

증거(코드)
- 키 티켓 + POINT + reward_amount>0 → Vault 강제 적립(trial earn event, force_enable=True): [app/services/roulette_service.py](app/services/roulette_service.py#L239-L253)
- 동일 케이스에서 RewardService 전달 스킵(`pass`): [app/services/roulette_service.py](app/services/roulette_service.py#L272-L283)

증거(데이터: 샘플 출력)

```text
VAULT_BEFORE locked_balance=105200
SPIN#1 reward=POINT amount=20000 vault_earn=20200 locked_before=105200 locked_after=125400
```

해석
- reward POINT(20,000)이 Vault locked에 1:1이 아니라 **20,200**으로 반영됨(적립 배율/보정 포함)
5) 5순위: “다이아=인벤 SoT 전환” 착수(유저 테스트 루프 안정화 후)

이유: 지금은 테스트가 막혀있어서, 다이아 SoT를 옮기기 전에 E2E 루프가 먼저 돌아야 함
체크리스트(완료 기준)
미션 보상 다이아가 인벤으로 들어오고, 상점 결제도 인벤 다이아를 깎음
지갑 DIAMOND 의존 제거(또는 최소화) ✅
원하시면, 제가 바로 1순위(RequireAuth 플래그)를 실제 코드로 적용해서 PR-ready 상태로 만들어둘게요. 그때 플래그 이름(VITE_ALLOW_NON_TELEGRAM_LOGIN)이랑 “허용 범위(로그인 페이지만 vs 전체 앱)”만 1줄로 확정해주시면 됩니다.