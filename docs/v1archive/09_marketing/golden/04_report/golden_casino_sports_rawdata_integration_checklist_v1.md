---
Project: Golden
Type: Report
Author: Antigravity (AI) & USER
Status: Draft
Last Updated: 2026-01-18
---

# 카지노/스포츠/슬롯 원본 데이터 기반 연동 구현 체크리스트 (v1)

목표: **카지노 로데이터/스포츠/슬롯 원본 데이터**를 기반으로
`LOSS_STREAK/ASSET_DEPLETION/SESSION_END`를 **실시간 또는 준실시간으로 감지**하고
`ch25_events`까지 연결하여 **개입이 실제로 동작**하도록 증거를 확보한다.

참조 문서:
- 이벤트 정의: [docs/09_marketing/golden/02_tech_spec/golden_event_definition_v1.md](docs/09_marketing/golden/02_tech_spec/golden_event_definition_v1.md)
- 로그 파이프라인: [docs/09_marketing/golden/02_tech_spec/golden_log_pipeline_spec_v1.md](docs/09_marketing/golden/02_tech_spec/golden_log_pipeline_spec_v1.md)
- 외부 로그 인제스트: [docs/09_marketing/golden/02_tech_spec/golden_log_ingestion_v1.md](docs/09_marketing/golden/02_tech_spec/golden_log_ingestion_v1.md)
- ch25_events 경로: [docs/09_marketing/golden/02_tech_spec/golden_ch25_events_implementation_plan_v1.md](docs/09_marketing/golden/02_tech_spec/golden_ch25_events_implementation_plan_v1.md)
- 알람 기준: [docs/09_marketing/golden/04_report/golden_monitoring_alert_criteria_v1.md](docs/09_marketing/golden/04_report/golden_monitoring_alert_criteria_v1.md)

---

## 1) 데이터 소스 확보/정의
- [ ] 카지노 로데이터 원본 포맷 정의 (필드: 시간/유저/게임/베팅/결과/정산)
  - [x] 시간 필드 포맷/KST 변환 규칙 확정 (YYYY/MM/DD HH:MM:SS, KST)
  - [x] 시간 필드 누락/오류 시 처리 규칙(스킵/리젝트) 확정 (오류/누락 row 리젝트)
  - [x] 게임 타입 값 규격(에볼루션/프라그마틱/BTi SPORTS) 확정
  - [x] 결과 필드(승/패/당첨금) 정규화 규칙 확정 (결과=0원 패배, >0원 승리)
  - [x] 베팅/결과 라인 구분 규칙(베팅/결과 텍스트) 확정
  - [x] 당첨금 0원 → 패배 판정 규칙 확정
  - [x] 금액 필드 단위(원/콤마) 파싱 규칙 확정
- [x] 스포츠 배팅 원본 포맷 정의 (필드: 경기/베팅/적중/배당/결과)
  - [x] 경기 식별자/타임스탬프 매핑 규칙 확정 (베팅일시: YYYY/MM/DD HH:MM, KST)
  - [x] bet_type/종목 구분 규칙 확정 (베팅타입: 조합/스페셜)
  - [x] 적중/미적중 판정값 표준화 (적중=미적중/공란)
  - [x] 배당/정산 금액 단위 통일 (원, 콤마 포함)
  - [x] 정산 금액 미기재 시 처리 규칙(베팅만/대기) 확정 (환급/적중 공란)
- [x] 슬롯 원본 포맷 정의 (필드: 게임/스핀/베팅/당첨/결과)
  - [x] 스핀 ID/세션 ID 존재 여부 확인 (미존재)
  - [x] 당첨금 0원 → 패배 판정 규칙 확정 (결과=0원)
  - [x] 베팅 단위/통화 단위 통일 (원, 콤마 포함)
  - [x] 슬롯 게임명 표준화 규칙(한글/영문 혼재) 확정 (원본 게임명 그대로 저장)
- [ ] 소스별 **user_id 매핑 규칙** 확정 (닉네임→user_id)
  - [x] 닉네임 중복/변경 대응 규칙(최근 매핑 우선 등) 확정 (최근 매핑 우선)
  - [x] 외부 ID 추출 규칙(이름 내 괄호값 등) 확정 (예: 오동수(dongccuu3152))
  - [x] 마스킹 ID 대응(해시 키 생성/추적) 규칙 확정 (괄호 ID 해시 키 사용)
  - [x] 매핑 실패 시 처리 규칙(스킵/보류 큐) 확정 (리젝트 큐 보관)
  - [x] 매핑 캐시 전략(메모리 캐시 TTL) 확정 (TTL 24h)
- [ ] 파일/스트림 인입 경로 확정 (CSV/API/SFTP)
  - [x] 인입 주기(실시간/3시간 배치) 확정 (3시간 배치)
  - [x] 파일명 규칙/스키마 버전 태그 정의 (YYYYMMDD_*_raw)
  - [x] 최소 검증(필수 컬럼/형식) 실패 시 리젝트 규칙 (필수 컬럼 없으면 리젝트)
  - [x] 인코딩 규칙(UTF-8 BOM 허용) 확정 (UTF-8 BOM 허용)
  - [x] 구분자 규칙 확정 (스포츠=탭, 슬롯=CSV 콤마)
  - [x] 대용량 분할 업로드 기준(청크 크기) 확정 (1,000 라인)

## 2) 원본 → 표준 이벤트 변환 규칙
- [ ] `LOSS_STREAK` 판정 규칙 고정
  - 승/패 기준(SoT): `reward_type = NONE` = 패배
  - 연패 임계치(게임별): 슬롯/카지노/스포츠 기준 확정
  - [x] win_amount=0 처리 및 연패 카운터 증감 규칙 확정 (슬롯 결과=0원 → 패배)
  - [x] streak 리셋 조건(승리/재입금/세션 종료) 확정 (승리 시 리셋)
- [ ] `ASSET_DEPLETION` 판정 규칙 고정
  - 세션 손실/시간 구간 손실 기준 확정
  - [x] StartBalance 기준 시점(세션 시작/일 시작) 확정 (세션 시작 기준)
  - [x] 손실 비율 계산식 및 rounding 규칙 확정 (소수점 2자리 내림)
- [ ] `SESSION_END` 판정 규칙 고정
  - 30분 무활동 정의 확정
  - [x] 마지막 활동 소스(로그인/베팅/페이지 이동) 확정 (베팅 로그 기준)
- [ ] 게임 타입 판정 규칙 고정
  - 스포츠: `game_type`가 `sports:` 접두어
  - 슬롯: `game_type`에 “슬롯/부운” 포함
  - 카지노: 그 외 전부
  - [x] 원본 게임명 → 내부 game_type 매핑 테이블 확정 (그 외=casino)

## 3) 인제스트 파이프라인 구현
- [x] 원본 로그 → `stream:raw_logs` 적재 확인
- [x] 파서가 원본 필드를 **표준 구조**로 변환
- [x] 파서가 **user_id** 매핑 성공하는지 확인 (닉네임/괄호 ID 매핑 기준 적용)
- [x] 파서가 **중복/이상치 필터** 적용 (완화 필터 포함)
  - [x] raw payload 스키마(`source`, `raw_text`, `timestamp`) 검증 (누락 시 리젝트)
  - [x] 처리 실패 row 별도 보관(리젝트 큐/파일)
  - [x] 파싱 성공률/실패률 로그 기록 (일 단위 집계)

## 4) 워커 감지/이벤트 발행
- [x] 워커가 `LOSS_STREAK` 감지 → Redis 상태 갱신
- [x] 워커가 `ASSET_DEPLETION` 감지 → Redis 상태 갱신
- [x] 워커가 `SESSION_END` 감지 → 상태 갱신
- [x] 임계치 충족 시 `ch25_events` publish 확인
  - [x] publish payload 표준화(`event_type`, `timestamp`, `data`)
  - [x] 쿨다운 키 적용 확인(`ch25_events:cooldown:*`)
  - [ ] publish 실패/재시도 로깅 정책 확정

## 5) 실시간 전달/개입
- [x] FastAPI가 `ch25_events` 구독
- [x] WS `/api/ws/events` 수신 확인
- [x] 클라이언트 토스트/개입 표시 확인
- [x] 쿨다운/어뷰징 필터 동작 확인

## 6) 운영 증거 수집 (필수)
- [ ] Redis 키 스냅샷 (`stream:raw_logs`, `ch25:state:*`)
  - [ ] `stream:raw_logs` 길이/lag 확인 (Consumer Group pending 포함)
  - [ ] `ch25:state:{user}:loss_streak`/`session_start_balance`/`psych_state` 존재 확인
  - [ ] 이벤트 발생 시점 전/후 값 비교 스냅샷(캡처 2회)
- [ ] `ch25_events` publish 로그 캡처
  - [ ] 이벤트 타입별 로그 분리(`LOSS_STREAK`/`ASSET_DEPLETION`/`SESSION_END`)
  - [ ] payload 필수 필드 확인(`event_type`,`timestamp`,`data.user_id`,`data.game_type`)
  - [ ] 쿨다운 히트/미스 로그 동시 확보(중복 발행 방지 증거)
- [ ] WS 수신 로그 캡처
  - [ ] `/api/ws/events` 연결/재연결 로그
  - [ ] 서버 수신 → 클라이언트 전달 시간(타임스탬프 기준) 기록
  - [ ] 수신 이벤트 타입별 토스트 매핑 로그 확인
- [ ] UI 토스트 캡처
  - [ ] 이벤트 타입별 화면 캡처(3종)
  - [ ] 동일 유저 중복 토스트 미발생 증거(쿨다운 적용)
- [ ] DB row 증거 (event_participation_log 등)
  - [ ] 이벤트 발생 직후 row 생성 여부
  - [ ] user_id/event_type/created_at 스냅샷
  - [ ] 보상/개입 로그 테이블 연계(있을 경우) 캡처
  - [ ] 실패/리젝트 로그(매핑 실패/스키마 실패) 보관 증거

## 7) 알람/롤백 기준 적용
- [ ] 알람 기준 임계치 설정 반영
  - [ ] 이벤트 발행 실패율/파싱 실패율 알람 임계치 반영
  - [ ] WS 수신 실패/끊김 알람 기준 반영
  - [ ] 쿨다운 키 누락/과다 발행 감지 알람 반영
- [ ] 롤백 플래그 토글 검증 (`CH25_INTERVENTION_ENABLED=false` 등)
  - [ ] 토글 OFF 시 publish 중지 + UI 개입 미노출 확인
  - [ ] 토글 ON 복구 시 정상 발행/수신 재개 확인
  - [ ] 롤백 시점 전후 로그 비교(이벤트 수/토스트 수)
- [ ] Fail-Open 동작 확인
  - [ ] Redis 장애/timeout 시 서비스 요청 허용 확인
  - [ ] 장애 시 기본 UX 유지(개입 비활성) 확인
  - [ ] 장애 복구 후 자동 정상화 확인

## 8) 프론트 구현 계획 (접목 포인트)
- [ ] WS 연결 수립(`/api/ws/events`) 및 재연결 정책 정의
  - [ ] 연결 실패/재연결 시 사용자 UX 기준(토스트/무표시) 확정
  - [ ] 이벤트 수신 시 로깅 훅(개발/운영 분리) 적용
- [ ] 이벤트 타입별 UI 매핑 확정
  - [ ] `LOSS_STREAK` → 무료 스핀/미션 토스트
  - [ ] `ASSET_DEPLETION` → 캐시백/구제 토스트
  - [ ] `SESSION_END` → 복귀 유도 배너/토스트
- [ ] 중복 표시 방지(쿨다운)와 UI 상태 동기화
  - [ ] 동일 유저 동일 이벤트 2시간 내 중복 표시 방지
  - [ ] 클라이언트 단 캐시/세션 키 정책 확정
- [ ] 토스트 메시지/CTA 텍스트 확정(정책/톤 준수)
  - [ ] 금고 카피 금지어 검증(보상/이벤트/참여/충전)
  - [ ] 금액 정수 표기 준수

## 9) 접목 계획 (단계적 적용)
- [ ] 1단계: 감지/발행 검증만 수행(UI 미노출)
  - [ ] `ch25_events` 수신 로그만 저장
- [ ] 2단계: 내부 사용자(테스트 계정) 한정 UI 노출
  - [ ] user_id allowlist 적용
- [ ] 3단계: 일정 비율(예: 10%) 제한 노출
  - [ ] 해시 버킷 기준 분배 고정
- [ ] 4단계: 전체 공개 및 운영 기준 고정
  - [ ] 일 예산 캡/유저 1인 캡 적용 확인

## 10) 최종 총 테스팅 가이드
- [ ] 원본 로그 → 이벤트 → WS → UI 개입 E2E 시나리오 3종 통과
  - [ ] LOSS_STREAK 시나리오
  - [ ] ASSET_DEPLETION 시나리오
  - [ ] SESSION_END 시나리오
- [ ] 알람/롤백/Fail-Open 시나리오 통과
  - [ ] Redis 장애/복구
  - [ ] 플래그 OFF/ON 전환
- [ ] 운영 증거 수집 완료(6번 항목 전부)
  - [ ] Redis/Publish/WS/UI/DB 증거 링크 확보
- [ ] KPI 관측 포인트 설정 확인
  - [ ] D1/D7 리텐션, 세션 시간, 재접속 지표 스냅샷

---

## 완료 기준 (Definition of Done)
- 카지노/스포츠/슬롯 원본 로그에서 **LOSS_STREAK/ASSET_DEPLETION/SESSION_END**가 감지됨
- `ch25_events` → WS → UI 개입까지 **실시간 흐름 증거 확보**
- 운영 증거(로그/캡처/DB row) **모두 확인됨**

---

## 증거 기록 템플릿
- 점검 일시:
- 담당자:
- 소스(카지노/스포츠/슬롯):
- 이벤트 유형:
- 증거 링크(로그/스크린샷/DB row):
- 결과: ✅ 확인됨 / 🟡 부분 확인 / ❌ 미확인
