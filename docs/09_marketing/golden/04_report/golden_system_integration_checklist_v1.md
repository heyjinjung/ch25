---
Project: Golden
Type: Report
Author: Antigravity (AI) & USER
Status: Draft
Last Updated: 2026-01-17
---

# Golden 시스템 유기적 연동 점검 체크리스트 (v1)

본 문서는 Golden 파이프라인이 **유기적으로 연동되는지** 확인하는 운영 점검 체크리스트입니다.

---

## 1) 이벤트 흐름(외부/내부 병렬)
- [ ] 내부 게임 로그 → `stream:raw_logs` 발행 확인
- [ ] 외부 로그 → `stream:raw_logs` 발행 확인
- [ ] 워커가 `LOSS_STREAK/ASSET_DEPLETION/SESSION_END` 감지
- [ ] `ch25_events` publish 확인

## 2) 상태 저장(Redis)
- [ ] `ch25:state:*:loss_streak` 누적 확인
- [ ] `ch25:state:*:session_loss` 갱신 확인
- [ ] 심리 상태(`psychological_state`) 저장 확인

## 3) Feature Flag/실험군
- [ ] `CH25_INTERVENTION_ENABLED` 동작 확인
- [ ] `CH25_DDA_ENABLED` 동작 확인
- [ ] `experiment_group` payload 포함 확인
- [ ] Control 그룹은 개입 미발행 확인

## 4) 실시간 전달
- [ ] WS 구독 경로에서 이벤트 수신 확인
- [ ] UI 토스트/개입 노출 확인

## 5) 운영 안전장치
- [ ] Redis 장애 시 fail-open 동작 확인
- [ ] 쿨다운(중복 억제) 동작 확인
- [ ] 어뷰징 필터(반복 금액/주기) 동작 확인

---

## 점검 결과 기록
- 점검 일시:
- 담당자:
- 요약:
- 이슈/조치:

### 진행 과정 요약
- Redis 연결 확인: `PING`
- `stream:raw_logs` / `ch25_events` 초기 상태 확인 (XINFO/XLEN/PUBSUB)
- 테스트 이벤트 주입(INTERNAL_GAME_RESULT) → 워커 소비 확인
- JSON 형식 오류 확인 → stdin 방식으로 유효 JSON 재주입
- `ch25:state:*` 상태 키 갱신 확인(LOSS_STREAK/psych_state 등)
- `CH25_*` 플래그 미설정 확인 → override 적용 후 재기동
- `ch25_events` 구독 로그 확보 → publish 메시지 수신 확인(LOSS_STREAK/ASSET_DEPLETION, experiment_group 포함)
- 체크리스트 문서에 1~5차 증거 로그 기록

### 증거 수집 로그 (1차)
- 일시: 2026-01-18
- 대상: `stream:raw_logs`, `ch25_events`
- 결과:
	- `stream:raw_logs` 길이 0 (이벤트 없음)
	- `ch25_events` 채널 구독 없음
	- 워커 그룹 `group:retention_workers` 존재
- 상태: **미확인(이벤트 발생 증거 없음)**

### 증거 수집 로그 (2차)
- 일시: 2026-01-18
- 대상: `ch25:state:*` 키
- 결과:
	- `ch25:state:*` 키 없음 (상태 갱신 증거 없음)
- 상태: **미확인(상태 갱신 증거 없음)**

### 증거 수집 로그 (3차)
- 일시: 2026-01-18
- 대상: 테스트 이벤트 주입 → 워커 소비 확인
- 결과:
	- `stream:raw_logs` 길이 5 (테스트 이벤트 주입됨)
	- 그룹 `group:retention_workers` entries-read = 5, pending = 0
	- `ch25:state:999999:*` 키 없음 (상태 갱신 미확인)
- 상태: **부분 확인(이벤트 유입/소비 확인, 상태 갱신 미확인)**

### 증거 수집 로그 (4차)
- 일시: 2026-01-18
- 대상: 테스트 이벤트(유효 JSON) 주입 → 상태 갱신 확인
- 결과:
	- `ch25:state:999999:loss_streak` = 5
	- `ch25:state:999999:psych_state` = FRUSTRATED
	- `ch25:state:999999:session_loss` = 0
	- 그룹 `group:retention_workers` entries-read = 15, pending = 0
	- `CH25_*` 환경변수 미설정 → `ch25_events` publish 미확인
- 상태: **부분 확인(상태 갱신 확인, publish/WS는 플래그 필요)**

### 증거 수집 로그 (5차)
- 일시: 2026-01-18
- 대상: `ch25_events` publish 구독 로그
- 결과:
	- `ch25_events` 채널 메시지 수신 확인
	- 이벤트 타입: `ASSET_DEPLETION`, `LOSS_STREAK`
	- `experiment_group` 포함 확인 (FREE_SPIN/CASHBACK/MISSION)
- 상태: **부분 확인( publish 확인, WS/UI는 별도 확인 필요 )**

### 증거 수집 로그 (6차)
- 일시: 2026-01-18
- 대상: WS 수신 + 쿨다운 키
- 결과:
	- WS `/api/ws/events` 수신 확인 (LOSS_STREAK payload)
	- 쿨다운 키 존재: `ch25_events:cooldown:LOSS_STREAK:1002` = 1
	- 쿨다운 키 존재: `ch25_events:cooldown:ASSET_DEPLETION:1002` = 1
- 상태: **부분 확인(WS 수신/쿨다운 확인, UI는 미확인)**

### 증거 수집 로그 (7차)
- 일시: 2026-01-18
- 대상: UI 토스트 / Fail-Open
- 결과:
	- UI 토스트: 브라우저(http://localhost:3000) 오픈 후 이벤트 주입 완료 (시각 확인 필요)
	- UI 토스트 제한: 텔레그램 인증 필요로 로컬 확인 불가
	- Fail-Open: Redis 중지 상태에서 백엔드 `/` 200 응답 확인
- 상태: **부분 확인(UI 수동 확인 필요)**

### 증거 수집 로그 (8차)
- 일시: 2026-01-18
- 대상: DB 영속성(event_participation_log)
- 결과:
	- user_id=2 이벤트 로그 생성 확인 (`ASSET_DEPLETION`)
	- Redis 중지 상태에서도 동일 로그 조회 확인
- 상태: **확인(DB 영속성 증거 확보)**

### 증거 수집 로그 (9차)
- 일시: 2026-01-18
- 대상: 개입/재참여 API 구현 반영
- 결과:
	- `/api/retention/intervention/resolve` 구현 완료
	- `/api/retention/reengagement/queue` 구현 완료
	- Reward_Size ≤ Cmax 캡 + ROI 로그(`retention_roi_log`) 구현 완료
- 상태: **부분 확인(코드 구현 완료, 운영 호출 증거 미확인)**
