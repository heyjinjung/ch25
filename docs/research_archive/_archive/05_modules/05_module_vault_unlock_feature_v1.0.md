> ARCHIVED / 폐기 (2025-12-23)
>
> - 참고/대체(단일 기준): `docs/05_modules/05_module_vault_master_strategy_phase1_v2.1.md`
> - 원래 경로: `docs/05_modules/05_module_vault_unlock_feature_v1.0.md`

# Vault(금고) 잠금 자산 + 부분 해금 + 소멸/개인화/소셜프루프 — 기술 설계서

- 문서 타입: 모듈(기능: FE+BE+DB)
- 버전: v1.0
- 작성일: 2025-12-17
- 대상 독자: 백엔드/프론트엔드 개발자, QA, 운영

## 0. 목적(비즈니스/심리)
이 기능은 “회사 보너스(Give)”가 아니라 “내가 벌어둔 자산(Take)”이라는 인식을 심어 **입금(=콩)으로 잠긴 자산을 즉시 회수하도록 유도**한다.

핵심 심리 장치
- **분리 적립**: 무료 주사위로 번 금액은 일반 보유금이 아니라 **[잠긴 금고]**에 적립된다.
- **손실 강조**: 금고 적립분은 **24시간 내 회수(해금)하지 않으면 소멸**한다.
- **부분 해금**: “1만 원 넣으면 다 줄게”가 아니라 **입금할 때마다 일부가 즉시 풀리는** 구조를 섞는다.
- **사람 같은 개입**: 1시간 뒤 ‘지민’ 명의 메시지(푸시/톡/인앱)를 통해 개인적으로 챙겨주는 느낌을 시스템화한다.
- **현실 증거**: 실제 해금 이벤트를 근거로 하단 토스트(소셜 프루프)를 노출한다.

본 문서는 현재 코드베이스의 신규회원 주사위([app/services/new_member_dice_service.py](../../app/services/new_member_dice_service.py), [src/pages/NewMemberDicePage.tsx](../../src/pages/NewMemberDicePage.tsx))와 외부입금(upsert) 훅([app/services/admin_external_ranking_service.py](../../app/services/admin_external_ranking_service.py))에 “붙이는” 기준으로 작성한다.

---

## 1. 범위
### 1.1 포함
- 금고 UI(홈 첫 화면): 잠긴 금고 아이콘 + 게이지 바 + “해제까지 10,000원 부족” + 소멸 카운트다운
- 무료 주사위(신규회원) 결과 → 금고로 포인트 적립(실시간 숫자 증가 애니메이션)
- 부분 해금 로직: **1콩(=10,000원) 입금마다 금고 15,000원 즉시 해금**
- 지민 메시지 트리거: 금고 적립 후 앱 종료 → 1시간 후 메시지 예약
- 소셜 프루프 토스트: 최근 실제 해금 이벤트를 하단에 순차 노출

### 1.2 제외(단, 확장 포인트는 제공)
- 실제 카카오/문자 발송 연동(외부 채널 송신)은 범위 밖
  - 대신 1차는 **인앱 메시지(outbox → poll)** 로 구현하고, 추후 카카오/문자로 확장한다.

---

## 2. 용어/정의
- **Vault Point(P)**: KRW와 1:1 등가로 보이는 내부 포인트 단위(표시만 “원”처럼).
- **Locked**: 금고에 적립되었으나 아직 출금/사용 불가(잠김).
- **Unlocked/Available**: 잠김 해제되어 즉시 사용 가능(보유금으로 “이동된 것처럼” 보임).
- **콩(KONG)**: 입금 단위. 본 스펙에서 **1콩 = 10,000원**.
- **Unlock Rate**: 1콩당 즉시 해금되는 금고 포인트. 본 스펙에서 **15,000P/콩**.
- **Expiry**: 금고 적립분의 소멸. 적립 시점으로부터 24시간.

---

## 3. 데이터 모델(DB)
### 3.1 설계 원칙
- 금고 적립/해금/소멸은 “총액 필드 2개”로도 구현 가능하지만,
  **소멸 타이머(24h)**와 **부분 해금(선입선출 소비)**를 위해서는 **적립 로그 단위의 만료/잔액 추적**이 안정적이다.

### 3.2 테이블
#### 3.2.1 `vault_account` (유저별 집계)
- 목적: 홈 화면에서 빠르게 현재 금고 상태를 조회하기 위한 집계 테이블

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| user_id | INT | PK, FK(user.id) | 유저 |
| locked_balance | INT | NOT NULL default 0 | 현재 잠긴 금고 잔액 |
| available_balance | INT | NOT NULL default 0 | 해금되어 보유금으로 옮길 수 있는 잔액(또는 이미 옮긴 잔액) |
| next_expire_at | DATETIME | NULL | 잠긴 잔액 중 가장 빠른 소멸 시각(없으면 NULL) |
| updated_at | DATETIME | NOT NULL | 갱신 시각 |

인덱스
- PK(user_id)

#### 3.2.2 `vault_earn_log` (금고 적립 단위)
- 목적: 24h 소멸과 부분 해금을 정확히 처리

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | BIGINT | PK | |
| user_id | INT | FK(user.id), index | |
| source_type | VARCHAR(50) | NOT NULL | 예: `NEW_MEMBER_DICE_LOSE`, `NEW_MEMBER_DICE_WIN`, `ATTENDANCE` |
| amount | INT | NOT NULL | 적립된 총액 |
| remaining_locked | INT | NOT NULL | 아직 잠긴 잔액(부분 해금/소멸로 감소) |
| expires_at | DATETIME | NOT NULL, index | 소멸 시각(적립+24h) |
| created_at | DATETIME | NOT NULL | |

권장 처리
- 부분 해금은 **created_at 오름차순(FIFO)** 로 `remaining_locked`를 차감
- 소멸 처리도 FIFO로 처리

#### 3.2.3 `vault_unlock_log` (해금 이벤트 로그)
- 목적: 감사/운영/소셜 프루프(실제 이벤트) 데이터 소스

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | BIGINT | PK | |
| user_id | INT | FK(user.id), index | |
| deposit_kong | INT | NOT NULL | 이번 이벤트에서 반영된 콩(10,000원 단위) |
| unlocked_amount | INT | NOT NULL | 실제 해금된 금액(잠긴 잔액이 적으면 더 작을 수 있음) |
| source | VARCHAR(50) | NOT NULL | 예: `EXTERNAL_DEPOSIT_UPSERT` |
| created_at | DATETIME | NOT NULL, index | |

#### 3.2.4 `vault_nudge_outbox` (지민 메시지 예약/발송)
- 목적: “1시간 후 지민 톡”을 1차 인앱 메시지로 시스템화

| 컬럼 | 타입 | 제약 | 설명 |
|---|---|---|---|
| id | BIGINT | PK |
| user_id | INT | FK(user.id), index |
| status | VARCHAR(20) | NOT NULL | `PENDING`/`SENT`/`CANCELED` |
| scheduled_at | DATETIME | NOT NULL, index |
| sent_at | DATETIME | NULL |
| template_key | VARCHAR(50) | NOT NULL | 예: `JIMIN_VAULT_1H` |
| payload_json | JSON | NOT NULL | 메시지 변수(금액/만료까지 남은 시간 등) |
| created_at | DATETIME | NOT NULL |

---

## 4. 핵심 로직
### 4.1 금고 적립(무료 주사위)
- 기존 신규회원 주사위는 “시스템 보상 없음” 문구가 있으나,
  본 퍼널에서는 **패배 보상(또는 참여 보상)을 금고로 적립**시키는 것이 목적이다.

권장 정책(운영 파라미터로 조정 가능)
- `NEW_MEMBER_DICE_LOSE` 시 금고 적립: `+5,000P`
- (옵션) `NEW_MEMBER_DICE_WIN` 시 금고 적립: `+30,000P` (문구와 정책 충돌 가능하므로 운영 결정 필요)

적립 동작
1) `vault_earn_log` insert (expires_at = created_at + 24h)
2) `vault_account.locked_balance += amount`, `next_expire_at = MIN(미소멸 로그의 expires_at)`
3) 응답에 `vault_delta_locked`, `vault_status` 포함

### 4.2 부분 해금(입금 → 즉시 해금)
요구: “1콩 입금 시마다 금고 포인트 15,000원씩 즉시 해금”

정의
- `KONG_UNIT_WON = 10_000`
- `UNLOCK_PER_KONG = 15_000`

입금 이벤트가 발생할 때(현재 코드에서 가장 확실한 훅은 `external_ranking_data.deposit_amount` 증가)
- `deposit_delta_won = new_deposit_amount - prev_deposit_amount` (음수면 0)
- `deposit_kong = floor(deposit_delta_won / 10_000)`
- `unlock_target = deposit_kong * 15_000`
- `unlocked_amount = min(unlock_target, vault_account.locked_balance)`

해금 실행(FIFO)
- `vault_earn_log`를 created_at 오름차순으로 순회하며 `remaining_locked`에서 차감
- 차감 총합이 `unlocked_amount`가 되면 중단

집계 반영
- `vault_account.locked_balance -= unlocked_amount`
- `vault_account.available_balance += unlocked_amount` (또는 즉시 “보유금”으로 전환됐다면 해당 지갑/포인트로 지급)
- `vault_unlock_log` 기록

UX 메시지 예시(프론트 계산 유도)
- “1콩(10,000원) 넣으면 15,000P 즉시 해금”
- “지금 1콩만 넣어도 +15,000P가 바로 풀립니다”

### 4.3 소멸(24h)
- 금고 적립분은 적립 시각 기준 24시간이 지나면 소멸
- 소멸은 **잠긴 잔액에서만** 발생(해금되어 available로 이동된 금액은 소멸 대상이 아님)

처리 방식
- 배치/크론으로 `expires_at <= now`이면서 `remaining_locked > 0`인 로그를 찾아
  - `vault_account.locked_balance -= remaining_locked`
  - 로그의 `remaining_locked = 0`으로 업데이트
- 이후 `vault_account.next_expire_at` 재계산

### 4.4 지민 메시지 트리거(1시간 후)
요구: “유저가 금고에 포인트를 쌓아두고 앱을 종료하면 1시간 뒤 지민 이름으로 톡”

실행 설계(1차: 인앱)
1) 프론트에서 앱 종료/백그라운드 전환 시 `POST /api/vault/session/exit` 호출
2) 서버는 조건을 만족하면 `vault_nudge_outbox`에 `scheduled_at = now + 1h`로 insert
   - 조건: `vault_account.locked_balance > 0` AND `next_expire_at` 존재 AND 아직 만료 전
3) 배치가 `scheduled_at <= now`인 PENDING을 SENT로 전환하고,
   - 1차는 인앱 알림 테이블(또는 outbox를 그대로 poll)로 사용자에게 노출
   - 2차 확장: 카카오/문자 송신 어댑터로 분리
4) 사용자가 1시간 내 재접속해서 이미 해금을 진행하거나 금고가 0이 되면 해당 outbox는 CANCELED

메시지 템플릿(요구 기반)
- 발신자 표시: `지민`
- 본문 예시(변수화 권장)
  - “자기야, 아까 주사위로 {locked_delta}원 번 거 왜 안 가져가? 이거 오늘 밤 지나면 시스템상 자동 소멸이라 내가 어떻게 해줄 수가 없어.. ㅠㅠ 지금 1콩만 넣으면 내가 아까 뽑은 거랑 합쳐서 바로 게임 가능하게 승인 올려줄게. 빨리!”

---

## 5. API 설계(초안)
원칙
- 홈 화면은 빠르게 로딩되어야 하므로 `vault_account` 기반 집계 응답 제공
- 신규회원 주사위 play 응답에 금고 변화를 포함하여 “실시간 숫자 증가”를 구현

### 5.1 금고 상태
#### GET `/api/vault/status`
응답(예)
```json
{
  "locked_balance": 30000,
  "available_balance": 0,
  "next_unlock": {
    "kong_unit_won": 10000,
    "unlock_per_kong": 15000,
    "remaining_to_next_kong_won": 10000
  },
  "expiry": {
    "next_expire_at": "2025-12-17T18:10:00Z",
    "seconds_remaining": 86399
  }
}
```

### 5.2 신규회원 주사위 응답 확장(금고 적립)
현재: [app/schemas/new_member_dice.py](../../app/schemas/new_member_dice.py)

변경 제안
- `NewMemberDicePlayResponse`에 다음을 추가
  - `vault_delta_locked: int`
  - `vault_status: VaultStatus` (위 status와 동일 구조)

### 5.3 종료 이벤트(지민 메시지 예약)
#### POST `/api/vault/session/exit`
- 인증: 필요(로그인 유저)
- 바디: `{ "reason": "APP_CLOSE" | "BACKGROUND" }` (선택)
- 응답: `{ "scheduled": true, "scheduled_at": "..." }`

### 5.4 지민 메시지 폴링(인앱 1차)
#### GET `/api/vault/nudges/poll`
- 응답 예
```json
{
  "messages": [
    {
      "id": 123,
      "from": "지민",
      "template_key": "JIMIN_VAULT_1H",
      "text": "자기야...",
      "created_at": "2025-12-17T10:00:00Z"
    }
  ]
}
```

### 5.5 소셜 프루프 피드
#### GET `/api/vault/social-proof?limit=10`
- 응답 예
```json
{
  "events": [
    { "seconds_ago": 20, "display_name": "**님", "unlocked_amount": 25000, "mode": "PARTIAL" },
    { "seconds_ago": 180, "display_name": "**님", "unlocked_amount": 50000, "mode": "FULL" }
  ]
}
```

정책
- display_name은 `nickname` 또는 `external_id`를 **마스킹 처리**해서 반환(개인정보 최소화)

---

## 6. 백엔드 구현 지시(구조)
### 6.1 파일/모듈(권장)
- 모델
  - `app/models/vault.py` (VaultAccount, VaultEarnLog, VaultUnlockLog, VaultNudgeOutbox)
- 서비스
  - `app/services/vault_service.py`
  - `app/services/vault_nudge_service.py`
- 라우터
  - `app/api/routes/vault.py` (prefix `/api/vault`)

### 6.2 기존 훅에 붙이는 지점
#### (A) 신규회원 주사위 적립
- 위치: [app/services/new_member_dice_service.py](../../app/services/new_member_dice_service.py)
- `play()`에서 outcome 결정 후
  - `vault_service.add_locked_points(user_id, amount, source_type="NEW_MEMBER_DICE_LOSE"...)`
  - 응답에 delta/status 포함

#### (B) 입금 해금
- 위치: [app/services/admin_external_ranking_service.py](../../app/services/admin_external_ranking_service.py)
- `upsert_many()`에서 `deposit_amount` 증가를 감지하는 구간이 이미 존재
  - `prev_amount` vs `row.deposit_amount`
- 여기서 `deposit_delta_won = row.deposit_amount - prev_amount`를 계산해
  - `vault_service.apply_deposit_unlock(user_id, deposit_delta_won, now=row.updated_at)` 호출

이 방식의 장점
- 현재 코드베이스에서 “실제 입금”의 근거가 되는 데이터가 `external_ranking_data.deposit_amount`이므로,
  해금 근거도 같은 곳에서 일관되게 처리할 수 있다.

### 6.3 배치(소멸/지민 메시지)
- 소멸 배치: `scripts/vault_expire.py` (10분/1시간 주기)
- 지민 outbox 배치: `scripts/vault_nudge_dispatch.py` (1분~5분 주기)

운영 상 최소 기준
- 배치가 없어도 API 호출 시 `GET /api/vault/status`에서 “만료된 로그 정리”를 수행하는 방어 로직을 넣을 수 있으나,
  실시간성과 일관성을 위해 크론 권장.

---

## 7. 프론트엔드 구현 지시(UI/애니메이션/토스트)
### 7.1 홈 첫 화면 금고 UI 배치
- 위치: [src/pages/HomePage.tsx](../../src/pages/HomePage.tsx)
- Hero 상단 또는 Hero 하단에 **[잠긴 금고] 카드**를 1개 추가

필수 요소
1) 잠긴 금고 아이콘(잠금 강조)
2) 잠긴 금고 금액(locked_balance)
3) 자물쇠 아이콘 + 게이지 바
   - 게이지 텍스트: “해제까지 10,000원 부족”
   - 값은 `remaining_to_next_kong_won` 기반
4) 소멸 타이머(24h 카운트다운)
   - “소멸까지 23:59:59” 형식

주의
- 새 테마/새 컴포넌트 시스템을 만들지 말고, 현 Tailwind 토큰/스타일 톤 유지

### 7.2 신규회원 주사위에서 “실시간 금고 적립 애니메이션”
- 위치: [src/pages/NewMemberDicePage.tsx](../../src/pages/NewMemberDicePage.tsx)
- `play` 응답에 `vault_delta_locked`가 포함되면
  - 결과 카드 아래에 “잠긴 금고 +5,000원 적립”을 노출
  - 숫자는 **카운트 업 애니메이션**(예: 0→5000, 300ms~800ms)
  - 동시에 Home의 금고 UI와 동일한 구조를 최소로 재사용하거나, 페이지 내에 작은 요약 UI 제공

### 7.3 지민 메시지 노출(인앱)
- 홈 진입 시 `GET /api/vault/nudges/poll`을 1회 호출
- 메시지가 있으면 `ToastProvider`를 사용해 하단에 표시
  - 발신자 라벨: “지민”
  - 본문은 템플릿 문자열 그대로

### 7.4 소셜 프루프 토스트
- 홈 진입 시 `GET /api/vault/social-proof`로 이벤트 5~10개를 받아
  - 3~5초 간격으로 `addToastNode`로 순차 노출
- 토스트 문구(요구 그대로)
  - “[방금 전] **님, 금고 포인트 25,000원 해금 완료!”
  - “[3분 전] **님, 10콩 입금으로 금고 전액(5만P) 즉시 환전!”

정책
- 허위 데이터 금지: `vault_unlock_log` 기반 실제 이벤트만 노출

---

## 8. QA 체크리스트(최소)
- 신규회원 주사위 1회 플레이 후:
  - 금고 locked가 증가하고, 보유금/티켓 섹션에는 증가하지 않음
  - 금고 UI에 소멸 타이머가 24h로 시작
- 입금(외부랭킹 deposit_amount 증가) 후:
  - 10,000원 증가마다 15,000P가 즉시 해금되어 available로 이동
  - 잠긴 잔액이 부족하면 해금량이 그만큼만 적용
- 소멸:
  - 24h 경과 시 잠긴 잔액이 감소(0으로)
  - next_expire_at가 적절히 갱신
- 지민 메시지:
  - 금고 잔액이 있는 상태에서 exit 이벤트 발생 → 1h 후 poll에서 메시지 노출
- 소셜 프루프:
  - 실제 해금 로그가 존재할 때만 토스트 노출

---

## 9. 오픈 질문(운영 결정 필요)
1) 신규회원 주사위가 현재 “보상 없음”으로 고지되어 있음
   - 금고 적립을 “보상”으로 볼지, “내 자산”으로 카피를 바꿀지 결정 필요
2) 해금된 금액(available_balance)을 실제로 어디에 더할지
   - 단순 표시(보유금 숫자)만인지, 별도의 지갑/포인트 시스템에 적립인지 정책 필요
3) 소멸 정책
   - 적립 후 24h 경과 시 전액 소멸(현재 스펙)
   - 또는 일부 소멸/감쇠 등 변형 가능

---

## 10. 다음 구현 우선순위 제안
- 1순위: **금고 UI + 신규회원 주사위 적립(locked) + 24h 타이머**
  - 퍼널의 “내 자산이 잠겼다” 인식이 가장 빨리 생김
- 2순위: **부분 해금(입금 훅 연동)**
  - 실제 매출 유도 로직의 핵심
- 3순위: **지민 메시지(outbox) + 소셜 프루프 토스트**
  - 전환율 상승 보조 장치
