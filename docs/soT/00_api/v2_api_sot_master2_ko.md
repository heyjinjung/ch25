문서 타입: API Spec Master
버전: v2.0 (Technical Integrated)
작성일: 2026-02-06
상태: Master SoT (Technical)

# Golden V2 API Technical Master Source of Truth (SoT)

> [!IMPORTANT]
> 본 문서는 Golden V2 프로젝트의 기술적 API 명세, 데이터 모델, 연동 가이드 및 통합 동기화 메커니즘을 정의하는 기술 마스터 SOT입니다. 
> OpenAPI 명세 및 도메인별 상세 계약서를 하나로 통합하여 개발 및 연동의 최종 기준을 제공합니다.

---

## 1. 기술 아키텍처 및 연동 원칙

### 1.1 전역 동기화 (Global Sync) 메커니즘
Admin에서의 변경 사항은 Redis Pub/Sub을 통해 실시간으로 시스템 전역에 전파됩니다.
- **Global Channel (`golden:v2:feed:public`)**: 전체 공지, 잭팟, 게릴라 이벤트 브로드캐스트.
- **User Channel (`golden:v2:feed:user:{id}`)**: 개인 자산 변동(입출금 승인), 티켓 지급 알림.
- **Intervention Channel (`golden:v2:events:intervention`)**: 개입 액션 및 트리거 발행.
- **Ops Channel (`golden:v2:ops:ws`)**: 운영 모니터링 및 결제 알림.

### 1.2 공통 연동 규격
- **API 프리픽스**: `/api/v2/` (Client), `/api/v2/admin/` (Admin)
- **인증**: `Authorization: Bearer <token>` (JWT 기반, ROLE_ADMIN 검증 필수)
- **에러 규격**:
  ```json
  {
    "success": false,
    "error": { "code": "ERROR_CODE", "message": "Korean message", "trace_id": "uuid" }
  }
  ```

---

## 2. 도메인별 상세 명세 (Contract Summary)

### 2.1 인증 및 유저 (Auth & User)
- **인증 흐름**: Telegram InitData 검증(`POST /auth/token`) 및 DevLogin 지원.
- **텔레그램 연동**: `init_data` 기반 연동 및 링크 토큰 발급.
- **활동 기록**: 유저 액션(ROULETTE_PLAY 등)을 `ActivityRecord`로 관리.

### 2.2 게임 엔진 (Game Engine)
- **룰렛/주사위/복권**: 각 게임의 `status` 조회 및 `play` 엔드포인트 표준화.
- **주사위 더블업**: 게임 결과 기반의 연속 배팅 지원 (`POST /dice/double-up`).
- **퍼즐 합체**: 복권 조각 수집 기반의 `GOLD_KEY_TICKET` 제작(`POST /exchange/craft`).

### 2.3 어드민 운영 (Admin Ops)
- **세그먼트 배치**: 유저 분류 엔진 실행 (`POST /segments/run`).
- **운영 메시지**: 인박스(Inbox) 메시지 생성 및 타겟팅 팬아웃.
- **위기 레이더**: 시스템 상태, 고가치 유저(Whales), 이탈 위험군 모니터링(`GET /admin/ops/status`).

### 2.4 경제 및 로그 (Economy & Logs)
- **자산 조정**: 유저별 금고/티켓 수동 조정 및 Audit Trail(이유 기록) 필수.
- **입출금 관리**: CCDeposit 확인 및 Vault 출금 승인/반려 프로세스.
- **로그 경로**: `/inventory/logs`, `/vault/users/{id}/ledger` 등을 통한 전 구간 추적.

---

## 3. 핵심 데이터 모델 및 상세 경로 (OpenAPI)

### 3.1 주요 스키마 (Schemas)
- **RewardType**: `POINT`, `VAULT`, `ROULETTE_TICKET`, `DICE_TICKET`, `LOTTERY_TICKET`, `GIFTICON_*`.
- **Vault SoT**: `vaultBalance`는 `vault_locked_balance`의 고정 별칭이며, V1 `available_balance`는 사용을 금지함.

### 3.2 관리자 제어 엔드포인트
| 기능 | 경로 (Method: Path) | 설명 |
| :--- | :--- | :--- |
| 게임 설정 | `PUT /api/v2/admin/game/{game}/config` | 확률, 보상, 활성화 상태 실시간 수정 |
| 유저 검색 | `GET /api/v2/admin/users` | 닉네임, 레벨, 잔액 기반 필터링 조회 |
| 개입 실행 | `POST /api/v2/admin/users/{id}/intervention/{action}` | 특정 유저 대상 수동 개입 액션 |
| 메시지 발송 | `POST /api/v2/admin/marketing/messages` | 공지 및 개별 타겟 메시지 전송 |

---

## 4. 통합 가이드 및 주의사항

- **Discrepancy 관리**: V1 `user_id`와 V2 `user_id` 매핑 로직 확인 필수.
- **Cache Invalidation**: 상점 상품 및 설정 변경 시 연동된 캐시 무효화 트리거.
- **ID 준수**: 모든 외부 연동 시 `cc_id` 또는 UUID 기반 식별자 사용.

---

## 5. Redis 인프라 및 실시간 명세

### 5.1 Redis 키 표준 (Prefix: `golden:v2:`)
| 용도 | 키 패턴 | TTL |
| :--- | :--- | :--- |
| 연패 카운트 | `golden:v2:user:{id}:loss_streak` | 1h |
| 세션 시작 잔액 | `golden:v2:user:{id}:session_start_balance` | 24h |
| 심리 상태 | `golden:v2:user:{id}:psych_state` | 24h |
| OPS 결과 | `golden:v2:ops:result:{task_id}` | 1h |

### 5.2 알림 메시지 규격 (Message Envelope)
```json
{
  "type": "JACKPOT_WIN | GUERRILLA_DROP | SYSTEM_NOTICE",
  "timestamp": 1705300000000,
  "id": "uuid-v4",
  "payload": { ... }
}
```
- **Pub/Sub 연동**: `NotificationService` → Redis Publish → `UserFeedWorker` → WebSocket.
- **시간대**: 알림 내 모든 타임스탬프는 UNIX Epoch (ms) 또는 KST ISO 8601 준수.

---
*본 문서는 Golden V2의 기술적 통합 기준점이며, OpenAPI 변경 시 명세서와 함께 동기화되어야 합니다.*
