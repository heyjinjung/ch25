# Vault 운영 대시보드 쿼리 가이드 (MySQL)

본 문서는 Vault Phase 1 운영 및 관측을 위한 표준 SQL 쿼리를 제공합니다.

## 1. 적립 및 스킵 현황 (Daily Stats)

### 1.1 일자별 적립 총액 및 건수
```sql
SELECT 
    DATE(created_at) as date,
    earn_type,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM vault_earn_event
GROUP BY 1, 2
ORDER BY 1 DESC;
```

### 1.2 Trial 적립 SKIP 사유 집계 (운영 장애 감지)
`reward_kind`가 `SKIP_NO_VALUATION`인 건수는 `trial_reward_valuation` 맵에 누락된 보상이 있음을 의미합니다.
```sql
SELECT 
    source,
    payout_raw_json->>"$.reward_id" as missing_reward_id,
    COUNT(*) as skip_count
FROM vault_earn_event
WHERE reward_kind = 'SKIP_NO_VALUATION'
GROUP BY 1, 2
ORDER BY 3 DESC;
```

## 2. 해금 및 전환 (Unlock Funnel)

### 2.1 입금 증가 신호 기반 해금 현황
```sql
SELECT 
    reason,
    JSON_EXTRACT(meta, "$.tier") as tier,
    COUNT(*) as count,
    SUM(delta) as total_unlocked_cash
FROM user_cash_ledger
WHERE reason = 'VAULT_UNLOCK'
GROUP BY 1, 2;
```

## 3. 만료 및 손실 (Retention Loss)

### 3.1 만료 시간 임박 유저 리스트 (CS 대응용)
현재 시점에서 1시간 이내에 만료되는 고액(3만 원 이상) 보유 유저.
```sql
SELECT 
    id as user_id, 
    external_id, 
    vault_locked_balance, 
    vault_locked_expires_at
FROM user
WHERE vault_locked_balance >= 30000 
  AND vault_locked_expires_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 1 HOUR);
```

## 4. 어드민 변경 이력 (Audit)

### 4.1 배너/규칙/배수 변경 로그
```sql
SELECT 
    created_at,
    event_type,
    meta
FROM user_activity_event
WHERE event_type IN ('VAULT_CONFIG_UPDATE', 'DOWNTIME_BANNER_UPDATE')
ORDER BY created_at DESC;
```
