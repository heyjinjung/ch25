# Vault Phase 1 (Reset) Backend Checklist

이 문서는 Phase 1 원칙(locked 단일 기준, available 만료 없음, external_ranking은 신호만)을 실제 코드/DB에 반영할 때의 체크리스트입니다.

## Phase 1 원칙 (반드시 준수)

- 계산 기준은 `user.vault_locked_balance` **단일 기준**
- `user.vault_balance`는 **legacy read-only mirror** (UI/호환용)
  - Phase 1에서 `vault_balance`에 직접 쓰기 금지 (반드시 locked 변경을 통해 mirror 동기화)
- `user.vault_available_balance`는 **만료되지 않음**
  - Phase 1에서는 unlock 결과를 기존 정책대로 `cash_balance`로 지급하는 방식을 유지할 수 있음
- `AdminExternalRankingService`는 “입금 발생 여부(증가 delta)” **신호만 제공**
  - unlock 계산/지급/locked 감소는 `VaultService`로 **일원화**

## DB / Migration

- [x] `user` 테이블에 컬럼 추가
  - [x] `vault_locked_balance` (default 0, NOT NULL)
  - [x] `vault_available_balance` (default 0, NOT NULL)
  - [x] `vault_locked_expires_at` (nullable)
- [x] 데이터 백필
  - [x] 기존 `vault_balance` 값을 `vault_locked_balance`로 백필
  - [x] `vault_balance`는 `vault_locked_balance` mirror로 유지

진행상태 (2025-12-21):
- [x] 마이그레이션 추가 (20251221_0026)
- [x] User 모델 컬럼 추가

## Backend Code

- [x] `User` 모델에 신규 컬럼 매핑 추가
- [x] `VaultService`
  - [x] locked 기준으로 seed/fill 처리
  - [x] locked 변경 시 `vault_balance` mirror 동기화 (단일 함수로 일원화)
  - [x] deposit 증가 신호를 받아 unlock 계산/지급 수행 (RewardService 호출 포함)
- [x] `AdminExternalRankingService`
  - [x] deposit 증가 감지는 유지
  - [x] unlock 계산/지급 로직 제거
  - [x] `VaultService`에 deposit 증가 신호 전달
- [x] `NewMemberDiceService`
  - [x] LOSE 시 seed 보장은 locked 기준으로 처리

## 호환성 / API

- [ ] 기존 `/api/vault/status`, `/api/vault/fill` 응답 호환 유지
  - `vault_balance`는 mirror 값(=locked)으로 계속 제공

## 테스트 / 스크립트

- [x] `tests/test_external_ranking_vault_unlock.py`에서 locked 기준으로 검증
- [x] (선택) `scripts/e2e_vault_unlock_from_external_ranking.ps1`에서 seed/검증 컬럼 업데이트

## 운영 점검

- [ ] 마이그레이션 적용 후 기존 유저의 `vault_balance`가 유지되는지 확인
- [ ] 신규 유저 funnel(주사위 LOSE, 무료 fill)에서 locked 증가 + mirror 동기화 확인
- [ ] 외부 랭킹 deposit 증가 시 unlock이 정상 지급되고 locked가 감소하는지 확인
