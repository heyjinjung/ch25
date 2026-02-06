문서 타입: learned
버전: v1.0
작성일: 2026-02-06
작성자: GitHub Copilot
대상: 운영/기획/BE/FE
상태: SoT 후보

## 1. 목적 (Purpose)
운영 지표(마찰/생존율/퍼널/체리피커)를 **DB 기반으로 재현 가능**하게 만들기 위해,
- “무슨 로그가 필요한가”를 지표별로 정의하고
- 최소 구현(기존 테이블 재사용)으로 측정 가능하도록 이벤트/필드를 표준화한다.

## 2. 범위 (Scope)
- 지표:
  - (2) 마찰 충돌 지표(Friction Log)
  - (3) 명단 생존율(Active vs Zombie)
  - (4) 입금 전환 퍼널(Funnel Tracking)
  - (5) 체리피커(Winner) 비중
- 데이터 소스:
  - 백엔드: FastAPI + MySQL
  - 프론트: React(MiniApp)
  - 텔레그램: /start + WebApp 진입

## 3. 선행 SoT/근거 (Sources)
- W1/W2 운영 자동화·트래킹: docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/ops/20260203_ops_marketing_w1_w2_automation_tracking.md
- 이벤트 로그 테이블(기존): app/v2/models/core/feature.py (user_event_log)
- 게임 플레이 로그(기존): app/v2/services/game_common.py (event_name=PLAY)
- 환전 로그(기존, 성공만): app/v2/models/v2_exchange_log.py
- 운영일/타임존 원칙: Asia/Seoul(KST), 09:00 리셋

## 4. 현황(이미 있는 로그/측정 가능 범위)
### 4.1 user_event_log (권장: 범용 이벤트)
- 필드: user_id, feature_type, event_name, meta_json, created_at(UTC)
- 장점: 신규 지표/이벤트 추가가 쉬움(meta_json 확장)
- 한계: 캠페인/메시지/클릭을 “연결”하려면 correlation key(meta_json)가 반드시 필요

### 4.2 v2_exchange_log (현재: 성공 이벤트만)
- input/output 타입/수량 + created_at만 존재
- 마찰(실패 이유/닫힘/차단)은 기록 불가 → 추가 로그 필요

### 4.3 v2_user (현재: 입금 전환 대체)
- first_deposit_at, created_at 등을 통해 일부 퍼널 대체 가능
- 그러나 “메시지 클릭/봇 시작/앱 접속”은 원본 로그가 없으면 추정치가 됨

## 5. 지표별로 필요한 로그 정의

## 5.1 (2) 마찰 충돌 지표 (Friction Log)
### 5.1.1 목표
환전 신청 단계에서 유저가 ‘빡쳐서’ 닫는 지점을 정량화한다.
- 핵심은 “시도→실패(사유)→닫힘”의 **사유 코드**를 남기는 것

### 5.1.2 최소 이벤트(필수)
- EXCHANGE_MODAL_OPEN
  - meta_json: {"screen":"exchange","entry":"button|deeplink|notification", "campaign_id?":..., "message_id?":...}
- EXCHANGE_SUBMIT
  - meta_json: {"input_type":...,"input_amount":...,"output_type":...,"output_amount":...,"idempotency_key":...}
- EXCHANGE_VALIDATION_FAILED
  - meta_json: {
      "error_code":"GAME_PLAYS_INSUFFICIENT|ACTIVITY_INSUFFICIENT|BENEFITS_SUSPENDED|INSUFFICIENT_ITEM_QUANTITY|RATE_LIMIT|UNKNOWN",
      "detail":..., "required":..., "actual":..., "input_type":..., "input_amount":...
    }
- EXCHANGE_SUCCESS
  - meta_json: {"exchange_log_id":..., "input_type":...,"input_amount":...,"output_type":...,"output_amount":...}
- EXCHANGE_MODAL_CLOSE
  - meta_json: {"close_reason":"USER_CANCEL|AFTER_ERROR|AFTER_SUCCESS|NAVIGATE_AWAY|UNKNOWN", "last_error_code?":...}

### 5.1.3 집계 방법(일일)
- 일자 기준: 운영일(09:00 KST 리셋)
- 지표 예:
  - 실패건수(사유별): count(EXCHANGE_VALIDATION_FAILED group by error_code)
  - “에러 후 닫힘”: EXCHANGE_VALIDATION_FAILED 이후 N초 내 EXCHANGE_MODAL_CLOSE
  - “시도 대비 성공”: EXCHANGE_SUCCESS / EXCHANGE_SUBMIT

## 5.2 (3) 명단 생존율 (Active vs Zombie)
### 5.2.1 목표
전체 명단 중 최근 7일 내 텔레그램 클릭 또는 앱 접속이 1회라도 있었던 유저 비율.

### 5.2.2 최소 이벤트(필수)
- TG_DEEPLINK_CLICK (또는 LINK_CLICK)
  - meta_json: {"campaign_id":...,"message_id":...,"url":...,"utm":...,"click_id":...}
  - 구현 방식:
    - (권장) redirect 엔드포인트를 두고 클릭을 서버에서 기록
    - (대안) MiniApp 진입 시 query param을 서버로 전송하여 “클릭으로 간주”

- TG_START
  - meta_json: {"start_param":...,"campaign_id?":...,"message_id?":...}

- MINIAPP_OPEN (또는 APP_SESSION_START)
  - meta_json: {"session_id":...,"source":"telegram_webapp", "campaign_id?":...}

### 5.2.3 생존율 정의(권장)
- Active(7d) = 최근 7일 내 {TG_DEEPLINK_CLICK, TG_START, MINIAPP_OPEN} 중 1개라도 있는 user_id
- Zombie = 명단에는 있으나 Active(7d)가 아닌 user_id

## 5.3 (4) 입금 전환 퍼널 (Funnel Tracking)
### 5.3.1 목표
아래 단계 중 어디서 가장 많이 이탈하는지 확인한다.
- 메시지 클릭 → 봇 시작 → 게임 플레이 → 입금

### 5.3.2 퍼널 단계별 최소 이벤트(필수)
1) 메시지 클릭
- LINK_CLICK (또는 TG_DEEPLINK_CLICK)
  - meta_json: {"campaign_id":...,"message_id":...,"target_member_id?":...,"click_id":...,"utm":...}

2) 봇 시작
- TG_START
  - meta_json: {"start_param":...,"campaign_id?":...,"message_id?":...}

3) 게임 플레이
- PLAY (기존: game_common이 user_event_log에 기록)
  - meta_json: 결과 payload(이미 존재)
  - 추가 권장 meta: {"session_id":...,"campaign_id?":...,"message_id?":...}

4) 입금
- DEPOSIT_CONFIRMED (권장: 명시 이벤트)
  - meta_json: {"amount":...,"provider":"HQ_IMPORT|MANUAL|...","deposit_id?":...}
- (대안/보조) v2_user.first_deposit_at (이벤트 테이블이 없을 때 최소 대체)

### 5.3.3 연결 키(없으면 퍼널이 ‘추정’으로 전락)
아래 중 최소 1개는 반드시 남겨야 한다.
- campaign_id: 캠페인/발송 묶음 식별자
- message_id: 어떤 메시지에서 유입됐는지
- target_member_id: “누가 대상이었는지”(타겟리스트 멤버 단위)
- click_id: 클릭 단위(중복/재시도 제거)
- session_id: 앱 세션 단위

## 5.4 (5) 체리피커(Winner) 비중
### 5.4.1 목표
“혜택을 받아가는 유저 중 누적 마진이 마이너스(-)인 유저”의 비율.

### 5.4.2 먼저 정의해야 하는 것(필수)
- ‘혜택’의 범위:
  - 예: 바우처/무료티켓/골든 개입 보상/환영 보상/환전 보상 등
- ‘받아감’의 기준:
  - GRANT(지급)만으로 볼지, CLAIM/USE(사용/수령)까지 볼지

### 5.4.3 최소 이벤트(권장)
- BENEFIT_GRANTED
  - meta_json: {"benefit_type":...,"value":...,"currency":...,"source":"WELCOME|OPS|GOLDEN|ADMIN", "campaign_id?":...}
- BENEFIT_USED (또는 CLAIMED)
  - meta_json: {"benefit_type":...,"value":...,"use_context":"game|exchange|inventory"}

### 5.4.4 Winner 판정 데이터
- 누적 마진:
  - hq_prospective_user.total_margin 또는 v2_user_segment.total_margin
- 집계:
  - WinnerShare = count(benefit_users where total_margin < 0) / count(benefit_users)

## 6. 구현 원칙(최소 변경/최대 측정)
### 6.1 저장 위치 우선순위
1) user_event_log 재사용(가장 빠름)
2) 고볼륨 이벤트는 전용 테이블(클릭/세션)로 분리(필요할 때)

### 6.2 시간/운영일(09:00 KST) 정렬 규칙
- 저장: created_at은 UTC로 저장(서버 표준)
- 집계: 운영일 = (KST 시각에서 09:00을 하루의 시작으로) 계산
  - 예: operational_date = date( (created_at_utc + 9시간) - 9시간 )
  - 구현 시에는 “KST 변환 후 09:00 기준으로 date bucket”을 명시적으로 적용

### 6.3 이벤트 네이밍 규칙
- 화면/액션/결과 형태로 일관성 유지
  - 예: EXCHANGE_* / TG_* / APP_* / BENEFIT_* / DEPOSIT_*
- 실패는 반드시 error_code를 표준화(문자열 enum)

## 7. 다음 단계(권장 작업)
- (FE) MiniApp에서 EXCHANGE_MODAL_OPEN/CLOSE, EXCHANGE_SUBMIT 이벤트 송신
- (BE) 환전 검증 실패를 error_code로 매핑해 EXCHANGE_VALIDATION_FAILED 기록
- (BE) TG_START/DEEP LINK 파라미터를 DB로 적재(캠페인 연결)
- (BE) DEPOSIT_CONFIRMED 이벤트를 user_event_log에 기록(현재는 first_deposit_at만으로 대체 중)

## 8. 변경 이력
- v1.0 (2026-02-06, GitHub Copilot): 마찰/생존율/퍼널/체리피커 지표 측정을 위한 최소 로그 요구사항 정의
