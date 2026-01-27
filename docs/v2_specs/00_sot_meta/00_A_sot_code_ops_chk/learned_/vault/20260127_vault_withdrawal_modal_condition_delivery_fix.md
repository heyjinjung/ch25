# 출금 조건 모달 조건 전달 누락 수정

**작성일**: 2026-01-27
**상태**: ✅ 적용 완료
**영향 범위**: V2 Vault 상태 조회 → 출금 조건 모달(Withdrawal Guide) 표시

---

## 1. 문제 요약

출금 조건 자체(“최근 3일 내 전체 게임 합산 30회”, “오늘 사용 금액”, “오늘 입금”)는 백엔드에서 계산하고 있었으나,
프론트 출금 조건 모달에서 **조건 값이 0/미달처럼 표시**되는 문제가 발생.

---

## 2. 증거 기반 RCA (Systematic Debugging)

### 2.1 증상(Symptom)
- 출금 조건 모달에서 플레이/사용/입금 조건이 실제 상태와 다르게 표시됨
- 특히 “최근 3일 내 30회”가 모달에 제대로 반영되지 않음

### 2.2 원인(Evidence)
- 백엔드 `/api/v2/vault/status` 응답은 `vaultBalance` 같은 camelCase 키와 `daily_play_count` 같은 snake_case 키가 **혼재**
- 프론트에서 해당 응답을 그대로 타입으로 신뢰하는 경로가 존재하여,
  - snake_case 키가 누락되거나(또는 다른 형태로 들어오면)
  - 모달에서 `daily_play_count`, `daily_play_target` 등을 읽지 못해 0처럼 표시될 수 있음

### 2.3 해결(Fix)
- 프론트 `vaultApi.getStatus()`에서 응답을 **정규화(normalize)**하여,
  - snake_case/camelCase/레거시 키 모두 fallback 처리
  - 출금 모달에 필요한 필드가 항상 채워지도록 보장
- 추가로, 코드베이스 내 다른 어댑터 경로(`v2GameAdapter.getV2VaultStatus`)에서도 동일 필드를 채우도록 보강하여
  호출 경로가 섞여도 안전하게 동작하도록 함

---

## 3. 정책 정합성

- “최근 3일 내 전체 게임 합산 플레이 횟수”는 백엔드 `V2VaultService.get_vault_info()`에서
  Dice/Roulette/Lottery (legacy + v2 로그) 합산으로 계산됨.
- 모달 텍스트도 “최근 3일 내 게임 N회 이상 플레이”로 표기되어 SoT/구현과 일치.

---

## 4. 변경 파일

- src/v2/api/vaultApi.ts
  - `/api/v2/vault/status` 응답 정규화 추가 (조건 필드 전달 안정화)

- src/v2/api/v2GameAdapter.ts
  - `getV2VaultStatus()`에 출금 조건 필드 포함 (경로 혼재 안전성 강화)

---

## 5. 검증

- 프론트 빌드(`npm run build`)로 타입/번들링 회귀 확인
- 실제 UI에서 출금 조건 모달이 다음 3가지를 올바르게 표시하는지 확인:
  - 최근 3일 내 전체 게임 합산 플레이 N회 / 목표치
  - 오늘 사용 포인트 / 목표치
  - 오늘 입금 여부

---

## 변경 이력
- 2026-01-27: 출금 조건 모달 조건 전달 누락 방지 정규화 적용
