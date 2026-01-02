# 2026-01-02 개발 로그: Vault 단일 SoT(Phase 3) cash_balance write 차단

## 배경(왜 했나)
Vault 금액이 `vault_locked_balance`(잠금)와 `cash_balance`(출금 가능)로 이원화되어 있고, 여러 경로(미션/입금 해금/시즌패스/상태 조회)가 서로 다른 필드를 업데이트하면서 회귀가 반복되었습니다.

단일 SoT 설계에 따라 Vault 경제의 금액 SoT를 `user.vault_locked_balance`로 통일하고, `cash_balance`는 레거시 호환 목적 외에는 **신규 write를 금지**하는 방향으로 단계적 마이그레이션을 진행 중입니다.

## 이번 변경(무엇을 했나)
### 1) 미션 CASH_UNLOCK: locked→cash 전환 제거
- 기존: `MissionService.claim_reward()`에서 `vault_locked_balance`를 감소시키고 `cash_balance`를 증가(= 금액 이동)
- 변경: balance transfer를 제거하고, Vault2에 unlock 이벤트만 기록(관측/마이그레이션 준비용)

### 2) 입금/조건 달성 해금(VAULT_UNLOCK): cash 지급 중단
- 기존: `VaultService.handle_deposit_increase_signal()`에서 unlock_amount를 계산한 뒤 `RewardService.grant_point()`로 cash 지급(= cash_balance write)
- 변경: 단일 SoT 기준으로 해당 cash 지급/전환을 중단하고, deposit 신호는 `total_charge_amount` 업데이트만 수행

## 영향/리스크
- 해금(Unlock)의 의미를 기존 “locked → cash 변환”이 아닌 **출금 조건/eligibility 규칙으로 표현**하도록 재정의가 필요합니다.
- 단기적으로는 cash_balance가 증가하지 않도록 차단되며, Vault 화면/출금은 이미 `vault_amount_available`(= total - reserved) 기준으로 동작하도록 정렬되어 있습니다.

## 다음 단계
- 운영/정책 합의: `cash_balance` 데이터 처리(옵션 A vs B) 결정
	- 결정: **옵션 B 선택**(cash→locked 일괄 이관)
	- 이관 스크립트: `scripts/migrate_cash_balance_to_vault_locked.py` (dry-run / apply)
- unlock UX/규칙 정의: 어떤 조건에서 available을 제한/허용할지(eligibility / deposit-today 등) 명확화
