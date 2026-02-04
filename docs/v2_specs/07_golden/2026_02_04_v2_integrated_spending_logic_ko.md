# [SoT] Integrated Spending System v2.1

**Status**: Approved / Implementation Pending
**Domain**: Golden Economy
**Owner**: Antigravity
**Date**: 2026-02-04
**Version**: v2.1 (Full Technical Integration)

---

## 1. 개요 (Overview)
본 문서는 `ch25` 서비스의 "지출(Spending/Expenses)" 개념을 재정립하고, 실질적인 자금 유출을 통합적으로 관리하기 위한 **전역 지출 원장(Global Spending Ledger)** 기반의 기술 명세서입니다. 

## 2. 아키텍처 원칙 (Architecture Principles)

### 2.1. 원자적 트랜잭션 (Atomic Transactions)
지출 기록은 도메인 행위(출금 승인, 구매 완료, 환전 임포트)와 **동일한 데이터베이스 세션/트랜잭션** 내에서 실행되어야 합니다.
- **프로세스**: 도메인 DB 상태 변경 ($S_1$) → 지출 원장 기록 ($S_2$) → 최종 Commit ($C$)
- **무결성**: $S_2$ 실패 시 전체 $S_1$도 Rollback 되어 데이터 파편화를 방지합니다.

### 2.2. 멱등성 및 식별자 (Idempotency)
`transaction_id` 생성 규칙을 강제하여 중복 집계를 원천 차단합니다.
- **Vault Withdrawal**: `VAULT_{vault_withdrawal_request.id}`
- **Shop Order**: `SHOP_{v2_shop_order.id}`
- **HQ Withdrawal**: `HQ_W_{hash}` (Paste Import 지원)

---

## 3. 기술적 상세 설계 (Technical Specs)

### 3.1. DB 스키마 (`v2_spending_ledger`)
V2 표준(`BigInteger`, `timezone=True`)을 준수하여 설계를 정교화합니다.

```sql
CREATE TABLE v2_spending_ledger (
    id BIGSERIAL PRIMARY KEY,                    -- sa.BigInteger (autoincrement=True)
    transaction_id VARCHAR(100) NOT NULL UNIQUE, -- 멱등 식별자
    user_id INTEGER NOT NULL,                    -- sa.Integer
    
    -- 금액 데이터 (표준 BigInteger 사용)
    amount BIGINT NOT NULL,                      -- 지출 원본 금액
    currency_type VARCHAR(20) NOT NULL,          -- KRW, POINT, G_W, DIAMOND
    converted_krw_amount BIGINT NOT NULL,        -- 해당 시점 가치 기준 KRW 환산액
    
    -- 분류 및 상태
    spending_source VARCHAR(20) NOT NULL,        -- HQ_WITHDRAWAL, VAULT, SHOP
    status VARCHAR(20) NOT NULL DEFAULT 'COMMITTED',
    
    -- 분석 메타
    kst_date DATE NOT NULL,                      -- 일별 집계용 KST 날짜
    metadata JSONB,                              -- { "raw_nickname": "...", "sku": "..." }
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- sa.DateTime(timezone=True)
    
    FOREIGN KEY (user_id) REFERENCES v2_user (id) ON DELETE CASCADE
);

CREATE INDEX ix_v2_spending_ledger_user_date ON v2_spending_ledger (user_id, kst_date);
CREATE INDEX ix_v2_spending_ledger_source_date ON v2_spending_ledger (spending_source, kst_date);
```

### 3.2. HQ 환전 데이터 처리 (Paste Import)
기존 "입금 붙여넣기" 시스템의 멱등성 및 미리보기 로직을 계승합니다.
- **Deduplication**: `nickname + amount + withdrawal_at` 해시 기반 중복 체크.
- **Matching**: `V2User` 매칭 실패 시 `UNRESOLVED` 상태로 기록하여 사후 수동 매칭 지원.

---

## 4. 가치 환산 엔진 (Valuation Engine)
`SpendingLogger` 호출 시 `SpendingValuationService`가 서버 설정(`v2_server_config`)을 참조하여 `converted_krw_amount`를 계산합니다.
- **POINT**: 설정된 환산 비율(예: 1:1) 적용.
- **G_W**: 운영 가 정책에 따른 가중치 적용.

---

## 5. 구현 로드맵
1. **Infra**: `v2_spending_ledger`, `v2_hq_daily_withdrawal_log` 테이블 생성.
2. **Back-end**: `SpendingLogger` 및 `PasteImportService` (Withdrawal 전용) 개발.
3. **Hook**: 금고 승인(`admin_economy_service`), 상점 구매(`shop_service`) 내 로깅 연동.
4. **Front-end**: `PasteImportPage.tsx` 확장하여 환전 탭 추가 및 Analytics Dashboard 업데이트.
