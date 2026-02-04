# [SoT] Integrated Spending System v2.0

**Status**: Approved / Implementation Pending
**Domain**: Golden Economy
**Owner**: Antigravity
**Date**: 2026-02-04

---

## 1. 개요 (Overview)
본 문서는 `ch25` 서비스의 "지출(Spending/Expenses)" 개념을 재정립하고, 실질적인 자금 유출을 통합적으로 관리하기 위한 **전역 지출 원장 기반 시스템**의 기술 명세서입니다.

## 2. 핵심 아키텍처 (Architecture Core)

### 2.1. 통합 지출 원장 (Unified Spending Ledger)
단일 속성 지출이 아닌, 분산된 도메인(Asset, Shop, HQ)에서 발생하는 모든 가치 유출 이벤트를 단일 원장 테이블로 정기/실시간 집계합니다.

- **Storage Entity**: `v2_spending_ledger`
- **Key Columns**:
    - `transaction_id`: 소스 트랜잭션의 멱등성 보장 (Unique Hash)
    - `spending_source`: `HQ_WITHDRAWAL` | `VAULT` | `SHOP`
    - `amount`: 원본 재화 금액
    - `currency_type`: `KRW` | `POINT` | `G_W`
    - `status`: `COMMITTED` | `CANCELLED`

### 2.2. 이벤트 기반 데이터 파이프라인
각 도메인은 독립성을 유지하되, 지출 확정 시점에 공통 `SpendingLogger`를 호출하여 원장을 기록합니다.

| 도메인 | 이벤트 트리거 | 기록 재화 |
| :--- | :--- | :--- |
| **Asset** | 금고 출금 승인 (`APPROVED`) | KRW / POINT |
| **Shop** | 상품 주문 완료 (`order`) | POINT / G_W / DIAMOND |
| **HQ** | 환전 내역 CSV 매칭 완료 | KRW |

---

## 3. 기술적 상세 설계 (Technical Specs)

### 3.1. DB 스키마 (`v2_spending_ledger`)
```sql
CREATE TABLE v2_spending_ledger (
    id BIGSERIAL PRIMARY KEY,
    transaction_id VARCHAR(100) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES v2_user(id),
    amount BIGINT NOT NULL,
    currency_type VARCHAR(20) NOT NULL,
    spending_source VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'COMMITTED',
    kst_date DATE NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.2. 일별 통계 집계 (`v2_daily_spending_stats`)
대시보드 쿼리 최적화를 위해 실시간 원장 데이터를 비동기로 요약하여 저장합니다.

---

## 4. 통합 및 운영 전략

### 4.1. 유저 매칭 및 무결성
HQ CSV 데이터의 닉네임 기반 매칭 실패 시 `UNRESOLVED` 상태로 원장에 기록하며, 어드민 UI를 통해 사후 수동 매칭을 지원하여 누락 없는 지출 집계를 보장합니다.

### 4.2. 가치 환산 (Currency Evaluation)
전역 서버 설정(`v2_server_config`)에 정의된 환산율을 적용하여, 포인트 소모액 등을 원화(KRW) 가치로 변환하여 전역 순수익(Net Income)을 도출합니다.

---

## 5. 구현 로드맵
1. **Infra**: 원장 및 통계 테이블 마이그레이션.
2. **Logic**: `SpendingLogger` 유틸리티 개발 및 각 서비스 Hook 삽입.
3. **CSV**: HQ Withdrawal Import 파이프라인 구축.
4. **UI**: 통합 지출 내역이 반영된 Analytics Dashboard 업데이트.
