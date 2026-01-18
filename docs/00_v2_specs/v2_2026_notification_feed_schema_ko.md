# 알림 및 피드 스키마 SoT (Notification & Feed Schema)

**문서 타입**: API 스키마 / 아키텍처 표준
**버전**: v1.0
**작성일**: 2026-01-16
**상태**: SoT (Source of Truth)

---

## 1. 목적 (Purpose)
- 유저에게 실시간으로 전달되는 **공지 사항**, **잭팟 소식**, **게릴라 이벤트**의 데이터 형식을 정의한다.
- 프론트엔드(Client)가 웹소켓(WebSocket) 또는 SSE 연결을 통해 수신할 메시지 규격을 통일한다.
- 현재 어드민용(`ops:ws`)과 구분되는 유저용(`feed:public`) 채널의 표준을 수립한다.

---

## 2. 아키텍처 (Architecture)

### 2.1 채널 구조
| 채널명 | 용도 | 접근 권한 | Redis Channel |
| :--- | :--- | :--- | :--- |
| **User Public Feed** | 잭팟, 전체 공지, 게릴라 드롭 | **All Users** (No Auth) | `feed:public` |
| **User Private** | (향후) 개인 보상 알림, 승인 완료 | **Authenticated** | `feed:user:{user_id}` |
| **Admin Ops** | 운영 로그, 모니터링 | **Admin Only** | `ops:ws` (현행) |

### 2.2 연결 엔드포인트 (WS)
- **URL**: `wss://api.cc-jm.com/ws/feed`
- **프로토콜**: JSON Text Frame

---

## 3. 메시지 봉투 (Message Envelope)

모든 메시지는 아래 `Envelope` 구조로 전송됩니다.

```json
{
  "type": "JACKPOT_WIN",       // 메시지 타입 (Enum)
  "timestamp": 1705300000000,  // 발생 시각 (ms)
  "id": "uuid-v4-string",      // 메시지 고유 ID (Deduplication용)
  "payload": { ... }           // 타입별 상세 데이터
}
```

---

## 4. 상세 페이로드 (Payload Schemas)

### 4.1 잭팟 당첨 (JACKPOT_WIN)
고액 당첨자가 발생했을 때 전송됩니다. 실시간 티커(Ticker)에 사용됩니다.

```json
{
  "type": "JACKPOT_WIN",
  "payload": {
    "nickname": "Us****23",    // 마스킹된 닉네임 (Backend에서 마스킹 처리 필수)
    "game_type": "ROULETTE",   // 게임 종류 (ROULETTE, DICE, LOTTERY)
    "reward_amount": 50000,    // 당첨 금액
    "is_mega": true            // 메가 잭팟 여부 (화려한 연출 트리거)
  }
}
```

### 4.2 게릴라 이벤트 (GUERRILLA_DROP)
운영자가 '골든 타임'을 발동시켰을 때 전송됩니다.

```json
{
  "type": "GUERRILLA_DROP",
  "payload": {
    "game_type": "LOTTERY",    // 이벤트 대상 게임
    "event_name": "GOLDEN_TIME",
    "multiplier": 2.0,         // 확률 또는 보상 배율
    "duration_sec": 300,       // 유지 시간 (초)
    "message": "지금부터 5분간 복권 당첨 확률 2배!"
  }
}
```

### 4.3 시스템 공지 (SYSTEM_NOTICE)
긴급 점검 또는 일반 공지사항입니다.

```json
{
  "type": "SYSTEM_NOTICE",
  "payload": {
    "severity": "INFO",        // INFO, WARN, EMERGENCY
    "title": "서버 점검 안내",
    "content": "잠시 후 03시부터 점검이 시작됩니다.",
    "link_url": null
  }
}
```

### 4.4 개인 알림 (USER_ASSET_UPDATE) - *Future*
유저 재산 변동(미션 보상, 환전 완료 등) 알림입니다. (Private 채널)

```json
{
  "type": "USER_ASSET_UPDATE",
  "payload": {
    "asset_type": "VAULT",     // VAULT, XP, TICKET
    "delta": 500,              // 변동량
    "current_balance": 1500,   // 최종 잔액
    "reason": "MISSION_CLEAR"
  }
}
```

---

## 5. 구현 가이드 (Implementation Guide)

### 5.1 Backend
1. **Publisher**: `NotificationService`에서 `redis.publish("feed:public", message)` 호출.
2. **Consumer**: `UserFeedWorker`가 Redis 구독 후 WebSocket 연결된 클라이언트들에게 브로드캐스트.
3. **Filtering**: `nickname` 마스킹은 반드시 **Publisher(전송 전)** 단계에서 수행하여 개인정보 유출을 원천 차단.

### 5.2 Frontend
1. **Connection**: 앱 실행 시 `/ws/feed` 연결 유지.
2. **Buffer**: 잭팟 메시지가 폭주할 경우를 대비해, 내부 버퍼를 두고 3초에 1개씩 소비하거나 롤링 큐 사용.
3. **Fallback**: WS 연결 끊김 시 재연결 시도하되, 중요 공지는 REST API 폴링으로 백업 확인.

---

**작성자**: GitHub Copilot  
**마지막 업데이트**: 2026-01-16
