# [Learned] 지출 통합 원장 + HQ 환전 붙여넣기 Import 구현

**문서 타입**: Learned SoT / Implementation Record
**도메인**: Golden / Ops / Economy
**작성일**: 2026-02-05
**상태**: ✅ 구현 완료

---

## 1. 목적
- HQ 환전 데이터를 지출로 기록하여 순수익(입금-지출) 계산 가능하게 함
- 붙여넣기 Import에서 HQ 환전 내역을 저장/매칭/중복 방지 처리

## 2. 적용 파일
### 2.1 DB/Migration
- `alembic/versions/20260205_0100_add_v2_spending_ledger.py`
- `alembic/versions/20260205_0200_add_v2_hq_daily_withdrawal_log.py`

### 2.2 Model
- `app/v2/models/v2_spending_ledger.py`
- `app/v2/models/v2_hq_daily_withdrawal_log.py`
- `app/v2/models/user.py` (spending_records 관계)
- `app/v2/models/__init__.py`, `app/db/base.py`

### 2.3 Service
- `app/v2/services/spending_logger_service.py`
- `app/v2/services/paste_import_service.py`
- `app/v2/services/admin_economy_service.py` (금고 승인 시 지출 기록)
- `app/v2/services/shop_service.py` (상점 구매 지출 기록)

### 2.4 API
- `app/v2/api/admin/csv_import_routes.py`

### 2.5 Frontend
- `src/v2/api/adminApi.ts`
- `src/v2/admin/pages/ops/PasteImportPage.tsx`

### 2.6 Tests
- `tests/v2/test_spending_logger.py`

---

## 3. 핵심 변경 사항
- **지출 원장** 테이블 신설 및 지출 기록 서비스 추가
- **HQ 환전 로그** 테이블 신설 및 붙여넣기 Import 추가
- 금고 출금 승인/상점 구매 시 **지출 원장 기록 연동**
- 환전 붙여넣기 프리뷰/실행 API 및 UI 추가

---

## 4. 운영/검증 메모
- 운영일 기준: Asia/Seoul, 오전 9시 리셋
- 중복 방지: dedup_key 및 transaction_id UNIQUE
- 통화 매핑: **VAULT 비용 → POINT** (승인 규칙)

---

## 5. 변경 이력
- 2026-02-05: 최초 구현 기록
