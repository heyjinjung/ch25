문서 타입: 패치
버전: v1.0
작성일: 2026-02-04
작성자: GitHub Copilot
대상: V2 운영/개발 담당자
상태: 적용 완료

# 금고 보상 적립 로그 정합성 패치

## 1. 배경
- 어드민 금고 내역에서 **ADMIN 수동 조정 로그만 보이고**, 보상/게임/상점 등 다양한 적립 루트가 누락됨.
- 원인: 보상 적립이 `V2RewardService._grant_vault_locked`에서 **VaultLedger 기록 없이** 직접 잔액만 변경함.

## 2. 변경 내용
- `V2RewardService._grant_vault_locked` 경로를 **V2VaultService.deposit** 호출로 통일.
- 결과: 보상/적립 루트가 VaultLedger에 기록되어 어드민 금고 내역에 표시됨.

## 3. 적용 범위
- 보상/적립 경로에서 vault_locked_balance 변경 시 VaultLedger 기록
- 기존 ADMIN 수동 조정 로그와 동일 테이블로 통합

## 4. 수정 파일
- `app/v2/services/reward_service.py`
- [W06 VAULT 트러블슈팅](../../../90_troubleshooting/W06_VAULT_troubleshooting.md)

## 5. 검증 방법
1. 보상 지급(POINT/SEASON_PASS 등) 실행
2. `/api/v2/admin/vault/users/{user_id}/ledger`에서 VaultLedger 로그 확인
3. `ref_type=REWARD` 및 `reason` 정상 표시 확인

## 6. 변경 이력
- v1.0 (2026-02-04): 보상 적립 경로 VaultLedger 기록 통합
