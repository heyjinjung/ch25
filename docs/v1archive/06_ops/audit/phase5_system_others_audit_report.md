# 5단계 감사 보고서: 시스템 및 기타

**감사 일시**: 2026-01-11 23:42 KST  
**감사 범위**: Audit Log, Idempotency, Inventory, Shop Config, Feature System  
**상태**: ✅ **Verified & Resolved**

---

## 1. TL;DR (3~5줄)

- **Audit Log**: `AdminAuditLog`에 before/after JSON 스냅샷 저장 (AuditService 중앙화)
- **Inventory**: 아이템 기반 수량 관리 (`user_inventory_item`) + Ledger 추적 (`user_inventory_ledger`)
- **Idempotency**: `user_id + scope + idempotency_key` 복합 유니크로 중복 실행 방지
- **Shop Config**: `AppUiConfig` 테이블의 JSON 필드를 통해 코드 배포 없이 상품 정보 오버라이드
- **Guardrails**: 관리자 액션 로깅 강제, 멱등성 키 검증, Ledger 기반 정합성 체크

---

## 5-0) System SoT (단일 기준) + 범위

### A. 시스템별 SoT 테이블

| 시스템 | SoT 테이블 | 주요 컬럼 | 비고 |
| --- | --- | --- | --- |
| **Audit Log** | `admin_audit_log` | `admin_id`, `action`, `before_json`, `after_json` | 중앙 감사 로그 |
| **Inventory** | `user_inventory_item` | `user_id`, `item_type`, `quantity` | 인벤토리 잔액 |
| **Idempotency** | `user_idempotency_key` | `scope`, `idempotency_key`, `status` | 중복 방지 키 |
| **Shop Config** | `app_ui_config` | `key='shop_products'`, `value_json` | 상품 오버라이드 |
| **Feature Schedule** | `feature_schedule` | `date`, `feature_type`, `is_active` | 가용 기능 스케줄 |

### B. 데이터 흐름도

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. Admin Action (API Request)                                       │
│    → Idempotency Check (optional)                                   │
├─────────────────────────────────────────────────────────────────────┤
│ 2. Business Logic Execution                                         │
│    → DB Update (Models)                                            │
│    → Ledger Update (Cash/Game/Inventory Ledger)                     │
├─────────────────────────────────────────────────────────────────────┤
│ 3. Audit Logging (AuditService.record_admin_audit)                  │
│    → Capture Before/After State                                     │
│    → Write to admin_audit_log                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### C. 범위 경계

| 포함 | 제외 |
| --- | --- |
| Admin Audit Log | User Activity Log (feature.py) |
| Inventory System (Items & Ledgers) | Game Token Wallet (Phase 2) |
| Shop UI Config (Overrides) | PG 결제 연동 (외부) |
| System Guardrails (Idempotency) | Infra/Server Monitoring |

---

## 5-1) 페이지/엔드포인트/테이블 매핑

### A. Inventory 관리

| 엔드포인트 | 라이브러리/함수 | 기능 | 연관 테이블 |
| --- | --- | --- | --- |
| `GET /admin/api/inventory/users/{id}` | `admin_inventory.py` | 인벤토리 조회 | `user_inventory_item` |
| `GET /admin/api/inventory/users/{id}/ledger` | `admin_inventory.py` | 변동 내역 조회 | `user_inventory_ledger` |
| `POST /admin/api/inventory/users/{id}/adjust` | `admin_inventory.py` | 수량 강제 조정 | `item`, `ledger`, `audit_log` |

### B. Shop 관리

| 엔드포인트 | 기능 | 연관 테이블 |
| --- | --- | --- |
| `GET /admin/api/shop/products` | 상품 목록 조회 | 코드 상수 + DB Config |
| `GET /admin/api/shop/products/overrides` | 오버라이드 조회 | `app_ui_config` |
| `PUT /admin/api/shop/products/overrides` | 오버라이드 설정 | `app_ui_config` |

### C. Feature Schedule & Audit

| 엔드포인트 | 기능 | 연관 테이블 |
| --- | --- | --- |
| `PUT /admin/api/feature-schedule/{day}` | 스케줄 설정 | `feature_schedule` |
| `GET /admin/api/audit-logs/` | 감사 로그 조회 | `admin_audit_log` |

---

## 5-2) 근본 가드레일 (운영 사고 방지)

### 1. Audit Logging 강제

- **메커니즘**: `AuditService.record_admin_audit()` 함수를 통해 주요 변경 사항(Inventory Adjust, Wallet Grant 등)을 기록하지 않으면 PR 승인 불가 (Rule).
- **데이터**: `admin_id`, `action`, `target_id` 필수. `before`/`after` 스냅샷으로 복구 데이터 확보.

### 2. Idempotency (멱등성)

- **메커니즘**: `user_idempotency_key` (user_id, scope, key) 유니크 제약.
- **적용**: 중복 지급/차감이 치명적인 로직(포인트 지급, 출금 승인 등)에 적용.

### 3. Ledger Entry (이중 장부)

- **메커니즘**: 잔액(`balance`) 변경 시 반드시 Ledger(`delta`, `balance_after`)를 함께 기록.
- **검증**: `Sum(Ledger.delta) == Model.balance` 정합성 검증 가능.

### 4. 코드 배포 없는 Config 제어

- **메커니즘**: `AdminShop` 등에서 `AppUiConfig` JSON을 사용하여 긴급하게 상품 가격/표시 여부를 제어.
- **안전장치**: JSON 스키마 검증 로직 (`upsert_overrides` 내) 존재.

---

## 5-3) 최소 검증 시나리오 (운영+유저)

### A. Inventory & Shop

| SYS-001 | 인벤토리 강제 조정 | Item 수량 변경 + Ledger 기록 + Audit Log 생성 | [x] |
| SYS-002 | Shop 오버라이드 설정 | `shop_products` Key에 JSON 저장 | [x] |
| SYS-003 | 잘못된 오버라이드 포맷 | 400 Bad Request (Validation 동작) | [x] |

### B. System Guards

| GRD-001 | Audit Log 기록 확인 | Admin 액션 수행 후 `admin_audit_log` 조회 | [x] |
| GRD-002 | Idempotency 중복 요청 | 동일 Key 요청 시 에러 또는 기존 결과 반환 | [x] |
| GRD-003 | Ledger 정합성 | 잔액 변경과 Ledger Delta 일치 여부 확인 | [x] |

---

## 6. 발견 이슈

---

## 7. 조치 결과 요약

| ID | 조치 내용 | 상태 | 비고 |
| --- | --- | --- | --- |
| MEDIUM-006 | Shop Overrides 검증 강화 (Pydantic) | **Resolved** | `app/schemas/shop_overrides.py` 도입 및 적용 완료 |
| LOW-005 | Audit Log 검색 필터 추가 (`start_date`, `end_date`) | **Resolved** | `admin_audit.py` 엔드포인트 기능 확장 완료 |

---

**검증 테스트**: `tests/test_shop_overrides.py` (10/10 Passed)

---

**작성자**: Antigravity AI  
**업데이트**: 2026-01-11 23:42 KST  
**다음 단계**: 전체 감사 보고서 통합 및 최종 리뷰
