# Changelog: 2026-01-16 Live Feed Implementation

## 개요
- **목적**: 유저에게 실시간 공지/잭팟/게릴라 이벤트를 전달하기 위한 `Live Feed` 시스템 구축.
- **참조 문서**: `docs/00_meta/2026_notification_feed_schema_ko.md`

## 변경 사항

### 1. Feed Service (Publisher)
- **파일**: `app/services/feed_service.py` (신규)
- **기능**:
    - `publish_jackpot(user_id, game_type, amount, is_mega)`: 잭팟 발생 시 `feed:public` 채널로 메시지 발행.
    - 닉네임 마스킹 처리 내장 (`User****12` 형식).
    - Redis `publish` 사용.

### 2. WebSocket Endpoint (Consumer)
- **파일**: `app/api/routes/ws_feed.py` (신규)
- **주소**: `ws://.../ws/feed`
- **기능**:
    - `feed:public` 채널 구독 및 브로드캐스트.
    - Connection Manager 없음 (Redis Pub/Sub 직결 구조로 수평 확장성 고려).
    - Ping/Pong (`PING` 메시지 처리) 추가하여 연결 유지.

### 3. Application Wiring
- **파일**: `app/main.py`
- **변경**: `/ws/feed` 라우터 등록.

### 4. Game Service Integration (Trigger)
- **파일**: `app/services/roulette_service.py`
- **변경**: `play` 메서드 내에서 고액 당첨 발생 시 `FeedService.publish_jackpot()` 호출.
- **기준**: `POINT` 보상 10,000 이상 시 잭팟으로 간주.

## 테스트 계획
- [ ] `/docs` 에서 `/ws/feed` 연결 테스트 (혹은 Postman).
- [ ] 룰렛 플레이 시 고액 당첨 발생 시켜 메시지 수신 확인.

---

## 2차 업데이트 (Full Stack Integration) - 2026-01-16 14:00

### 5. Admin Configuration (Dynamic Thresholds)
- **파일**: `app/api/admin/routes/admin_feed_config.py`
- **기능**:
    - 잭팟 기준 금액(threshold, mega_threshold)을 `Vault2` Config에 저장하여 동적으로 관리.
    - 하드코딩(10,000) 제거 -> DB 설정값 우선(기본값 10,000 / 50,000).
    - 어드민 API `GET / PUT /admin/api/ops/feed/config` 제공.

### 6. Service Logic Enhancement
- **적용 서비스**: `RouletteService`, `DiceService`, `LotteryService`
- **로직**:
    - `FeedService.check_and_publish_jackpot()` 메서드로 통합.
    - 5,000 포인트 미만은 Fast-path로 무시 (DB 조회 최소화).
    - 주사위(Dice) 및 복권(Lottery) 당첨 시에도 트리거 작동하도록 연결.

### 7. Frontend Implementation
- **Store**: `src/stores/feedStore.ts` (Zustand)
    - WebSocket(`wss://.../api/ws/feed`) 자동 연결 및 Reconnect 전략(5초) 구현.
    - PING/PONG Keep-alive 및 메시지 큐(최신 20개) 관리.
- **Component**: `src/components/common/LiveFeedTicker.tsx`
    - Framer Motion을 활용한 상단 롤링 티커 UI.
    - 게임 타입(Roulette/Dice/Lottery)별 아이콘 및 메가 잭팟 전용 그라디언트 효과 적용.
- **Integration**: `src/components/layout/MainLayout.tsx`
    - 전역 레이아웃 최상단에 Ticker 배치 (모든 페이지 노출).

### 8. Infrastructure & Path Validation
- **Path**: WebSocket 경로를 `/api/ws/feed`로 변경.
    - 이유: Nginx Reverse Proxy 설정 상 `/api/` prefix가 있어야 Backend 컨테이너로 라우팅됨.
    - Frontend Store에서도 환경변수(`VITE_API_URL`)에 맞춰 `ws` or `wss` 프로토콜 자동 변환.

