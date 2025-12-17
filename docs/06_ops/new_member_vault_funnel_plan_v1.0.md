# 신규회원 금고 퍼널 계획서 v1.0 (Lose 제거 버전)

- 문서 타입: 기획/개발 공용 퍼널 계획서
- 버전: v1.0
- 작성일: 2025-12-17
- 대상: PO/운영/백엔드/프론트/QA

## 0) 목표
- “꽝/패배” 감정을 제거하고, **내 돈이 금고에 쌓였다**는 확신을 먼저 만든다.
- 유저가 사이트에 들어오자마자 **‘잠긴 금고 금액’**을 보게 해서, 이후 행동(무료 주사위/입금)을 금고 중심으로 유도한다.

핵심 프레임
- Give(회사 보너스) → Take(내가 벌어둔 돈)
- “잭팟 실패”이지만 “금고 적립 성공”

---

## 1) 전체 플로우(요약)
### Step 1. 메시지/판정(신규회원 주사위)
- 5% 잭팟 성공 / 95% 잭팟 실패 연출
- 잭팟 실패 시에도 **신규 정착 지원금 10,000P가 임시 금고에 보관**됨
- CTA: “💰 내 금고 확인하러 가기” → 랜딩(홈)

### Step 2. 랜딩(홈) — 금고가 1번
- 상단 Sticky Bar: 🔒 보관 중 10,000원 항상 표시
- 메인 액션: “금고 채우기 주사위(무료)”
- 무료 주사위 1회: +5,000P 연출 → Sticky 금액이 15,000원으로 실시간 갱신

### Step 3. 해금 트리거(입금)
- 금고 옆 “잠금 해제” 버튼
- 클릭 시 팝업: “본인 확인용 최소 금액(1콩) 충전 시 금고가 열리고 보유 머니 합산”
- (옵션) 오늘 자정/24h 소멸 경고 문구

### Step 4. 입금 발생(외부랭킹 deposit_amount 증가)
- 조건: `신규유저 AND vault_balance > 0`
- 참이면: **vault_balance 전액을 실제 보유 머니로 지급**하고, `vault_balance=0`

---

## 2) 화면/멘트 상세(복사해서 바로 쓰는 버전)

### 2.1 Step 1: 신규회원 주사위 결과 화면(‘패배’ 금지)

표시
- (결과) “🎲 주사위 결과: 2 (잭팟 실패)”
- (시스템 메시지)
  - “아깝습니다! 잭팟은 터지지 않았지만…”
  - “신규 정착 지원금 10,000P가 [임시 금고]에 안전하게 적립되었습니다.”
- (버튼) “💰 내 금고 확인하러 가기”

주의
- “꽝/패배/패자부활” 단어 사용 금지
- 내부적으로 outcome 값이 LOSE/WIN이어도 UI 문구는 잭팟 프레임으로만 표기


### 2.2 Step 2: 랜딩/홈(금고 UI가 최상단)

**Sticky Bar(상단 고정)**
- 왼쪽: 🔒 (자물쇠)
- 중앙: “임시 금고 보관금: 10,000원”
- 오른쪽: 버튼 “잠금 해제”

**메인 액션 버튼(무료 주사위)**
- 버튼명: “🎲 금고 채우기 주사위(무료)”
- 클릭 후 연출:
  - “+5,000원 적립” 토스트/배지
  - Sticky 금액이 10,000 → 15,000으로 카운트업 애니메이션


### 2.3 Step 3: 잠금 해제 안내 팝업(입금 트리거)

팝업 본문(복붙)
- 제목: “🔓 잠금 해제 안내”
- 내용:
  - “현재 회원님의 신원 확인이 되지 않아 포인트가 잠겨있습니다.”
  - “본인 확인용 최소 금액(1콩) 충전 시, 금고가 즉시 열리며 보관금이 보유 머니로 합산됩니다.”
- 하단 경고(선택):
  - “※ 오늘 자정까지 미수령 시 자동 소멸될 수 있습니다.”


---

## 3) 데이터/DB 설계(확정: cash_balance + 원장 도입)

### 3.1 DB 변경
- `user` 테이블에 `vault_balance INT NOT NULL DEFAULT 0` 추가
- 목적: 실제 cash/지갑과 분리된 ‘임시 금고 잔액’을 저장

- `user` 테이블에 `cash_balance INT NOT NULL DEFAULT 0` 추가
- 목적: 해금된 금액을 **실제 보유 머니(현금성 잔액)** 로 합산하기 위한 기준 컬럼

- 신규 테이블 `user_cash_ledger` 추가(원장)
  - 목적: “언제/왜/얼마가 적립/차감됐는지” 감사/운영 확인
  - 컬럼 예시(권장):
    - `id` (PK)
    - `user_id` (FK, index)
    - `delta` (int)
    - `balance_after` (int)
    - `reason` (varchar)
    - `meta_json` (json)
    - `created_at` (datetime)

> 참고: 현재 코드베이스에는 “현금/포인트 원장(보유 머니)”가 구현되어 있지 않습니다([app/services/reward_service.py](../../app/services/reward_service.py)에서 POINT 지급은 deferred). 따라서 본 퍼널을 완성하려면 4.3의 방식대로 `cash_balance`/원장 구현이 필요합니다.


### 3.2 신규 유저 기본 시드(10,000)
정의
- `VAULT_SEED_AMOUNT = 10000`

정책
- “신규 유저” 판정은 기존 신규회원 시스템을 사용
  - 현재 코드에 `NewMemberDiceEligibility`가 존재하므로([app/models/new_member_dice.py](../../app/models/new_member_dice.py)), **eligible=true**를 신규 퍼널 대상자로 간주

시드 타이밍
- `GET /api/new-member-dice/status` 또는 홈 진입 시 호출하는 `GET /api/vault/status`에서
  - if eligible AND `user.vault_balance == 0` then `user.vault_balance = 10000`


---

## 4) 백엔드 구현 가이드(핵심 훅 2개)

### 4.1 Step 1(신규회원 주사위 play)에서 금고 적립
- 대상 파일: [app/services/new_member_dice_service.py](../../app/services/new_member_dice_service.py)

요구 변경
- 기존: LOSE면 “꽝” 문구
- 변경: 잭팟 실패 연출 + 금고 적립 성공

권장 동작
- 잭팟 실패(95%)일 때:
  - `user.vault_balance = max(user.vault_balance, 10000)` (또는 += 10000 정책)
  - 응답에 `vault_balance_after` 포함
- 잭팟 성공(5%)일 때:
  - 운영 정책에 따라 별도 CTA 또는 동일하게 금고로 넣어도 됨(결정 필요)

응답 스키마 제안
```json
{
  "jackpot": false,
  "vault_seeded": true,
  "vault_balance_after": 10000,
  "cta": {"label": "💰 내 금고 확인하러 가기", "path": "/"}
}
```


### 4.2 Step 4(입금 발생)에서 금고 전액 해금
- 대상 파일: [app/services/admin_external_ranking_service.py](../../app/services/admin_external_ranking_service.py)
- 근거: 현재 코드에서 ‘입금 발생’은 `external_ranking_data.deposit_amount` 증가로 감지 가능

정책
- if `eligible_new_user AND user.vault_balance > 0`:
  - `unlock_amount = user.vault_balance`
  - `user.vault_balance = 0`
  - unlock 로그(선택) 저장
  - unlock_amount를 “보유 머니”로 합산


### 4.3 “보유 머니” 저장 위치(현 코드베이스 제약)
현 상태
- `RewardService.grant_point()`가 실제 적립 구현이 없습니다.
- 게임 플레이는 주로 `user_game_wallet` 토큰(DICE_TOKEN/ROULETTE_COIN/LOTTERY_TICKET/CC_COIN)을 사용합니다.

결론(확정): **정석으로 간다**

- `user.cash_balance` 컬럼을 도입하고,
- `user_cash_ledger` 원장 테이블을 함께 도입하여,
- “금고 해금” 시 `cash_balance`에 합산 + 원장 기록을 남긴다.

구현 지침
- `RewardService.grant_point()`를 실제로 구현하여 `cash_balance`/원장을 갱신하도록 한다.
- 금고 해금은 `RewardService.grant_point(... reason="VAULT_UNLOCK")` 같은 단일 진입점으로 처리해, 추후 다른 적립(룰렛/복권/운영지급 등)도 같은 원장 체계로 통합한다.


---

## 5) 프론트엔드 구현 가이드

### 5.0 디자인 원칙(중요)
- “보상”처럼 보이지 않게, **내 자산(보관금)** 느낌으로 노출한다.
- ‘패배/꽝’ 단어 금지(표현은 **잭팟 실패**로 통일).
- 기존 Tailwind 톤/토큰을 그대로 사용한다(새 팔레트/새 테마를 추가하지 않는다).
- 숫자 변화는 **즉시/연속적으로 움직이는 애니메이션**으로 체감시키되, 과한 연출(새 페이지/모달 남발)은 금지.

High-Fidelity 가이드(핵심)
- 상단 금고 바는 “광고 배너”가 아니라 **내 자산 현황판**처럼 보여야 한다.
- 실패 연출은 “손해”가 아니라 **전환(보호 시스템 → 금고 이체 완료)** 으로 느껴져야 한다.
- 버튼은 “누르고 싶게”가 아니라 **눌렀을 때 확실히 반응**해야 한다(클릭감/햅틱/Active 입체감).
- 팝업은 “돈 내놔”가 아니라 **보안 해제(인증 충전)** 로 납득 가능해야 한다.

---

### 5.1 Step 1: 신규회원 주사위 결과 문구/CTA 변경
- 대상 파일: [src/pages/NewMemberDicePage.tsx](../../src/pages/NewMemberDicePage.tsx)
- 변경 사항
  - outcome === "LOSE" 문구를 폐기
  - “잭팟 실패” + “임시 금고 10,000P 적립” 문구로 교체
  - CTA 버튼: “💰 내 금고 확인하러 가기” → `navigate("/")`


### 5.2 Step 2: 홈 Sticky 금고 바 추가
- 대상 파일: [src/pages/HomePage.tsx](../../src/pages/HomePage.tsx)
- UI 요구
  - 화면 상단 고정(Sticky)
  - 🔒 + “임시 금고 보관금: {vault_balance}원”
  - 우측 “잠금 해제” 버튼

디자인 스펙(Sticky Bar = 내 자산 현황판)
- 스타일(Glassmorphism)
  - 배경: 투명(예: `bg-black/60`) + 블러(예: `backdrop-blur-md` 또는 `backdrop-blur-lg`)
  - 경계: 얇은 보더(예: `border-b border-white/10` 또는 기존 골드 톤을 쓰는 경우 `border-yellow-500/30`)
  - 레이아웃: 콘텐츠 위에 “떠 있는” 느낌(단, 새 shadow 토큰을 만들지 말고 Tailwind 기본 그림자만 사용)

- 구성(좌→우)
  1) 아이콘: 🔒 (vault_balance > 0이면 **은은한 Glow/Pulse**) 
     - 구현 예: 아이콘 뒤에 `animate-ping`을 매우 낮은 opacity로 깔거나(`opacity-10~20`), 컨테이너에 `animate-pulse`
  2) 텍스트(2줄)
     - 상단 라벨(작게): “임시 금고 보관금”
     - 하단 금액(크게): `{vault_balance.toLocaleString()}원`
  3) 보조 정보(오른쪽 구석)
     - “인증 충전 1콩 → 즉시 합산” (입금/충전 표현은 ‘인증/보안’ 프레임 권장)
     - **미니 타이머**: `23:59:59` 형태 카운트다운을 아주 작게 배치
  4) CTA 버튼: “잠금 해제 🔓” (Full rounded + 확실한 Active 반응)

- 상태
  - 로딩: 숫자 영역 스켈레톤 또는 “불러오는 중…”
  - 오류: “금고 정보 불러오기 실패” + 재시도 버튼(CTA는 disabled)
  - vault_balance=0: Sticky는 유지하되 라벨을 “금고 비어있음”으로 바꾸고 CTA 비활성

숫자 애니메이션(카지노 전광판 느낌)
- 권장: `react-countup` 같은 CountUp 컴포넌트 사용(숫자가 “드르륵” 올라가야 함)
- vault_balance 증가 시 추가 피드백
  - 숫자 색을 **잠깐 긍정 색(예: `text-green-400`)** 으로 300~600ms 바꿨다가 원래 색으로 복귀
  - 숫자 옆에 `+5,000` 배지를 1~2초 노출 후 페이드아웃

긴급 상태(손실 회피 자극)
- 남은 시간이 1시간 미만이면:
  - 타이머 색을 `text-red-400`으로 올리고,
  - Sticky 바 전체에 아주 은은한 붉은 펄스(`animate-pulse` + `bg-red-500/10` 같은 수준)를 적용(과한 경고 금지)

Tailwind 예시(프로젝트 토큰에 맞게 클래스는 조정)
```html
<div class="fixed top-0 z-50 w-full bg-black/60 backdrop-blur-lg border-b border-white/10 px-4 py-2 flex items-center justify-between">
  <div class="flex items-center gap-2">
    <div class="relative">
      <span class="animate-ping absolute inset-0 rounded-full bg-yellow-400 opacity-10"></span>
      <span class="text-yellow-400">🔒</span>
    </div>
    <div>
      <p class="text-[10px] text-gray-400 leading-none">임시 금고 보관금</p>
      <p class="text-lg font-bold text-yellow-400 leading-tight">15,000원</p>
      <p class="text-[10px] text-gray-400 leading-none">인증 충전 1콩 → 즉시 합산</p>
    </div>
  </div>
  <div class="flex items-center gap-3">
    <span class="text-[10px] text-red-400 tabular-nums">23:59:59</span>
    <button class="rounded-full px-3 py-1.5 text-xs font-bold bg-yellow-500 text-black active:scale-95 transition">
      잠금 해제 🔓
    </button>
  </div>
</div>
```

데이터
- `GET /api/vault/status` (신규 생성)로 vault_balance 조회


### 5.3 무료 “금고 채우기 주사위”
- 홈에서 버튼 클릭 → `POST /api/vault/fill` (신규)
- 성공 시 vault_balance 증가(+5,000) 애니메이션

디자인 스펙(메인 액션)
- 버튼명: “🎲 금고 채우기 주사위(무료)”
- 버튼 하단 보조 문구(작게): “굴릴 때마다 금고가 쌓입니다”
- 클릭 후 UX
  - 주사위가 굴러가는 간단한 로딩 상태(기존 주사위 컴포넌트가 있으면 재사용)
  - 성공 시: “금고에 +5,000원 보관 완료” 토스트(하단) + Sticky 숫자 즉시 반영
  - 실패 시: “잠시 후 다시 시도해주세요” 토스트

클릭감(타격감) 디테일
- Active 상태에서 입체감이 느껴지게(예: `active:scale-95` + `active:translate-y-0.5`)
- 햅틱(가능한 환경에서만)
  - 모바일 브라우저에서 `navigator.vibrate(10)` 같은 짧은 진동(지원 여부 체크 후 실행)
  - 미지원 환경은 버튼 Active 애니메이션만으로 대체

누적의 재미(동질감/스트리밍 문구)
- 버튼 근처에 작은 문구를 추가:
  - “현재 12,402명이 금고를 채우고 있습니다”
- 데이터는 v1에서는 정적/캐시 값으로 시작해도 됨(실시간 구현은 v1.1에서 websocket/폴링으로 확장)

---

### 5.4 Step 3: “잠금 해제” 팝업 디자인
목표
- “왜 잠겨있나(신원확인)”를 핑계로 자연스럽게 입금 장벽을 합리화한다.

구성
- 제목: “🔓 잠금 해제 안내”
- 본문(그대로 사용):
  - “현재 회원님의 신원 확인이 되지 않아 포인트가 잠겨있습니다.”
  - “본인 확인용 최소 금액(1콩) 충전 시, 금고가 즉시 열리며 보관금이 보유 머니로 합산됩니다.”
- 강조 박스(추천):
  - “지금 해제하면: 보유 머니 +{vault_balance}원”
- 주의 문구(선택): “※ 오늘 자정까지 미수령 시 자동 소멸될 수 있습니다.”
- 하단 버튼
  - Primary: “1콩 충전하고 잠금 해제” (실제 충전 페이지/외부 링크로 연결)
  - Secondary: “나중에”

상태
- vault_balance=0이면 팝업 대신 “현재 해제할 금고 잔액이 없습니다” 안내

신뢰 디자인(보안 등급 컨셉)
- 일반 흰 배경 팝업이 아니라, **디지털 보안 카드**처럼 보이게(다크 카드 + 얇은 보더 + 블러)
- ‘입금’이라는 단어보다 **‘인증 충전’/‘보안 해제’** 표현을 우선

해금 혜택 리스트(체크리스트)
- [✅] 신규 정착금 수령 준비 완료
- [✅] 10+10 입플 혜택 대기 중
- [❌] 본인 확인 및 잠금 해제 필요 (미완료)

Progressive Disclosure(진행률 바)
- 팝업 하단에 진행률 바를 배치(예: 현재 20%)
- “1콩 인증 충전”을 누르면 100%로 차오를 것 같은 기대감을 시각화

CTA 문구(이득의 구체화)
- 금고 잔액 + 입플(있는 경우)을 합산해 상단에 크게:
  - “총 수령 가능 금액: {total_receivable}원”
- 버튼 문구 예시:
  - “1콩 인증 충전하고 {total_receivable}원 받기”

(선택) 입금 확인 시 보상 연출
- 입금 확인 → 🔒 아이콘이 🔓로 전환 + 짧은 축하 토스트
- Confetti 같은 강한 연출은 v1에서는 옵션(과하면 ‘카지노’로 느껴질 수 있음)

---

### 5.5 Step 1: 신규회원 주사위 결과 화면(텍스트/구성)
현재 [src/pages/NewMemberDicePage.tsx](../../src/pages/NewMemberDicePage.tsx)에는 `outcomeToMessage()`가 있어 WIN/LOSE 문구를 리턴한다.

변경 지침
- 화면에 표시되는 결과 문구는 아래로 고정:
  - 타이틀: “🚨 잭팟 당첨 실패… 하지만!”
  - 본문: “시스템상 ‘신규 정착 지원금 10,000P’가 발생하여 [임시 금고]에 보관되었습니다.”
  - 보조: “그냥 두면 소멸될 수 있어요. 금고에서 바로 확인하세요.”
- CTA 버튼을 결과 카드 내부에 배치:
  - “💰 내 금고 확인하러 가기”

디자인/연출
- 결과 카드에서 **금고 아이콘(🔒)** 과 “+10,000 보관 완료” 배지를 함께 보여주고,
- CTA 클릭 시 홈으로 이동 후 Sticky 바가 바로 보이도록 스크롤 위치를 상단으로 고정한다.

High-Fidelity 연출(‘실패’ → ‘전환’)
- 전환 오버레이(짧게)
  - 주사위가 멈춘 직후, 기존 ‘잭팟 실패’ 텍스트를 바로 띄우지 말고
  - 화면을 살짝 어둡게(`bg-black/40` 같은 오버레이) + 짧은 로딩바를 표시:
    - 문구: “신규 유저 보호 시스템 가동 중…”
  - 600~1200ms 내로 끝내고, 다음 연출로 연결(지연이 길면 피로)

- Fly-to-vault(금고로 빨려 들어가는 연출)
  - 주사위 옆의 “10,000P” 배지/아이콘이 상단 Sticky Bar의 금고 아이콘 위치로 ‘슝’ 이동 후 사라짐
  - 구현 방식(권장 순서)
    1) DOM 좌표를 `getBoundingClientRect()`로 잡고(출발: 배지, 도착: Sticky 금고 아이콘)
    2) 절대 위치 요소를 한 개 생성한 뒤,
    3) Web Animations API 또는 CSS keyframes로 translate 애니메이션 수행
  - 효과 목표: “내 돈이 안전하게 금고로 이동했다”는 시각적 확신

- 연출 완료 후
  - 결과 카드 문구 표시(보관 완료)
  - Sticky Bar 숫자가 CountUp으로 0 → 10,000(또는 기존 값 → +10,000) 반영


---

## 6) 운영/리스크(간단)
- “먹튀(체리피커)” 리스크: 1콩 입금만 하고 해금 후 이탈
  - 현재 v1.0은 전액 해금 구조이므로 리스크가 큼
  - 리스크 완화를 원하면 v1.1에서 **분할 해금(1콩 맛보기 5,000 / 5콩 전액15000)**로 확장 가능
- 문구 리스크: “소멸”을 강하게 넣으면 민감 반응 가능
  - A/B로 “자정까지 미수령 시 소멸” 문구 강도 조절 권장


---

## 7) v1.1(후속) 확장 메모 — 분할 해금(요청안)
원하시면 다음 버전에서 아래를 정식 스펙으로 분리합니다.
- 1콩: 5,000P만 해금(맛보기)
- 5콩 누적: 전액 해금 + 추가 혜택
- 상단 진행률 바(0/20/60/100%)

(이 확장은 DB에 `vault_balance`만 있으면 계산/표시 가능하지만, 누적 콩을 어디서 읽을지(=external_ranking deposit delta) 정책이 필요)
