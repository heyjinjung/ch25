# 03. Golden V2 Technical Spec SoT (Master Expanded)

**문서 타입**: Technical & Data Specification (Authoritative)
**버전**: v2.1 (2026-02-06)
**상태**: ✅ Active SoT

---

## 1. 아키텍처 및 이벤트 파이프라인 (System Architecture)

Golden V2는 고성능 실시간 처리를 위해 Redis 기반의 비동기 아키텍처를 채택합니다.

### 1.1 Redis 메시지 버스 채널 (Pub/Sub)
| 채널명 | 메시지 성격 (Payload Type) | 발생/구독 주체 |
| :--- | :--- | :--- |
| `golden:v2:events:game` | `GameEventDto` (ID, Result, Balance) | Game → Worker / Admin FE |
| `golden:v2:events:intervention` | `InterventionDto` (Trigger, Reward) | Worker → Admin Push |
| `golden:v2:cooldown:{TRG}:{UID}` | TTL 기반 String | Intervention Worker 전용 |
| `user:{id}:vault:locked` | Balance Sync | DB Write 연동 캐시 |

### 1.2 서버 사이드 구성
- **FastAPI API Layer**: 관리자 CRM 및 유저 지연 대응 API 제공.
- **Celery / Python Worker**: 복잡한 ROI 계산 및 대량 CSV 파싱 수행.
- **Intervention Worker**: Redis Stream을 실시간 구독하며 룰셋 판단.

---

## 2. 데이터 모델링 및 SOT 원장 (Database Schema)

모든 데이터는 PostgreSQL DB를 최종 SOT로 하며, Redis는 성능을 위한 캐시 레이어로 작동합니다.

### 2.1 핵심 테이블 명세
- **`v2_golden_intervention_log`**: 개입 이력의 마스터 원장.
    - `trigger_id`: 발생한 트리거 식별자.
    - `status`: `PENDING_APPROVAL`, `SENT`, `REJECTED`.
    - `reward_json`: 지급된 재화 상세.
- **`v2_spending_ledger` (지출 통합 원장)**:
    - 모든 본사 환전(`HQ_W`), 금고 출금(`VAULT_W`), 상점 구매(`SHOP_U`)를 KRW로 환산하여 기록.
    - `transaction_id`: 소스 식별자 결합형 유니크 키.
- **`hq_prospective_user`**: CSV 미가입 VIP 데이터 버퍼.
- **`v2_user_deposit_evidence`**: 유저 제출 입금 증거 및 `PROVISIONAL` 상태 관리.

---

## 3. 외부 데이터 연동 상세 (Integration Specs)

### 3.1 HQ Margin CSV 파싱 규칙
- **인코딩**: CP949 및 UTF-8 자동 감지 필수.
- **필드 추출**:
    - `이름 (아이디)` → 괄호 내 정규식 추출 후 `cc_id` 매핑.
    - `총 운영 마진` → 콤마(,) 제거 후 부동소수점 처리.
- **매칭 우선순위**: `V2User.cc_id` > `external_nickname` > `nickname`.

### 3.2 API 계약 (API Contracts)
- **Intervention CRM**: `GET /api/v2/admin/ops/interventions?user_id={id}`
- **Latency Report**: `POST /api/v2/economy/latency/report` (Payload: Amount, Time, TX_ID)
- **Status Sync**: `GET /api/v2/admin/ops/status` (Dashboard 집계 데이터 반환)

---

## 4. 프론트엔드 라운팅 및 컴포넌트 (Frontend Map)

### 4.1 핵심 관리자 페이지
- **`/v2/admin/dashboard/golden`**: 실시간 이벤트 스트림 및 레이더망 UI.
- **`/v2/admin/ops/crm`**: 개입 승인/거절 전용 CRM 센터.
- **`/v2/admin/economy/latency`**: 지연 입금 매칭 관제 화면.

### 4.2 컴포넌트 정책
- **WebSocket**: `ws://.../ws/golden/events`를 통한 실시간 UI 업데이트.
- **Color Coding**: 
    - WIN/JACKPOT: Emerald-400
    - LOSE: Red-400
    - PENDING: Amber-400

---
> [!WARNING]
> Redis 캐시 데이터와 DB 원장 간의 불일치 감지 시, 반드시 DB 원장을 신뢰하여 Redis를 덮어쓰기(`Re-sync`) 해야 합니다.
