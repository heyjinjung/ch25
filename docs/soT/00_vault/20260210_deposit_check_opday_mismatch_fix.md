문서 타입: 트러블슈팅/변경로그
작성일: 2026-02-10
작성자: GitHub Copilot
도메인: VAULT
심각도: HIGH (출금 조건 우회 가능)

## 증상

- **대상 기능**: 금고 출금 조건 — "당일 입금 완료" 판정
- **HTTP Status**: 200 (Logic Error — 조건을 충족하지 않았는데 충족으로 판정)
- **영향 범위**: 전체 유저 (delta 테이블에 당일 데이터가 없는 경우 폴백 로직 도달 시)
- **재현 조건**: 어제(KST 00:00~08:59 사이) 입금 → 오늘(09:00 리셋 전) 출금 조건 확인 시

### 재현 시나리오

1. 유저가 **어제 KST 오후 ~ 자정 사이**에 입금
2. `last_charge_at` = `2026-02-09 23:40 UTC` → KST 변환 = `2026-02-10 08:40`
3. 다음 날(2026-02-10) 09:00 리셋 이전에 금고 출금 조건 확인
4. **1단계** (`ExternalRankingDailyDepositDelta`): op_date = 2026-02-09, 데이터 있으면 True
5. **2단계** (`ExternalRankingData`): `updated_at` KST = 2026-02-10 vs `now_kst_date` = 2026-02-10 → **일치 → True** (잘못됨)
6. **3단계** (`UserActivity`): `last_charge_at` KST = 2026-02-10 vs `now_kst_date` = 2026-02-10 → **일치 → True** (잘못됨)

## 근본 원인 (Root Cause)

### 날짜 기준 불일치

| 단계 | 테이블 | 날짜 기준 | 값 (예시) |
|------|--------|-----------|-----------|
| 1단계 | `external_ranking_daily_deposit_delta` | `op_date_kst` (09:00 리셋) | 2026-02-09 ✅ |
| 2단계 | `external_ranking_data` | `now_kst_date` (자정 리셋) | 2026-02-10 ❌ |
| 3단계 | `user_activity` | `now_kst_date` (자정 리셋) | 2026-02-10 ❌ |

1단계는 **Operational Day (09:00 KST 리셋)** 기준을 사용하지만,
2·3단계 폴백은 **KST 자정 기준 (`now_kst_date`)** 을 사용하여 불일치 발생.

KST 00:00 ~ 09:00 사이에 입금한 유저는 2·3단계 폴백에서 "오늘" 캘린더 날짜 일치로 잘못 통과.
또한 delta 테이블에 당일 데이터가 없는 유저(오늘 입금 안 함)도 어제 입금 기록의 폴백으로 통과.

### DB 증거

```
user_activity.last_charge_at (UTC):
user_id=10  2026-02-09 23:40:16  → KST 2026-02-10 08:40:16
user_id=44  2026-02-09 23:40:16  → KST 2026-02-10 08:40:16

external_ranking_data.updated_at (UTC):
user_id=10  2026-02-09 23:40:16  → KST 2026-02-10 08:40:16
```

## 수정 내용

**파일**: `app/v2/services/vault_service.py`

### 수정 箇所 (2곳)

1. `get_vault_info()` — L619~L639 (vault status API)
2. `request_withdrawal()` — L1465~L1485 (출금 요청 API)

### Before (버그)

```python
# 2단계 폴백
if sync_dt_utc.astimezone(tz).date() == now_kst_date ...
# 3단계 폴백
if last_charge_utc.astimezone(tz).date() == now_kst_date:
```

### After (수정)

```python
# 2단계 폴백 — operational day 기준 비교
sync_op_date = self._operational_date_kst(sync_dt_utc)
if sync_op_date == op_date_kst ...
# 3단계 폴백 — operational day 기준 비교
charge_op_date = self._operational_date_kst(last_charge_utc)
if charge_op_date == op_date_kst:
```

## 검증

- 수정 후 모든 3단계 폴백이 `_operational_date_kst()` (09:00 KST 리셋) 기준으로 통일됨
- 1·2·3단계 "오늘" 기준이 동일하게 op_date_kst 사용
- KST 00:00~09:00 사이 입금 기록이 다음 operational day에 잘못 매칭되지 않음

## 배포

- 운영 서버 반영 필요: `docker compose build --no-cache; docker compose up -d`
