# [SoT] Integrated Spending System v2.1

**Status**: Approved / Implementation Pending
**Domain**: Golden Economy
**Owner**: Antigravity
**Date**: 2026-02-04
**Version**: v2.1 (Deep Technical Verification)

---

## 1. 개요 (Overview)
본 문서는 `ch25` 서비스의 "지출(Spending/Expenses)" 개념을 재정립하고, 실질적인 자금 유출을 통합적으로 관리하기 위한 **전역 지출 원장(Global Spending Ledger)** 기반의 기술 명세서입니다. 

## 2. 아키텍처 원칙 (Architecture Principles)

### 2.1. 원자적 트랜잭션 (Atomic Transactions)
지출 기록은 도메인 행위(출금 승인, 구매 완료)와 **동일한 데이터베이스 세션/트랜잭션** 내에서 실행되어야 합니다.
- **프로세스**: 도메인 DB 상태 변경 ($S_1$) → 지출 원장 기록 ($S_2$) → 최종 Commit ($C$)
- **무결성**: $S_2$ 실패 시 전체 $S_1$도 Rollback 되어야 하며, 이는 데이터 파편화를 원천 차단합니다.

### 2.2. 멱등성 및 식별자 (Idempotency)
`transaction_id` 생성 규칙을 강제하여 중복 집계를 방지합니다.
- **Vault Withdrawal**: `VAULT_{vault_withdrawal_request.id}`
- **Shop Order**: `SHOP_{v2_shop_order.id}`
- **HQ Withdrawal**: `HQ_{csv_dedup_key}`

---

## 3. 통합 지출 원장 정밀 설계

### 3.1. DB 스키마 (`v2_spending_ledger`)
프로젝트의 V2 마이그레이션 표준(`v2_game_log`, `hq_daily_deposit_log` 등)을 준수하여 설계를 정교화합니다.

- **표준 준수**: `v2_` 접두사 사용 및 `BigInteger` 기반 금액 필드.

```sql
CREATE TABLE v2_spending_ledger (
    id BIGSERIAL PRIMARY KEY,                    -- sa.BigInteger (autoincrement=True)
    transaction_id VARCHAR(100) NOT NULL UNIQUE, -- 멱등 식별자
    user_id INTEGER NOT NULL,                    -- sa.Integer
    
    -- 금액 데이터 (표준 BigInteger 사용)
    amount BIGINT NOT NULL,                      -- 지출 원본 금액
    currency_type VARCHAR(20) NOT NULL,          -- KRW, POINT, G_W, DIAMOND
    converted_krw_amount BIGINT NOT NULL,        -- 해당 시점 가치 기준 KRW 환산액 (BigInteger)
    
    -- 분류 및 상태
    spending_source VARCHAR(20) NOT NULL,        -- HQ_WITHDRAWAL, VAULT, SHOP
    status VARCHAR(20) NOT NULL DEFAULT 'COMMITTED',
    
    -- 분석 메타
    kst_date DATE NOT NULL,                      -- sa.Date (Daily Aggregation용)
    metadata JSONB,                              -- sa.JSON (MySQL JSON 호환 variant)
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- sa.DateTime(timezone=True)
    
    -- 제약 조건
    FOREIGN KEY (user_id) REFERENCES v2_user (id) ON DELETE CASCADE
);

-- 인덱스 표준 (V2 Log 패턴)
CREATE INDEX ix_v2_spending_ledger_user_id ON v2_spending_ledger (user_id);
CREATE INDEX ix_v2_spending_ledger_kst_date ON v2_spending_ledger (kst_date);
CREATE INDEX ix_v2_spending_ledger_source ON v2_spending_ledger (spending_source);
```

---

## 4. 도메인 통합 및 조율 (Domain Coordination)

### 4.1. 기존 Ledger와의 관계 (Conflict Prevention)
- **자산 원장(`VaultLedger` 등)**: 개별 유저의 '잔액 변동' 증명.
- **통합 지출 원장(`v2_spending_ledger`)**: 시스템의 '운영 비용(지출)' 증명.
- 데이터는 중복 적재되나 목적이 다르므로 충돌이 아닌 **상호 검증(Cross-validation)** 레이어로 기능합니다.

### 4.2. 가치 환산 로직 (Valuation)
`SpendingLogger` 호출 시 `SpendingValuationService`가 서버 설정(`v2_server_config`)을 참조하여 `converted_krw_amount`를 자동 계산합니다.
- **POINT**: 설정된 환산 비율 적용.
- **G_W**: 게임 내 재화 가치 가중치 적용.

---

## 5. 구현 로드맵
1. **Infra**: `v2_spending_ledger` 스키마 및 인덱스 구축.
2. **Core**: `SpendingLogger` 유틸리티 및 `ValuationService` 개발.
3. **Hook**: `ShopService.purchase`, `AdminEconomyService.approve_withdrawal` 내 로깅 삽입.
4. **Ops**: HQ 환전 CSV 임포터 연동 및 원장 기록.
5. **Dashboard**: 통계 테이블 기반 분석 UI 업데이트.
