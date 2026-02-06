문서 타입: 개발 가이드 (Integration Guide)
버전: v1.0
작성일: 2026-01-19
작성자: Antigravity Agent
대상: Backend/Frontend 개발자
상태: Draft

[최종 검토일: 2026-01-26]
[정책 최신화 필요 여부: 🟡] 🟡 [정합성 검토 필요] Admin API 프리픽스가 `/admin/api`로 표기되어 OpenAPI의 `/api/v2/admin/*`와 혼재. Vault/Withdrawals 경로 및 에러코드 표기를 1개 SoT로 통일 필요.

# V2 API 연동 및 전역 동기화 가이드 (Admin Integration)

## 1. 목적 (Purpose)
본 문서는 V2 Admin UI(`src/v2/admin/*`)와 백엔드 API 간의 연동 규격을 정의하고, 특히 **Admin의 작업이 유저 앱(Client)에 실시간으로 반영되는 '전역 동기화(Global Sync)' 메커니즘**을 구체화한다.

---

## 2. 아키텍처 개요 (Architecture)

### 2.1 데이터 흐름 (Data Flow)
Admin에서의 변경 사항은 단순 DB 수정에 그치지 않고, 반드시 **전파(Propagation)** 경로를 통해 유저 및 시스템 전역 상태를 동기화해야 한다.

```mermaid
graph LR
    A[Admin UI] -->|REST API| B(Backend Service)
    B -->|DB Update| C[(Database)]
    B -->|Publish| D{Redis Pub/Sub}
    D -->|Global Channel| E[Global Feed WS]
    D -->|User Channel| F[User Private WS]
    E -->|Broadcast| G[User Client (App)]
    F -->|Target Push| G
```

### 2.2 동기화 채널 (Sync Channels)
- 참조: [v2_notification_feed_schema_ko.md](../03_api/v2_notification_feed_schema_ko.md)
- **Global Channel (`golden:v2:feed:public`)**: 잭팟, 게릴라 이벤트, 전체 공지.
- **User Channel (`golden:v2:feed:user:{id}`)**: 개인 자산 변동(입출금 승인), 티켓 지급.
- **Ops Channel (`golden:v2:ops:ws`)**: 운영 모니터링, 외부 결제 알림.

---

## 3. 페이지별 상세 연동 매트릭스 (Integration Matrix)

### 3.1 Economy Ops (경제 관리)

| Admin UI Page | Action (UI) | API Endpoint (Method) | Sync Trigger (Redis) | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **VaultControl** | 출금 승인 (`Swipe`) | `POST /admin/api/economy/withdrawals/{id}/approve` | `USER_ASSET_UPDATE` (User) | 유저에게 승인 알림 발송 |
| **VaultControl** | 출금 반려 (`Reject`) | `POST /admin/api/economy/withdrawals/{id}/reject` | `user_notification` (User) | 사유 포함 알림 |
| **CCDeposit** | 입금 승인 (`Confirm`) | `POST /admin/api/economy/deposits/{id}/confirm` | `USER_ASSET_UPDATE` (User) | 자산 즉시 갱신 |
| **ShopManager** | 상품 진열 (`Toggle`) | `PUT /admin/api/shop/products/{id}/status` | - | 상점 목록 캐시 무효화 |

### 3.2 User CRM (회원 관리)

| Admin UI Page | Action (UI) | API Endpoint (Method) | Sync Trigger (Redis) | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **UserList** | 유저 검색 | `GET /admin/api/users` | - | Query Params 활용 |
| **UserDetail** | 상세 조회 | `GET /admin/api/users/{id}/composite` | - | 지갑/로그/인벤토리 통합 반환 |
| **UserDetail** | 자산 수정 | `PUT /admin/api/users/{id}/assets` | `USER_ASSET_UPDATE` (User) | **Admin Log 필수** |
| **TicketInventory** | 티켓 지급 | `POST /admin/api/inventory/tickets/grant` | `USER_ASSET_UPDATE` (User) | 티켓 수량 갱신 알림 |

### 3.3 Game & Marketing Ops

| Admin UI Page | Action (UI) | API Endpoint (Method) | Sync Trigger (Redis) | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **MessageSender** | 전체 공지 발송 | `POST /api/v2/messages` | `SYSTEM_NOTICE` (Global) | 전체 유저 화면에 오버레이 |
| **MissionManager** | 미션 리로드 | `POST /admin/api/game/missions/reload` | `MISSION_UPDATE` (User) | 00:00 자동 실행 외 수동 트리거 |
| **RouletteConfig** | 확률 조정 | `PUT /admin/api/game/roulette/config` | - | 서버 인메모리 Config 갱신 |

---

## 4. 공통 구현 가이드 (Implementation Guide)

### 4.1 인증 (Authentication)
모든 Admin API 요청은 Header에 유효한 JWT 토큰을 포함해야 한다.
- Header: `Authorization: Bearer <token>`
- Role Check: 백엔드 미들웨어에서 `ROLE_ADMIN` 여부 검증 필수.

### 4.2 에러 처리 (Error Handling)
V1 레거시의 불명확한 에러 코드를 사용하지 않으며, [V2 API 공통 에러 규격]을 따른다.
```json
{
  "success": false,
  "error": {
    "code": "VAULT_INSUFFICIENT_FUNDS",
    "message": "사용자의 금고 잔액이 부족합니다.",
    "trace_id": "a1b2c3d4"
  }
}
```

### 4.3 레거시 주의사항 (V1 Discrepancy)
- 참조: [v1_api_discrepancy_report.md](../03_api/v1_api_discrepancy_report.md)
- **주의**: V1의 `user_id`와 V2의 `user_id` 매핑에 주의할 것 (DB 마이그레이션 이슈).
- **주의**: 자산 수정 시 `log` 테이블에 반드시 `admin_id`와 `reason`을 남겨야 함 (Audit Trail).

---

## 5. 참고 문서 (References)
- [V2 Admin Master Plan](../06_design/v2_admin_master_plan_ko.md)
- [V2 Notification Feed Schema](../03_api/v2_notification_feed_schema_ko.md)
- [V2 Admin Ops API Contract](../03_api/v2_admin_ops_api_contract_ko.md)
