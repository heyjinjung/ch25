# 공용 채팅 설계 초안

## 목표
- 단일 공개 채널에서 모든 회원이 실시간으로 대화
- 욕설/스팸 최소화, 메시지는 당일(24h)만 보존

## 데이터/보존 정책
- 메시지 보존: 24h 이후 배치 삭제
- 조회: 커서 기반 `GET /api/chat/public?cursor=...&limit=50`
- 테이블: `public_chat_message(id PK, user_id, nickname, text, created_at)`
- 인덱스: `(created_at)`

## 금칙어/필터
- 금칙어: ["먹튀", "사고"] 포함 시 저장/브로드캐스트 차단
- 차단 시 system 알림: "금칙어 포함으로 전송 실패"
- XSS 방지: 저장 시 이스케이프 또는 렌더 시 sanitize

## 레이트리밋(러프 제안)
- 전송: 사용자별 1msg/2s, 버스트 3 → 초과 시 429 + "잠시 후 다시 시도"
- 동시 연결: 사용자별 최대 3 WebSocket
- 메시지 길이: 최대 500자(~2KB)

## 백엔드(FastAPI)
- WebSocket: `/ws/chat/public` (JWT 필수)
  - 수신: `{type:"message", text}`, `{type:"ping"}`
  - 송신: `{type:"message", payload:{id,user_id,nickname,text,created_at}}`, `{type:"system",text}`, `{type:"pong"}`
  - ping/pong + idle timeout(예: 60s)
- 브로드캐스트: Redis pub/sub (다중 인스턴스 대비)
- 보존 배치: 하루 이전 메시지 삭제

## REST 이력
- `GET /api/chat/public?cursor=...&limit=50` (무한 스크롤용)

## 프론트엔드(React)
- 훅 `usePublicChat`: WebSocket 연결/재연결, heartbeat, 수신 스트림, 전송 큐(옵션)
- UI: 메시지 리스트(가상 스크롤), "이전 메시지 더보기", 입력창(500자 제한, 남은 글자 표시), 상태(연결/재연결), 실패 시 토스트/배너

## 운영/관리
- 금칙어: 환경변수/DB로 확장 가능
- 레이트리밋/필터 로그 적재(모니터링)
- 공지 시스템 메시지: `{type:"system", text:"공지 ..."}`

## 구현 순서
1) DB 테이블 생성 + 24h 보존 배치
2) REST 이력 조회 + 커서 페이지네이션
3) WebSocket 브로드캐스트 + 필터/레이트리밋
4) 프론트 훅/컴포넌트(전송/수신/이력)
5) 운영 툴(금칙어/공지 관리) 필요 시 추가
