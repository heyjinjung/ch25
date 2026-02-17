# Vault 출금조건 WINNER 세그먼트 매핑 추가 (2026-02-17)

## 연관 이슈
- 세그먼트 전역 동기화 수정 (`docs/SOT/00_segment/변경로그/20260217_segment_global_sync_fix.md`)

## 변경 사항
- `SEGMENT_WITHDRAWAL_CONDITIONS`에 `WINNER` 세그먼트 추가
- 변경 전: 5개 (NEW, COMMON, VIP, WHALE, AT_RISK) → WINNER는 입금액 기반 폴백
- 변경 후: 6개 (NEW, COMMON, VIP, WHALE, AT_RISK, **WINNER**)

## WINNER 조건값
```python
"WINNER": {"play_target": 30, "spend_target": 10000, "min_deposit_target": 10000}
```
- AT_RISK와 동일 (가장 엄격한 조건)
- SoT 정책: 마진 음수(회사 손해) 유저이므로 강화 조건 적용

## 수정 파일
- `app/v2/services/vault_service.py` (L29-L36)

## 테스트
- `tests/v2/test_segment_global_sync.py` — 40/40 PASSED
