# Golden V2: Circuit Breaker 구현 계획서 (2026_01_29)

**문서 타입**: 상세 구현 계획 (Implementation Plan)
**작성일**: 2026-01-29
**대상**: Golden V2 개발팀 (Phase 2 - Ops Safety)
**프로젝트**: Golden V2

---

## 1. 개요 (Overview)

**Circuit Breaker**는 시스템 오류, 로직 버그, 혹은 운영자의 실수로 인해 **과도한 재화(금고 잔액, 티켓 등)가 유저에게 지급되는 것을 물리적으로 차단**하는 최후의 안전장치입니다.

### 핵심 목표
1.  **Hard Limit**: 설정된 임계치(시간당/일일)를 초과하는 지급 요청 **즉시 차단**.
2.  **Real-time Alert**: 차단 발생 시 즉시 개발팀/운영팀에게 **Slack/Telegram 알림** 발송.
3.  **Ops Control**: 오탐지(False Positive) 상황 시 어드민이 빠르게 **제한을 해제(Reset)** 할 수 있는 기능 제공.

---

## 2. 기술 설계 (Technical Design)

### 2.1 아키텍처 (Architecture)
- **Check Point**: `InventoryService.grant_...`, `VaultService.deposit` 등 자산 **증가** 메서드 진입점.
- **Storage**: **Redis** (`Atomic INCRBY` 연산 활용).
- **Scope**: **Global Scope** (전체 유저 대상 총량 제어) 및 **User Scope** (단일 유저 폭주 제어) 이중 적용.

### 2.2 Redis Key Schema

| Scope | Key Pattern | TTL | 설명 |
| :--- | :--- | :--- | :--- |
| **Global** | `golden:v2:cb:global:{asset_type}:1h` | 1시간 | 전 서버 시간당 총 지급량 |
| **User** | `golden:v2:cb:user:{user_id}:{asset_type}:1h` | 1시간 | 특정 유저 시간당 총 수령량 |

- `asset_type`: `VAULT`, `ROULETTE_TICKET`, `DIAMOND` 등.

### 2.3 임계치 정책 (Threshold Policy)

DB Config(`app_ui_config` or `v2_server_config`)로 관리하여 무중단 변경 가능하게 함.

**기본값 (Default Config)**:
- **VAULT (금고)**
    - Global: 10,000,000 KRW / hour (시간당 1천만원 방출 시 차단)
    - User: 1,000,000 KRW / hour
- **ROULETTE_TICKET (티켓)**
    - Global: 1,000장 / hour
    - User: 100장 / hour

---

## 3. 상세 구현 로직 (Implementation Logic)

### 3.1 `CircuitBreakerService`

```python
class CircuitBreakerService:
    def check_and_incr(self, asset_type: str, amount: int, user_id: int):
        # 1. Config 조회 (Cache)
        limits = self.get_limits(asset_type)
        
        # 2. Redis INCRBY & TTL 설정 (Pipeline)
        global_key = f"golden:v2:cb:global:{asset_type}:1h"
        user_key = f"golden:v2:cb:user:{user_id}:{asset_type}:1h"
        
        # 3. Check
        current_global = redis.incrby(global_key, amount)
        current_user = redis.incrby(user_key, amount)
        
        # 4. Violation?
        if current_global > limits['global_max']:
            self.alert(asset_type, "GLOBAL", current_global)
            raise CircuitBreakerError("GLOBAL_LIMIT_EXCEEDED")
            
        if current_user > limits['user_max']:
            self.alert(asset_type, "USER", current_user, user_id)
            raise CircuitBreakerError("USER_LIMIT_EXCEEDED")
```

### 3.2 Service Integration (적용 지점)

- **`app/v2/services/vault_service.py`**
    - `deposit()` 메서드 최상단에 `check_and_incr('VAULT', amount, user_id)` 호출.
- **`app/v2/services/inventory_service.py`**
    - `grant_wallet_tokens()` 메서드 최상단에 `check_and_incr(token_type, amount, user_id)` 호출.

---

## 4. 운영 및 알림 (Ops & Alerting)

### 4.1 알림 채널
- **Slack Incoming Webhook**: `#v2-critical-alerts` 채널.
- **Message Format**:
    > 🚨 **[CIRCUIT BREAKER ACTIVATED]**
    > - **Type**: GLOBAL_LIMIT_EXCEEDED
    > - **Asset**: VAULT
    > - **Current/Max**: 10,500,000 / 10,000,000
    > - **Triggered By**: User 12345 (Deposit 500,000)
    > - **Action**: **BLOCKED**

### 4.2 어드민 대응 (Admin Tool)
- **긴급 해제 (Reset)**: 잘못된 알람이거나, 이벤트로 인해 한도 상향이 필요할 때.
- **API**: `POST /api/v2/admin/circuit/reset`
    - Body: `{ "asset_type": "VAULT", "scope": "GLOBAL" }`
    - Action: 해당 Redis Key 삭제 (0으로 초기화).
- **한도 변경**: Config 수정 후 즉시 반영 (Redis Limit Reload).

---

## 5. 작업 목록 (Task Breakdown)

### 5.1 Service Layer
- [ ] `app/v2/core/circuit_breaker.py` 모듈 생성 (Redis 로직).
- [ ] `app/v2/core/exceptions.py`에 `CircuitBreakerError` 추가.
- [ ] `VaultService`, `InventoryService`에 연동 코드 삽입.

### 5.2 Config & Admin
- [ ] `v2_server_config` 테이블에 기본 임계치 JSON 데이터 추가 (Migration).
- [ ] Admin API (`reset`, `update_limit`) 구현.

### 5.3 Test
- [ ] **Unit Test**: Mock Redis를 사용하여 한도 초과 시 Error 발생 확인.
- [ ] **Integration Test**: 실제 API 호출로 연이어 지급 시도 -> 차단 확인.

---

## 6. 결론

Circuit Breaker는 **Golden V2의 "보험"**입니다. 서비스 오픈 전 반드시 구현되어야 하며, 초기에는 보수적인(낮은) 한도로 시작하여 운영 패턴에 맞춰 점진적으로 완화하는 전략을 권장합니다.
