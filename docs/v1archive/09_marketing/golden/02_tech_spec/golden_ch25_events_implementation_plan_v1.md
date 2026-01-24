---
Project: Golden
Type: TechSpec
Author: Antigravity (AI) & USER
Status: Draft
Last Updated: 2026-01-17
---

# ch25_events 구현 계획서 (v1)

본 문서는 **Redis Pub/Sub 채널 `ch25_events`**를 기반으로 한 실시간 개입 이벤트 전달 경로를 프로젝트 상황에 맞게 정의합니다.

---

## 1) 목적
- LOSS_STREAK / ASSET_DEPLETION / SESSION 이벤트를 **FastAPI로 실시간 전달**
- 개입(무료 스핀/캐시백/미션) 트리거를 **WebSocket → 클라이언트**로 연결

---

## 2) 이벤트 채널 정의
- **채널명**: `ch25_events`
- **발행 주체**: Event Processor (Python Worker)
- **구독 주체**: FastAPI WebSocket(신규) + 필요 시 Admin Ops

---

## 3) 데이터 흐름 (요약)
1. Game Server/Collector가 이벤트 감지
2. Event Processor가 조건 충족 시 `ch25_events`로 publish
3. FastAPI가 `ch25_events` 구독
4. WS/SSE로 클라이언트에 실시간 전달

---

## 4) 구현 범위

### A. Backend (FastAPI)
- 신규 WS 라우트 추가 (예: `/ws/events`) 또는 기존 `ws_feed` 확장
- `ch25_events` 구독 처리
- 이벤트 payload 표준화(JSON)

### B. Worker
- `LOSS_STREAK`, `ASSET_DEPLETION`, `SESSION_STATUS` 발생 시 publish
- 메시지 중복 방지(간단 TTL/Rate Limit)

### C. Client
- WS 연결 유지
- 수신 이벤트에 따라 UI 개입(무료 스핀/캐시백/미션)

---

## 5) 현재 구현 상태
- **FastAPI 구독 라우트 추가됨**: `/api/ws/events` → `ch25_events` 구독
- **Worker publish 구현됨**: `Ch25EventService.publish_event()` (쿨다운 포함)
- **Client 수신 처리 구현됨**: `/api/ws/events` 구독 + 토스트 알림 매핑

---

## 6) Worker publish 포맷(권장)
```json
{
	"event_type": "LOSS_STREAK",
	"timestamp": 1705481234000,
	"data": {
		"user_id": 1004,
		"game_type": "roulette",
		"current_streak": 5,
		"drop_ratio": 0.55
	}
}
```

---

## 7) Client 수신 처리(권장)
1. `/api/ws/events` 연결 유지 (PING/PONG)
2. `event_type` 기준으로 UI 개입 매핑
	 - `LOSS_STREAK` → 무료 스핀/미션 팝업
	 - `ASSET_DEPLETION` → 캐시백/구제 팝업
	 - `SESSION_END` → 리텐션 배너/복귀 유도

---

## 8) 리스크 & 가드레일
- **Redis 연결 실패**: fail-open (기존 UX 유지)
- **스팸 방지**: 유저당 이벤트 쿨다운 적용
- **보안**: 민감 정보 최소화, user_id 마스킹/토큰 기반 구독

---

## 9) 검증 체크리스트
- [x] `ch25_events` publish 동작 확인
- [x] FastAPI 구독 연결 확인
- [x] WS 수신 → UI 개입 표시 확인
- [x] 이벤트 쿨다운 동작 확인

### 검증 결과 (2026-01-17)
- `ch25_events` publish 서비스 추가: `Ch25EventService.publish_event()`
- WS 구독 라우트: `/api/ws/events`
- UI 개입 표시: 클라이언트 토스트 매핑 적용
- 쿨다운 로직: Redis `SET NX EX` 기반 적용

---

## 10) 참고 문서
- `golden_event_definition_v1.md`
- `golden_log_pipeline_spec_v1.md`
- `golden_realtime_architecture_v1.md`
