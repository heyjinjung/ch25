# 20260104 dice 피크타임 이벤트(조건부 출금) 빌드 문서 (Implementation Ready)

작성일: 2026-01-04
버전: v2.0 (실행 가능 구현 수준)

## 0. 목표 / 한 줄 정의
- **30만원 충전 유저 대상**으로 피크타임(30분) 동안 주사위 플레이 결과로 금고 적립을 체감시키되,
- **즉시 출금 불가(잠금)** + **플레이 조건 충족 시에만 해제(조건부 출금)**로 비용을 통제한다.

## 1. 이벤트 UX(유저 관점)
### 1-1. 참여 조건
- 충전 트리거: **단일 충전 30만원**(외부 검증/어드민 입력 포함)
- 대상자 컷(예시, 서버 판별):
  - 최근 14일 내 충전 1회 이상 (`UserActivity.last_charge_at` 기반)
  - 누적 충전 3만원 이상 (`ExternalRankingData.deposit_amount` 기반)
  - 제외: `AdminUserProfile.tags`에 `Blacklist` 포함 유저

### 1-2. 지급/정산
- 충전 확인 시점에 **금고 잠금 적립 20,000원** 부여 (즉시 출금 불가)
- 피크타임 30분 동안 주사위 플레이 결과에 따라 금고 잠금 잔고가 **증가/감소**
- **주사위 30회 플레이 완료** 시에만 잠금 해제(출금 가능 상태로 전환)

### 1-3. “0이면 밑져야 본전” 방지(리스크가 실제로 발생하도록)
아래 중 하나를 선택(권장 순서):
1) **이벤트 모드 참여 조건으로 “이벤트 스테이크(잠금 잔고) 최소치” 요구**
   - 예: 이벤트 주사위는 시작 시점에 잠금 잔고(이벤트 스테이크) >= 2,000원일 때만 진입 가능
   - 스테이크가 0이 되면 이벤트 모드 진입 불가(= 바닥 본전 플레이 차단)
2) **미수금(음수) 허용(비권장)**
   - 현재 v1 금고는 음수로 내려갈 수 있어 “차감은 실제 발생”하나,
   - 유저 반발/CS/신뢰 리스크가 커서 기본 정책으로는 비권장

## 2. 공정성/신뢰 원칙(필수)
- (운영 선택) 본 이벤트는 **가상머니(금고 잠금 잔고) 기반 이벤트 모드**로, 서버가 이벤트 모드에서 **승/무/패 확률 및 페이테이블을 운영 파라미터로 관리**할 수 있다.
- 대신 아래 항목은 운영/CS 관점에서 반드시 고정·관리한다:
  - 이벤트 기간
  - 대상자 조건
  - 1일 상한(지급/손실)
  - 출금 조건(30회)
  - (선택) 승/패 시 적립/차감액 범위

## 3. 현재 코드/DB에서 가능한 것(팩트)
### 3-1. 충전/입금 판별 데이터
- 누적 입금액: `external_ranking_data.deposit_amount`
- 최근 충전 시각: `user_activity.last_charge_at`
  - 주의: 이 값은 “거래 로그”가 아니라 **external_ranking_data 갱신 시각(row.updated_at)**을 충전 시각으로 간주해 기록됨

### 3-2. 티켓(주사위 토큰) 출처 구분
- TRIAL(체험) 토큰 사용 여부는 `consumed_trial`로 판별 가능
- 그 외 “무료 지급 vs 구매”를 일반적으로 구분할 표준 필드는 현재 부족
  - 따라서 ‘일반 티켓 기준’이라는 조건은 **현 상태에선 ‘TRIAL 제외’ 정도만 강제 가능**

### 3-3. 금고 적립/차감 처리
- 금고 v1 잠금 잔고는 `User.vault_locked_balance`에 누적됨
- 게임 적립 이벤트는 `VaultService.record_game_earn_event()`가 담당
  - DICE의 승/패 기본값은 fallback 기준 WIN=200 / LOSE=-50
  - 배율은 `vault_accrual_multiplier()`를 통해 적용
- Vault2(프로그램/config)는 **운영용 설정 저장소로 활용 가능**
  - `VaultProgram.config_json.game_earn_config`로 DICE WIN/LOSE 값 운영 조정 가능

## 4. 구현 설계(권장 아키텍처)

### 4-1. 이벤트 상태(서버가 알아야 하는 최소 정보)
필수 상태:
- `event_id`: 예) `DICE_PEAK_202601`
- `user_id`
- `eligible`: 대상자 조건 통과 여부
- `session_window`: 시작/종료(피크타임 30분)
- `plays_required`: 30
- `plays_done`: 이벤트 기간 내 주사위 플레이 횟수
- `locked_grant_amount`: 20,000
- `stake_balance`: 이벤트 스테이크(잠금 잔고 내에서 추적)

저장 위치(선택지):
1) **Vault2 `VaultStatus.progress_json` 사용(추천)**
   - 이벤트 진행/횟수/상태를 JSON으로 저장
2) 별도 테이블 신설(확장성↑)

### 4-2. 지급(충전 트리거) 처리
- 트리거: “30만원 충전 확인” 시점
- 액션:
  1) 유저를 이벤트 eligible로 마킹
  2) 금고 잠금 잔고에 20,000원 추가(= 이벤트 스테이크 생성)
  3) 이벤트 진행 상태 초기화(plays_done=0 등)

주의:
- 외부 충전 검증이 현재 수동일 수 있으므로, **어드민 버튼/엔드포인트**로 트리거 가능해야 함

### 4-3. 플레이 횟수 카운팅
- 이벤트 기간 내 주사위 플레이가 발생할 때마다 `plays_done += 1`
- TRIAL 소비 플레이는 제외하고 싶다면:
  - `GameWalletService.require_and_consume_token()` 결과의 `consumed_trial`을 활용해 제외

### 4-4. 승/패 적립/차감(스테이크 기반)
- 이벤트 모드에서만 적용되는 별도 룰을 둔다:
- 이벤트 모드에서는 (A) **승/무/패 확률**과 (B) **승/무/패 금액(페이테이블)**을 함께 운영 파라미터로 둔다.

#### 4-4-1. 목표: “20,000원 시작 → 30회 후 평균 14,000원” (이벤트 모드)
- 목표 평균 최종 잔고가 14,000원이면, 30회 동안 평균으로는 **-6,000원** 정도 내려가면 된다.
  - 1회당 평균 변화는 대략 **-200원/회**

#### 4-4-2. 권장 페이테이블(하우스 유리 조정)
- 기본(권장): **WIN=+1,400 / DRAW=-800 / LOSE=-1,100** (하우스 유리하게 조정: WIN 증가, LOSE 감소로 유저 체감 완화)
- 대안(더 엄격): **WIN=+1,200 / DRAW=-1,000 / LOSE=-1,320** (기존, 하우스 이득 더 큼)

#### 4-4-3. 권장 확률 세팅(예시)
- 확률은 이벤트 모드에서 `p_win`, `p_draw`, `p_lose`로 설정하고, 매 판 결과를 **가중치 랜덤**으로 결정한다.
- 30회 평균 14,000원을 목표로 할 때의 예시(운영 중 미세 조정 가능):
  - p_draw=0.10, p_win=0.35, p_lose=0.55
  - 평균 변화 계산 (페이테이블 적용 시): (0.35 * 1400) + (0.10 * -800) + (0.55 * -1100) ≈ -195원/회
  - 30회 기준 평균 잔고: 20,000 - (195 * 30) ≈ 14,150원 (목표 근접, 하우스 이득 증가)

#### 4-4-3-1. 확률/페이테이블 비교표 (운영 선택용)

| 시나리오 | p_win | p_draw | p_lose | WIN | DRAW | LOSE | 1회당 평균 | 30회 후 잔고 |
|----------|-------|--------|--------|-----|------|------|------------|--------------|
| 기본(권장) | 0.35 | 0.10 | 0.55 | +1,400 | -800 | -1,100 | -195원 | ~14,150원 |
| 보수적(하우스+) | 0.30 | 0.10 | 0.60 | +1,400 | -800 | -1,100 | -290원 | ~11,300원 |
| 완화(유저+) | 0.40 | 0.10 | 0.50 | +1,400 | -800 | -1,100 | -110원 | ~16,700원 |
| 기존(참고) | 0.444 | 0.11 | 0.446 | +1,200 | -1,000 | -1,320 | -167원 | ~15,000원 |



#### 4-4-4. 구현 포인트(확률 조작 방식)
- 결과(outcome)를 먼저 가중치로 결정한 뒤, 그 결과에 맞는 주사위 눈을 생성한다.
  - 예: outcome=WIN이면 사용자 합이 딜러 합보다 크게 나오도록 눈을 생성
  - outcome=DRAW이면 합이 같도록 눈을 생성
- 이렇게 하면 “주사위 값”은 항상 정상 범위(1~6)로 보이면서도, 이벤트 모드의 목표 평균을 안정적으로 맞출 수 있다.
- 분포(체감) 관점:
  - 15명이면 0원/5천/2만/3만/4만처럼 **다양하게** 갈 수 있다.
  - 또한 운영 목적에 따라 **유저별로 핸들링 정책(확률/페이테이블/상한)을 다르게** 적용할 수 있다.
  - 그래서 상한(+20,000)과 바닥(스테이크 0 중단)을 같이 두면 비용과 리스크를 더 안정적으로 제어 가능.
- 세부 구현 체크:
  - **랜덤 생성**: `random.choices()` 또는 유사 함수로 p_win, p_draw, p_lose 가중치 적용. 시드 고정으로 재현성 확보 (테스트용).
  - **주사위 눈 생성 로직**: outcome=WIN 시, 유저 합 > 딜러 합이 되도록 1~6 범위 내 랜덤 조합 (예: 유저 6+5=11, 딜러 4+3=7). DRAW 시 합 같게, LOSE 시 유저 합 < 딜러 합.
  - **이벤트 모드 판별**: `DiceService.play()`에서 이벤트 상태 확인 (Vault2.progress_json 또는 별도 테이블). 이벤트 중이면 확률/페이테이블 적용.
  - **적립 처리**: `VaultService.record_game_earn_event()` 호출 시 이벤트 모드 플래그 추가, 페이테이블 기반 금액 계산.
  - **카운팅**: plays_done 증가 시 TRIAL 제외 로직 추가 (`consumed_trial` 체크).
  - **상한/바닥 체크**: 플레이 전후 스테이크 잔고 확인, 0 이하 시 이벤트 모드 중단, 상한 초과 시 적립 0으로 클램프.
  - **블랙리스트 제외**: `AdminUserProfile.tags` 조회 후 'Blacklist' 포함 시 표준 모드로 폴백.
  - **감사 로그**: 확률/페이테이블 변경 시 어드민 로그 기록 (변경 전후 값, 타임스탬프).
  - **테스트**: 단위 테스트로 확률 분포 검증 (1000회 시뮬레이션, 평균 잔고 확인).

#### 4-4-5. 유저별 핸들링(태그/세그먼트 기반)
- 기준: **`AdminUserProfile.tags`에 `Blacklist` 포함 여부 1가지로만 처리**
- 정책(권장): `Blacklist` 유저는 **이벤트 모드 진입 차단**(= 이벤트 확률/페이테이블 적용 대상에서 제외)
  - 운영/CS 문구: “부정 이용 방지 정책에 따라 일부 계정은 이벤트 대상에서 제외될 수 있음”
- 데이터 소스(현재 코드/DB에 존재): `AdminUserProfile.tags`
- 구현 포인트:
  - `DiceService.play()`에서 이벤트 모드 적용 전 `AdminUserProfile.tags`에 `Blacklist`가 있으면 이벤트 모드 스킵
  - 운영 변경은 추적 가능하도록 감사 로그(어드민 변경 이력) 권장
- 비용 통제:
  - 1일 최대 플레이 수(예: 30회)
  - 1일 최대 순증(예: +20,000 상한)
    - 정의(권장): **게임 플레이로 인해 증가한 잠금 잔고의 순증분** 상한
    - 해석(질문 답): 시작 스테이크가 20,000원일 때, “순증 +20,000”이면 **이벤트로 최대 +20,000까지 더 벌 수 있음**
      - 즉, 잠금 잔고가 이 이벤트 때문에 최대 **40,000(=20,000+20,000)**까지 커질 수 있다는 의미
      - 만약 “20,000 시작해서 20,000 도달하면 종료(총액 상한 20,000)”를 원하면, 상한을 **‘총 잠금 잔고 상한’**으로 별도 정의해야 함
    - 동작(예시): 상한 도달 시 이벤트 모드 적립을 0으로 클램프하거나, 이벤트 모드 자체를 종료
  - 스테이크가 0이면 이벤트 모드 중단

### 4-5. 잠금 해제(출금 가능 전환)
- 조건: `plays_done >= plays_required`
- 액션:
  - 잠금 금액(이벤트 스테이크 잔고)을 “출금 가능 상태”로 전환

현재 코드 베이스 기준 힌트:
- Vault2에는 LOCKED/AVAILABLE 상태가 있으나, 게임플레이에 완전 연결되어 있지 않음
- 단기 구현은 v1(User.vault_locked_balance / available mirror)와 Vault2(북키핑)를 함께 쓰는 형태가 현실적

### 4-6. 백엔드 API 스펙 (Admin + User)
- **Admin Dice Config** ([app/api/admin/routes/admin_dice.py](app/api/admin/routes/admin_dice.py))
  - `GET /admin/api/dice-config/` : 설정 리스트 조회
  - `GET /admin/api/dice-config/{id}` : 단건 조회
  - `POST /admin/api/dice-config/` : 생성 (payload=win/draw/lose reward_type/amount, is_active, max_daily_plays)
  - `PUT /admin/api/dice-config/{id}` : 수정 (부분 필드 허용)
  - `POST /admin/api/dice-config/{id}/activate` / `.../deactivate` : 활성/비활성 전환
  - 서비스 로직: [app/services/admin_dice_service.py](app/services/admin_dice_service.py), 스키마: [app/schemas/admin_dice.py](app/schemas/admin_dice.py)
- **User Dice Play** ([app/api/routes/dice.py](app/api/routes/dice.py))
  - `GET /api/dice/status` : 오늘 플레이수, 토큰 잔액 리턴
  - `POST /api/dice/play` : 주사위 1회 플레이, 결과+reward_amount 반환, Vault 적립은 내부에서 호출
  - 게임 로직: [app/services/dice_service.py](app/services/dice_service.py)
- **Vault 적립** ([app/services/vault_service.py](app/services/vault_service.py))
  - `record_game_play_earn_event(...)` : game_type/outcome/payout_raw를 받아 멱등 적립. VaultProgram.config_json.game_earn_config > payout_raw.reward_amount > 기본값 순으로 금액 결정.
  - `vault_accrual_multiplier(...)` : DB(config_json.accrual_multiplier) 또는 env 배율 적용.
- **이벤트 상태 저장 (추천)**
  - Vault2 상태: [app/models/vault2.py](app/models/vault2.py) 의 `VaultStatus.progress_json` 활용
  - 설정 저장: [app/models/vault2.py](app/models/vault2.py) 의 `VaultProgram.config_json` 사용 (확률/페이테이블/상한/eligibility)

### 4-7. 어드민 UI 흐름 (프론트)
- 페이지: [src/admin/pages/DiceConfigPage.tsx](src/admin/pages/DiceConfigPage.tsx)
  - 리스트/생성/수정/활성화 토글 지원. 금액 입력 시 음수 허용(차감), reward_type은 NONE 권장.
  - 저장 시 react-query invalidate로 즉시 반영.
- 추가 필요 UI(이벤트용)
  - “이벤트 모드 파라미터” 섹션: p_win/p_draw/p_lose, WIN/DRAW/LOSE 금액, 1일 최대 순증/플레이 수 설정 입력 → VaultProgram.config_json에 저장하는 Admin Form 신설 권장.
  - “대상자/세션 관리” 섹션: eligible 마킹/해제, 세션 시작/종료(30분 타이머), 스테이크 초기화 버튼.

### 4-8. 구현 체크리스트 (서버/프론트)
- 서버
  - DiceService에 “이벤트 모드 분기” 추가: event_active && not_blacklist && stake>0 && within_session → 가중치 확률/페이테이블 적용, stake_balance 업데이트, plays_done++.
  - VaultService.record_game_earn_event 호출 시 payout_raw에 `{"reward_amount": 이벤트 결과 금액, "mode": "EVENT"}` 포함.
  - 참고: 스트릭 금고 보너스(기본 200원 적립 배율)는 `mode != NORMAL`인 플레이(즉, EVENT 모드)에는 적용되지 않도록 설계/구현되어야 함.
  - VaultProgram.config_json에 `game_earn_config.DICE.{WIN,DRAW,LOSE}`, `probability.DICE.{p_win,p_draw,p_lose}`, `caps.{daily_gain, daily_plays}`, `eligibility.tags.blocklist=["Blacklist"]` 저장/로드 로직 추가.
  - 이벤트 상태 저장: VaultStatus.progress_json에 `{plays_done, plays_required, session_start, session_end, stake_balance}` 저장/업데이트.
  - 어드민 감사 로그: 확률/페이테이블/상한 변경 시 AdminAuditLog에 before/after 기록.
- 프론트 (사용자)
  - DicePage: 결과에 따라 VaultAccrualModal을 승/패 모두 노출(음수 시 “금고 차감” 표기), TRIAL 소비 시 plays_done 제외 로직과 연동.
  - 피크타임 UI: 세션 타이머(30분) 카운트다운, 남은 플레이수(plays_required - plays_done) 표시.
  - 스테이크 부족/0일 때 이벤트 모드 진입 차단 안내 배너.
- 프론트 (어드민)
  - DiceConfigPage 확장: 이벤트 모드 탭(확률/페이테이블/상한 입력) 추가, 저장 시 VaultProgram.config_json 업데이트 API 연동.
  - 대상자 패널: Blacklist 태그 추가/삭제 퀵액션, eligible 강제 토글(충전 검증 수동 처리용).
  - 로그 뷰어: 최근 이벤트 플레이 결과, 적립액, 상한 도달 여부, 블랙리스트 필터링 상태를 표로 노출.

### 4-9. API Contract 예시 (현행 엔드포인트 기반)
- Admin Dice Config
  - `POST /admin/api/dice-config/`
    - Request JSON:
      ```json
      {
        "name": "Peak Dice 202601",
        "is_active": true,
        "max_daily_plays": 0,
        "win_reward_type": "NONE",
        "win_reward_amount": 1400,
        "draw_reward_type": "NONE",
        "draw_reward_amount": -800,
        "lose_reward_type": "NONE",
        "lose_reward_amount": -1100
      }
      ```
    - Response JSON (201): 위 필드 + `id`, `created_at`, `updated_at`
  - `PUT /admin/api/dice-config/{id}` : 동일 필드 부분 업데이트. 음수 금액 허용(차감).
  - `POST /admin/api/dice-config/{id}/activate` / `.../deactivate` : is_active 토글.
- User Dice Play
  - `POST /api/dice/play`
    - Response JSON 예시:
      ```json
      {
        "result": "OK",
        "game": {
          "user_dice": [3, 6],
          "dealer_dice": [2, 5],
          "user_sum": 9,
          "dealer_sum": 7,
          "outcome": "WIN",
          "reward_type": "NONE",
          "reward_amount": 1400
        },
        "season_pass": null,
        "vault_earn": 1400
      }
      ```
    - 내부 동작: DiceService.play → GameWalletService.require_and_consume_token → VaultService.record_game_play_earn_event (payout_raw.reward_amount 사용) → RewardService.deliver (trial vault 라우팅 플래그에 따라 분기).
- Dice Status
  - `GET /api/dice/status`
    - Response JSON 예시:
      ```json
      {
        "config_id": 1,
        "name": "Peak Dice 202601",
        "max_daily_plays": 0,
        "today_plays": 0,
        "remaining_plays": 0,
        "token_type": "DICE_TOKEN",
        "token_balance": 5,
        "feature_type": "DICE"
      }
      ```

### 4-10. VaultProgram.config_json 키 스키마 (권장안, 최소 수정)
Vault2 기본 프로그램(`DEFAULT_PROGRAM_KEY=NEW_MEMBER_VAULT`)의 config_json에 아래 키를 사용해 이벤트 파라미터를 저장/로드한다.

```json
{
  "probability": {
    "DICE": {"p_win": 0.35, "p_draw": 0.10, "p_lose": 0.55}
  },
  "game_earn_config": {
    "DICE": {"WIN": 1400, "DRAW": -800, "LOSE": -1100}
  },
  "caps": {
    "DICE": {"daily_gain": 20000, "daily_plays": 30}
  },
  "eligibility": {
    "tags": {"blocklist": ["Blacklist"]}
  },
  "accrual_multiplier": 1.0
}
```
- 적용 순서(기존 코드 준수): VaultService.record_game_play_earn_event는 `game_earn_config` → payout_raw.reward_amount → fallback(200/-50/0) 순서로 금액을 결정.
- 확률(p_win/p_draw/p_lose)은 DiceService 이벤트 분기에서 읽어 가중치 랜덤에 적용.
- caps.daily_gain/daily_plays는 이벤트 모드 적립/플레이 전 검증에 사용(초과 시 클램프 또는 차단).
- eligibility.tags.blocklist는 AdminUserProfile.tags 검사에 사용.

## 5. 운영 파라미터(초기 권장값)
- 피크타임: 30분
- 대상자:
  - 최근 14일 충전 1회 이상
  - 누적 30,000원 이상
  - (가능하면) 이벤트 트리거는 “30만원 충전” 단일 조건
- 플레이 조건: 30회
- 스테이크:
  - 잠금 지급 20,000
  - WIN/LOSE 예시: +1,400 / -1,100 (또는 +2,000 / -2,000)
- 상한:
  - 1일 1회 참여(이벤트 트리거 기준)
  - 1일 최대 플레이 30회
  - 1일 최대 순증 +20,000

## 6. 리스크 & 방어
- “꽁머니 티켓 보유자”가 이벤트 보너스를 먹는 문제
  - 해결: 티켓 보유 여부가 아니라 **충전/입금 데이터 기반**으로 eligible 컷
  - TRIAL 제외는 가능(완전 무료/프로모 구분은 현재 한계)
- 비용 폭주
  - 상한(횟수/순증) + 잠금/조건부 출금 + 대상자 컷
- 신뢰/여론
  - 이벤트 모드의 파라미터(확률/페이테이블)는 운영 변경 이력이 남도록 관리(어드민 감사 로그 권장)

## 7. 모니터링/지표
- 참여자 수(eligible 중 실제 플레이)
- 30분 피크타임 동시접속/플레이 수
- 1인 평균 플레이 수
- 1인 평균 순증(잠금 잔고 변동)
- 출금 해제율(조건 달성률)
- CS 이슈(“왜 출금이 안 되냐/조건이 뭐냐”)

## 8. 롤백 플랜
- 즉시 중단:
  - Vault 배율 OFF
  - 이벤트 모드 진입 차단
- 정산:
  - 진행 중 유저의 스테이크/잠금 잔고는 “정책에 따라” 유지/회수/부분 환급(사전 고지 필요)

---

## 9. 엔터프라이즈 품질/운영 기준 점검
- **성능/지연**: `POST /api/dice/play` P99 < 200ms (캐시 없이), DB 단일 읽기/쓰기 O(1) 유지. Vault accrual 배치는 없는 구조 유지.
- **고가용성**: 이벤트 파라미터(config_json) 변경 시 무중단(핫 리로드). 장애 시 기본 확률/페이테이블로 폴백하도록 서버 디폴트 유지.
- **추적성/감사**: Admin 파라미터 변경 시 `AdminAuditLog`에 before/after + actor 기록. 확률/페이테이블/상한 모두 포함.
- **보안**: Admin 엔드포인트는 관리자 토큰 + 역할 검증. 대상자/블랙리스트 데이터는 PII 최소 노출(필요 시 user_id만).
- **데이터 무결성**: VaultEarnEvent는 earn_event_id 멱등키로 중복 방지. VaultStatus.progress_json 수정 시 트랜잭션 묶기.

## 10. 테스트/검증 매트릭스 (필수)
- **단위**: DiceService 이벤트 분기(확률 합=1, 가중치 적용), VaultService.record_game_play_earn_event 금액/배율/상한 클램프, blacklist 폴백.
- **시뮬레이션**: 10k 플레이 몬테카를로 → 평균 잔고(목표 14k±500) 확인, caps.daily_gain/daily_plays 적용 여부 검증.
- **통합**: `POST /api/dice/play` → VaultEarnEvent 생성, vault_locked_balance 변동, GameWallet 토큰 차감, TRIAL 제외 시 plays_done 미증가.
- **프론트 E2E**: 피크타임 타이머 표시, 스테이크 0 진입 차단, 음수 적립 시 VaultAccrualModal 차감 문구 노출, 어드민 설정 저장/로드 UI.
- **회귀**: 기존 DICE 일반 모드(이벤트 비활성) 정상 동작, Roulette/다른 게임에 영향 없는지 스모크.

## 11. 배포/롤아웃 전략
- **플래그**: `enable_vault_game_earn_events`(env) + `config_json.enable_game_earn_events`(DB) 둘 다 켜야 적립 활성. 이벤트 모드 스위치는 config_json.probability/game_earn_config 유무로 결정.
- **점진 롤아웃**: caps.daily_plays를 낮게(예: 5) 시작 → 30으로 확대. 상한을 낮게 시작해 손실 추이를 관찰.
- **롤백 스위치**: config_json.probability 비움 + game_earn_config 비움 → 기본 모드 복귀. 또는 enable_vault_game_earn_events 끄기.

## 12. 장애 시나리오 & 대응
- **VaultEarnEvent 중복/DB Lock**: IntegrityError 발생 시 0 반환(현행), 로그 남김. 재시도 필요 없음.
- **config_json 파싱 실패**: fallback(기본 확률/페이테이블/배율=1.0)로 안전 폴백, Admin Alert 발송 권장.
- **상한 계산 오류**: caps 적용 전후 로깅으로 원인 추적. 상한 도달 시 적립 0 클램프를 기본값으로 유지.
- **RNG 고장/시드 문제**: random.choices() 시드 고정 테스트를 CI에 포함, 운영에서는 시드 미고정.

## 13. 데이터/설정 관리
- **DB 마이그레이션**: 없음(기존 DiceConfig/Vault2 활용). config_json 스키마는 JSON 확장 필드로 후방 호환.
- **백필/시드**: 기존 DiceConfig 유지, 이벤트 전용 설정은 신규 레코드 추가(activate로 스위칭). VaultStatus.progress_json은 이벤트 시작 시 초기화.
- **버전 관리**: config_json에 `version` 필드 옵션(예: `"version": 1`)을 두어 파라미터 체인지 트래킹 가능.

## 14. 감사 로그 스키마 적용 가이드
- 스키마: [app/models/admin_audit_log.py](app/models/admin_audit_log.py)
- 제안 필드 값
  - `action`: `UPDATE_CONFIG`, `UPDATE_PROBABILITY`, `UPDATE_CAPS`, `TOGGLE_EVENT_MODE`
  - `target_type`: `VaultProgram` (config_json 변경), `DiceConfig` (보상 금액 변경)
  - `target_id`: program.id 또는 dice_config.id 문자열
  - `before_json`/`after_json`: 변경된 key만 최소 저장 (예: `{"probability":{"DICE":{"p_win":0.35}}}`)
- 최소 수정 방안: 기존 테이블 그대로 사용, Admin 서비스/핸들러에서 위 값으로 insert만 추가.

### 14-1. 감사 로그 삽입 포인트 (제안)
- [app/services/admin_dice_service.py](app/services/admin_dice_service.py)
  - `create_config`, `update_config`, `toggle_active` 종료 직후 commit 성공 시 AdminAuditLog 삽입.
  - before_json: 변경 전 DiceConfig 필드 스냅샷(해당 필드만). after_json: 변경 후 필드.
  - action 예시: `UPDATE_CONFIG` (create/update), `TOGGLE_EVENT_MODE` (is_active 토글).
  - target_type=`DiceConfig`, target_id=str(config.id).
- (선택) VaultProgram config_json 변경 핸들러를 만들 경우 동일 패턴 적용.

## 15. 알람 기준 및 대시보드 연동
- **지연**: `POST /api/dice/play` P99 > 200ms (5분 연속) 알람. 메트릭: HTTP server duration histogram.
- **오류율**: 5xx 비율 > 1% (5분 합산) 알람. 400대는 제외.
- **caps 초과 시도**: caps.daily_gain/daily_plays 차단 이벤트가 분당 10건 초과 시 알람(설정 오류 가능). 메트릭 소스: VaultService caps 클램프 로깅.
- **대시보드**: API 지연/오류율, caps 차단 카운터, VaultEarnEvent 성공/중복 카운터, Dice play 성공/실패 카운터를 모두 노출. 기본 뷰에 이벤트 모드 on/off 토글 상태(config_json 존재 여부) 표기.

### 15-1. 메트릭 네이밍 & 라벨 설계 (Prometheus 예시)
- HTTP
  - `http_request_duration_seconds{handler="/api/dice/play",method="POST"}` (histogram)
  - `http_requests_total{handler="/api/dice/play",code="5xx"}`
- 게임/금고
  - `dice_play_total{outcome="WIN|DRAW|LOSE", mode="EVENT|NORMAL"}`
  - `vault_earn_event_total{game="DICE", result="WIN|DRAW|LOSE", status="success|duplicate|skip"}`
  - `vault_caps_block_total{cap_type="daily_gain|daily_plays"}`
- 설정/운영
  - `event_mode_active{program="NEW_MEMBER_VAULT"}` gauge (config_json.probability/game_earn_config 존재 여부 0/1)
  - `config_change_total{target="VaultProgram|DiceConfig", action="UPDATE_CONFIG|UPDATE_PROBABILITY|TOGGLE_EVENT_MODE"}`

### 15-2. 대시보드 패널 스케치
- Latency: P50/P95/P99 for `/api/dice/play` (line), 오류율(5xx %) stacked bar.
- Event Mode 상태: gauge (0/1), 최근 config 변경 로그 테이블(before→after diff).
- 게임 지표: outcome별 dice_play_total stacked bar; vault_earn_event_total success vs duplicate.
- Caps: vault_caps_block_total 시계열(조건 초과 시 스파이크 감지), 일별 caps 차단 합계 표.
- 알람 상태: 최근 firing alerts 리스트 (latency, error_rate, caps_block).

## 부록 A. 관련 코드(참조)
- 금고 게임 적립/차감: `VaultService.record_game_earn_event()`
- 배율: `VaultService.vault_accrual_multiplier()`
- 누적 입금: `ExternalRankingData.deposit_amount`
- 최근 충전: `UserActivity.last_charge_at` (external_ranking_data 갱신 기반)
- TRIAL 사용 여부: `GameWalletService.require_and_consume_token()` → `consumed_trial`

---

## 15. 구현 상태 체크리스트 (Implementation Checklist)

### Phase 1: Backend Core (Dice/Vault Logic)
- [/] `VaultProgram` 모델/Config 스키마 확장 (defaults)
- [x] `DiceService` 이벤트 분기 로직 구현 (확률, 상태값)
- [x] `VaultService` 적립 로직 보강 (이벤트 모드, 페이테이블)
- [x] 단위 테스트 작성 (`tests/services/test_dice_service.py` -> `test_dice_event_integration.py`)

### Phase 2: Admin Operations
- [x] Admin API Endpoint 구현 (`admin_dice` update)
- [x] Admin UI (`DiceConfigPage`) 확장 - 이벤트 파라미터 폼
- [x] Admin Audit Log 연동

### Phase 3: User Experience
- [x] Frontend UI (Event Banner, Timer, Streak)
- [x] `DicePage` UI Update (Event Banner, Timer, State)
- [x] Result Modal Logic (Event Accrual Display)
- [ ] State Sync (Eligible, Progress)

### Phase 4: Verification & Ops
- [ ] E2E Test (Scenario)
- [ ] Grafana Dashboard / Alerts Setup
