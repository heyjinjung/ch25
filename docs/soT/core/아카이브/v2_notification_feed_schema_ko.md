문서 타입: API 스키마 / 아키텍처 표준
버전: v2.0
작성일: 2026-01-18
작성자: GitHub Copilot
대상: BE/FE/운영
상태: SoT

## 1. 목적 (Purpose)
- 유저에게 실시간으로 전달되는 공지/잭팟/게릴라 이벤트 메시지 형식을 정의한다.
- WebSocket 수신 규격을 통일한다.

## 2. 아키텍처 (Architecture)

### 2.1 채널 구조
| 채널명 | 용도 | 접근 권한 | Redis Channel |
| :--- | :--- | :--- | :--- |
| User Public Feed | 잭팟, 전체 공지, 게릴라 드롭 | All Users (No Auth) | `golden:v2:feed:public` |
| User Private | 개인 보상 알림(향후) | Authenticated | `golden:v2:feed:user:{user_id}` |
| Admin Ops | 운영 로그, 모니터링 | Admin Only | `golden:v2:ops:ws` |

### 2.2 연결 엔드포인트 (WS)
- URL: wss://api.cc-jm.com/ws/feed
- 프로토콜: JSON Text Frame

## 3. 메시지 봉투 (Message Envelope)
```json
{
  "type": "JACKPOT_WIN",
  "timestamp": 1705300000000,
  "id": "uuid-v4-string",
  "payload": { }
}
```

## 4. 상세 페이로드 (Payload Schemas)

### 4.1 잭팟 당첨 (JACKPOT_WIN)
```json
{
  "type": "JACKPOT_WIN",
  "payload": {
    "game_type": "ROULETTE",
    "reward_amount": 50000,
    "is_mega": true
  }
}
```

### 4.2 게릴라 이벤트 (GUERRILLA_DROP)
```json
{
  "type": "GUERRILLA_DROP",
  "payload": {
    "game_type": "LOTTERY",
    "event_name": "GOLDEN_TIME",
    "multiplier": 2.0,
    "duration_sec": 300,
    "message": "지금부터 5분간 복권 당첨 확률 2배!"
  }
}
```

### 4.3 시스템 공지 (SYSTEM_NOTICE)
```json
{
  "type": "SYSTEM_NOTICE",
  "payload": {
    "severity": "INFO",
    "title": "서버 점검 안내",
    "content": "잠시 후 03시부터 점검이 시작됩니다.",
    "link_url": null
  }
}
```

### 4.4 개인 알림 (USER_ASSET_UPDATE) - Future
```json
{
  "type": "USER_ASSET_UPDATE",
  "payload": {
    "asset_type": "VAULT",
    "delta": 500,
    "current_balance": 1500,
    "reason": "MISSION_CLEAR"
  }
}
```

## 5. 구현 가이드 (Implementation Guide)

### 5.1 Backend
1. Publisher: NotificationService에서 `redis.publish("golden:v2:feed:public", message)` 호출.
2. Consumer: UserFeedWorker가 Redis 구독 후 WebSocket 연결 클라이언트에 브로드캐스트.
3. Filtering: nickname 마스킹은 전송 전 단계에서 수행.

### 5.2 Frontend
1. Connection: 앱 실행 시 /ws/feed 연결 유지.
2. Buffer: 잭팟 메시지 폭주 대비 내부 버퍼 사용.
3. Fallback: WS 끊김 시 재연결, 중요 공지는 REST 폴링.

## 6. 용어 정합 (V2 기준)
- 금고포인트/레벨포인트 등 핵심 용어는 V2 SoT 문서를 따른다.
- Redis 채널명은 [Redis 키/채널 SoT](../01_core/v2_redis_keys_channels_sot_ko.md)와 일관성을 유지한다.

## 7. 변경 이력
- v2.0 (2026-01-18, GitHub Copilot): v1 문서 기반 V2 SoT 생성
