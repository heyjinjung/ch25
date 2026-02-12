문서 타입: 트러블슈팅
주차: W07 (2026-02-10 ~ 2026-02-16)
도메인: VAULT
상태: 진행 중 ⏳

# W07 VAULT 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 1 |
| SoT 승격 예정 | 0 |

---

## 🔍 주간 이슈 내역

### 02-11 - VAULT/WITHDRAWAL: 일일 입금 미충족 상태에서 출금 버튼 활성화 및 출금 신청 가능 ✅

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 금고 출금 신청 (VaultPage → request_withdrawal) |
| HTTP Status | 200 (Logic Error) — 출금 요청이 정상 처리됨 |
| 영향 범위 | 전체 유저 (특히 NEW 세그먼트) |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**

총 **3개의 버그**가 복합적으로 작용하여 출금 조건이 무력화되었음.

#### 버그 1: 프론트엔드 — `isEligible` 판정 로직 불완전
- **파일**: `src/v2/pages/vault/VaultPage.tsx`
- **증거**: 기존 코드
  ```tsx
  const isEligible = vault.eligible && vaultBalance >= withdrawalGoal;
  ```
- **원인**: `vault.eligible`은 프로그램 레벨 적격성(허용/차단/세그먼트)만 반영하며, **당일 입금·플레이·유즈 충족 여부**를 전혀 확인하지 않음.
- **SoT 위반**: `01_vault_policy_sot_ko.md` §7.2 — 세그먼트별 일일 조건(play_target, spend_target, min_deposit_target) 모두 충족해야 출금 가능.

#### 버그 2: 백엔드 — `get_vault_info`의 `daily_deposit_confirmed` 판정 오류
- **파일**: `app/v2/services/vault_service.py` (`get_vault_info()`)
- **증거**: 기존 코드
  ```python
  "daily_deposit_confirmed": bool(has_cc_deposit_today),
  ```
- **원인**: `has_cc_deposit_today`는 당일 입금 건수 > 0 여부만 확인. **입금 금액이 세그먼트별 min_deposit_target 이상인지** 검증하지 않음.
  - 예: 100원 입금도 `True`로 판정 → NEW 세그먼트 1만원 미달이어도 통과.

#### 버그 3: 백엔드 — NEW 세그먼트 `min_deposit_target = 0`
- **파일**: `app/v2/services/vault_service.py` (`get_vault_info()` + `request_withdrawal()`)
- **증거**: 기존 코드
  ```python
  # NEW 세그먼트
  play_target = 5
  spend_target = 0
  min_deposit_target = 0   # ← SoT 위반
  ```
- **원인**: SoT §7.2에 따르면 NEW 세그먼트의 `min_deposit_target`은 **10,000**이어야 하나, 코드에 `0`으로 설정되어 입금 조건이 사실상 없는 상태.
- **이중 발생**: `get_vault_info()`와 `request_withdrawal()` 두 곳 모두에서 동일한 오류 존재.

**해결 방법**

| # | 레이어 | 수정 내용 |
|---|--------|----------|
| 1 | FE `VaultPage.tsx` | `isEligible`을 5개 조건(eligible + 잔액 + 입금 + 플레이 + 유즈) AND로 변경 |
| 2 | FE `VaultPage.tsx` | `handleWithdraw` 가드를 `!vault.eligible` → `!isEligible`로 변경 |
| 3 | BE `vault_service.py` get_vault_info | NEW 세그먼트 `min_deposit_target = 0` → `10000` |
| 4 | BE `vault_service.py` get_vault_info | `daily_deposit_confirmed` → `deposit_requirement_met` (금액 >= min_deposit_target 검증) |
| 5 | BE `vault_service.py` get_vault_info | `play_requirement_met`, `spend_requirement_met` 필드 API 응답에 추가 |
| 6 | BE `vault_service.py` request_withdrawal | NEW 세그먼트 `min_deposit_target = 0` → `10000` |

**수정/추가 파일**
- [app/v2/services/vault_service.py](../../../app/v2/services/vault_service.py) — get_vault_info, request_withdrawal
- [src/v2/pages/vault/VaultPage.tsx](../../../src/v2/pages/vault/VaultPage.tsx) — isEligible, handleWithdraw
- [src/v2/api/vaultApi.ts](../../../src/v2/api/vaultApi.ts) — VaultStatusResponse 타입, getStatus 정규화
- [src/api/vaultApi.ts](../../../src/api/vaultApi.ts) — 레거시 타입 동기화
- [docs/SOT/00_vault/변경로그/20260211_vault_withdrawal_eligibility_fix.md](../SOT/00_vault/변경로그/20260211_vault_withdrawal_eligibility_fix.md) — 변경 로그

**검증 방법**
1) `npm run build` (tsc && vite build) — ✅ 빌드 성공
2) `docker compose up -d --build` — ✅ 컨테이너 재생성 완료 (backend, frontend, celery-beat, celery-worker)
3) 프론트에서 일일 입금 미충족 유저로 출금 버튼 비활성화 확인
4) 동일 유저로 API 직접 호출 시 출금 거부 확인

**풀스택 검증 (트러블슈팅 프로토콜 §6.3)**
| 레이어 | 검증 항목 | 결과 |
|--------|----------|------|
| DB | 스키마 변경 없음 (코드 로직만 수정) | ✅ |
| BE API | `get_vault_info` 응답에 `deposit_requirement_met`, `play_requirement_met`, `spend_requirement_met` 포함 | ✅ |
| BE 출금 | `request_withdrawal`의 NEW 세그먼트 min_deposit_target = 10000 적용 | ✅ |
| FE 타입 | `VaultStatusResponse`에 신규 필드 반영 | ✅ |
| FE 로직 | `isEligible` 5개 조건 AND, `handleWithdraw` 가드 강화 | ✅ |
| SoT 정합성 | §7.2 세그먼트 조건 테이블과 코드 일치 | ✅ |

**SoT 참조**
- [01_vault_policy_sot_ko.md](../SOT/00_vault/01_vault_policy_sot_ko.md) §7.2 — 세그먼트별 출금 조건
- [03_vault_service_logic_sot_ko.md](../SOT/00_vault/03_vault_service_logic_sot_ko.md) — 서비스 로직 명세

**🏷️ 태그**
`P0` `VAULT` `WITHDRAWAL` `ELIGIBILITY` `SECURITY` `SoT_VIOLATION` `✅해결완료`

---

## 관련 문서
- [01_vault_policy_sot_ko.md](../SOT/00_vault/01_vault_policy_sot_ko.md)
- [03_vault_service_logic_sot_ko.md](../SOT/00_vault/03_vault_service_logic_sot_ko.md)
- [20260211_vault_withdrawal_eligibility_fix.md](../SOT/00_vault/변경로그/20260211_vault_withdrawal_eligibility_fix.md)
