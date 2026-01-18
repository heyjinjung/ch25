---
Project: Golden
Type: Report
Author: Antigravity (AI) & USER
Status: Draft
Last Updated: 2026-01-17
---

# 증거 없음 항목 구현 계획서 (v1)

본 문서는 **"증거 없음(미확인)"**으로 분류된 항목들의 **구현/검증 계획**을 정리합니다.

---

## 1) 범위 정의

### 1-1. 대상 항목(증거 없음)
- 로그/이벤트 파이프라인 **운영 확인**
- 실시간 엔진(WS/Stream) **운영 확인**
- Dynamic Task/Intervention API **코드/운영 증거**
- Predictive Re-engagement **코드/운영 증거**
- Goldilocks 이벤트 감지 **운영 증거**
- DDA 적용 **운영 증거**
- 심리 상태 저장 **운영 증거**
- 가변 보상 알고리즘 **코드/운영 증거**
- Reward_Size ≤ Cmax **코드/운영 증거**

### 1-2. 비대상
- 이미 코드/스키마/배치 증거가 있는 항목

---

## 2) 구현/증거 확보 계획 (항목별)

### A. 로그/이벤트 파이프라인 운영 확인
**목표**: 내부/외부 로그가 `stream:raw_logs`로 유입되고 워커가 이벤트 발행했음을 증명.
- 구현 작업
  - 없음(코드는 존재). 운영 증거 확보만 필요.
- 증거 확보
  - Redis stream/consumer group 상태 스냅샷
  - `ch25_events` publish 로그 또는 샘플 payload 캡처
- 검증 체크
  - 내부 이벤트 1건, 외부 이벤트 1건 각각 유입 확인

### B. 실시간 엔진(WS/Stream) 운영 확인
**목표**: `/api/ws/events`에서 이벤트 수신 및 UI 개입 표시 확인.
- 구현 작업
  - 없음(코드는 존재). 운영 증거 확보만 필요.
- 증거 확보
  - WS 수신 로그/스크린샷
  - UI 토스트/개입 표시 화면 증거
- 검증 체크
  - LOSS_STREAK/ASSET_DEPLETION/SESSION_END 각각 1회 수신

### C. Dynamic Task/Intervention API
**목표**: 이벤트 → 개입(보상/미션) 매핑을 API 레벨에서 확정하고 코드 증거 확보.
- 구현 작업
  - 개입 라우트/서비스에 이벤트 타입별 처리 함수 추가
  - 보상 타입(Free Spin/Cashback/Mission) 분기 및 `experiment_group` 반영
- 증거 확보
  - 라우트/서비스 코드 변경 이력
  - API 호출 결과 로그
- 검증 체크
  - 이벤트별 API 응답 payload 확인

### D. Predictive Re-engagement
**목표**: 재참여 트리거 기준/채널을 코드 또는 운영 문서로 확정.
- 구현 작업
  - 최소형 스코프: DB/Redis 기반 트리거 기록 + 관리 콘솔용 큐
- 증거 확보
  - 스키마/코드/운영 로그
- 검증 체크
  - 기준 충족 유저 1명 이상 큐 생성

### E. Goldilocks 이벤트 감지 운영 확인
**목표**: 연패/자산급감/세션 종료 이벤트가 실제로 감지되는지 증거 확보.
- 구현 작업
  - 없음(코드는 존재). 운영 증거 확보만 필요.
- 증거 확보
  - Redis 상태 키(`ch25:state:*`) 값 스냅샷
  - `ch25_events` payload 캡처
- 검증 체크
  - 상태키 3종(`loss_streak`, `session_loss`, `psych_state`) 갱신 확인

### F. DDA 적용 운영 확인
**목표**: DDA가 룰렛/주사위/복권에 실제 적용되는지 증거 확보.
- 구현 작업
  - 없음(코드는 존재). 운영 증거 확보만 필요.
- 증거 확보
  - 게임 플레이 로그 내 `dda_applied` 플래그 캡처
- 검증 체크
  - DDA ON/OFF 각각 1회 결과 비교

### G. 심리 상태 저장 운영 확인
**목표**: `psychological_state`가 Redis에 저장되고 이벤트 payload에 포함됨을 증명.
- 구현 작업
  - 없음(코드는 존재). 운영 증거 확보만 필요.
- 증거 확보
  - Redis 키 `ch25:state:{user}:psych_state` 캡처
  - 이벤트 payload 내 `psychological_state`
- 검증 체크
  - FRUSTRATED/BORED 2종 이상 저장 확인

### H. 가변 보상 알고리즘 구현
**목표**: R0/α/β 기반 보상 빈도/가치 계산 로직 코드 반영.
- 구현 작업
  - 서비스 계층에 `RewardScheduler` 유틸 추가
  - 세그먼트/횟수별 감쇠 적용
- 증거 확보
  - 코드/테스트/로그
- 검증 체크
  - 동일 유저 반복 지급 시 보상 감소 확인

### I. Reward_Size ≤ Cmax 강제
**목표**: LTV 기반 상한 캡 로직을 보상 결정 단계에서 강제.
- 구현 작업
  - 보상 산정 서비스에 `Cmax` 계산과 상한 적용 추가
- 증거 확보
  - 코드/테스트/로그
- 검증 체크
  - LTV 낮은 유저에서 보상 상한 적용 확인

---

## 3) 공통 검증 템플릿
- 증거 유형: 로그 캡처 / 스냅샷 / UI 화면 / DB row
- 기록 위치: 운영 점검 문서 또는 티켓 첨부
- 상태 표기: **확인됨 / 부분 확인 / 미확인**

---

## 4) 산출물
- 운영 증거 수집 로그
- 코드 증거(커밋/파일 경로)
- 최종 체크리스트 업데이트

---

## 5) 상태 갱신 (2026-01-18)

상태 아이콘: ✅ 확인됨 / 🟡 부분 확인 / ❌ 미확인

- A. 로그/이벤트 파이프라인 운영 확인: ✅ **확인됨**
  - 내부 이벤트 주입/워커 소비/`ch25_events` 발행 증거 확보
- B. 실시간 엔진(WS/Stream) 운영 확인: 🟡 **부분 확인**
  - WS 수신 확인 완료(✅), UI 토스트는 텔레그램 인증으로 미확인(❌)
- C. Dynamic Task/Intervention API: 🟡 **부분 확인(운영 호출/로그 확인)**
- D. Predictive Re-engagement: 🟡 **부분 확인(운영 호출/로그 확인)**
- E. Goldilocks 이벤트 감지 운영 확인: ✅ **확인됨**
  - `loss_streak`/`psych_state` 갱신 증거 확보
- F. DDA 적용 운영 확인: ✅ **확인됨**
- G. 심리 상태 저장 운영 확인: ✅ **확인됨**
- H. 가변 보상 알고리즘 구현: 🟡 **부분 확인(운영 호출 메타 확인)**
- I. Reward_Size ≤ Cmax 강제: 🟡 **부분 확인(ROI 로그 생성 확인)**

추가 메모:
- 개입 API 응답 meta에 빈도/감쇠(`decay_factor`, `frequency_probability`, `frequency_multiplier`, `repeat_count`) 포함 확인

참조: [docs/09_marketing/golden/04_report/golden_system_integration_checklist_v1.md](docs/09_marketing/golden/04_report/golden_system_integration_checklist_v1.md)
