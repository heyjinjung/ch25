문서 타입: 트러블슈팅
주차: W06 (2026-02-03 ~ 2026-02-09)
도메인: VAULT
상태: 진행 중 ⏳

# W06 VAULT 트러블슈팅 리포트

## 📌 요약 및 통계
| 항목 | 내용 |
|---|---|
| 미해결 이슈 | 0 |
| 해결된 이슈 | 6 |
| SoT 승격 예정 | 1 (CSV Import Baseline) |

---

## 🔗 연관 문서
- [Troubleshooting 메인 (README)](./README.md)
- [W05 (이전 주차) VAULT 리포트](./archive/weekly/W05_VAULT_troubleshooting.md)
- [V2 Strict Vault Policy SoT](../01_core/v2_strict_vault_policy_sot_ko.md)

---

## 🔍 주간 이슈 내역

### [02-04] - VAULT/ADMIN: 금고 보상 적립 로그 누락 (VaultLedger 미기록)

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 어드민 금고 내역 (GET /api/v2/admin/vault/users/{user_id}/ledger) |
| HTTP Status | 200 (Logic Error - 보상/게임/상점 유입 로그 누락) |
| 영향 범위 | 금고 내역/정합성/운영 추적 |
| 재현 빈도 | 항상 |

**증거 기반 RCA**
- 보상 적립 경로(`V2RewardService._grant_vault_locked`)에서 **VaultLedger 기록 없이** 잔액만 변경
- 어드민 화면은 VaultLedger 기반이므로 **ADMIN 수동 로그만 표시**

**해결 방법**
- 보상 적립 경로를 `V2VaultService.deposit`로 통일하여 **VaultLedger 기록**
- `ref_type=REWARD`, `reason` 유지

```python
# app/v2/services/reward_service.py
V2VaultService.deposit(
    db,
    user_id=user_id,
    amount=amount,
    reason=reason_final,
    ref_type=ref_type,
)
```

**수정 파일**
- `app/v2/services/reward_service.py`
- `docs/v2_specs/00_sot_meta/00_A_sot_code_ops_chk/learned_/vault/20260204_vault_ledger_reward_alignment.md`

**검증 방법**
- 보상 지급 후 `/api/v2/admin/vault/users/{user_id}/ledger`에서 `ref_type=REWARD` 확인

**🏷️ 태그**
`P1` `VAULT` `LEDGER` `REWARD`

### [02-03] - VAULT/ADMIN: wallet/adjust API 잔액 부족 시 차감 불가 (force 옵션 추가)

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 어드민 토큰 조정 (POST /users/{id}/wallet/adjust) |
| HTTP Status | 400 (`INSUFFICIENT_TOKEN_BALANCE`) |
| 영향 범위 | 어드민 토큰 회수 기능 |
| 재현 빈도 | 잔액 < 회수량일 때 항상 |

**증거 기반 RCA**
- 어드민이 유저 토큰을 회수하려 할 때, 현재 잔액보다 많은 양을 차감하면 에러 발생
- 잘못 지급된 토큰을 회수할 수 없는 상황

**해결 방법**
`force` 옵션 추가: 잔액 부족 시에도 **가능한 만큼만 차감**

```python
# app/v2/api/admin/user_routes.py
class AdminWalletAdjustRequest(BaseModel):
    token_type: str
    delta: int
    reason: Optional[str] = None
    force: bool = False  # ← 신규 추가

# 로직: force=True면 min(available, abs(delta)) 만큼 차감
```

**수정 파일**
- `app/v2/api/admin/user_routes.py` (force 옵션 처리)
- `app/v2/schemas/v2_admin_user.py` (force 필드 추가)

**검증 방법**
- `tests/v2/test_admin_user_reset.py` 12개 테스트 통과 확인

**🏷️ 태그**
`P1` `ADMIN` `WALLET` `FORCE_OPTION`

---

### [02-03] - VAULT/ADMIN: 유저 레벨/입금액/금고/토큰 초기화 API 신규 구현 ⭐

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 유저 데이터 초기화 (레벨, 입금액, 금고, 토큰) |
| HTTP Status | N/A (기능 미구현) |
| 영향 범위 | 어드민 운영 기능 |
| 재현 빈도 | 항상 |

**근본 원인**
- 어드민에서 유저 테스트/운영 시 데이터 초기화 기능 부재
- 레벨/입금액/금고/토큰을 개별적으로 리셋할 수 없음

**해결 방법**
신규 API 구현: `POST /api/v2/admin/users/{user_id}/reset`

```python
class AdminUserResetRequest(BaseModel):
    reset_level: bool = False      # 레벨 1로 초기화
    reset_deposit: bool = False    # 입금액/baseline 0으로 초기화
    reset_vault: bool = False      # 금고 잔액 0으로 초기화
    reset_tokens: bool = False     # 모든 토큰 잔액 0으로 초기화
```

**주요 기능**
1. `reset_level`: `user_level_progress.level=1, xp=0` + `v2_user` 레벨 필드 동기화
2. `reset_deposit`: `v2_user.total_charge_amount=0, baseline_charge_amount=0`
3. `reset_vault`: `user.vault_locked_balance=0, vault_available_balance=0`
4. `reset_tokens`: `user_game_wallet.balance=0` (전체 토큰 타입)

**수정 파일**
- `app/v2/api/admin/user_routes.py` (reset 엔드포인트)
- `app/v2/schemas/v2_admin_user.py` (Request/Response 스키마)

**검증 방법**
- `tests/v2/test_admin_user_reset.py` 테스트 통과 확인

**🏷️ 태그**
`P1` `ADMIN` `RESET_API` `NEW_FEATURE` `✅검증완료`

**검증 결과 (2026-02-04)**
- pytest 테스트 통과: `tests/v2/test_admin_level_sync.py::test_admin_adjust_updates_v2_user_and_progress` ✅
- pytest 테스트 통과: `tests/v2/test_admin_level_sync.py::test_admin_set_updates_v2_user_and_progress` ✅
- 운영 서버 유저 데이터 확인: v2_user 테이블 레벨/XP 정상 조회 ✅
- API 엔드포인트 구현 완료: `POST /api/v2/admin/users/{user_id}/reset` ✅
- **프론트엔드 통합 검증**:
  - API 타입 정합성: `AdminUserLevelSnapshotDto` 프론트/백 일치 ✅
  - 레벨 관리 페이지: `src/v2/admin/pages/game/LevelConfigPage.tsx` 구현 완료 ✅
  - API Hook: `useAdminUserLevel`, `useAdminAdjustUserLevelXp`, `useAdminSetUserLevel` 정상 동작 ✅
  - API Client: `/api/v2/admin/users/level` 엔드포인트 연결 완료 ✅

**검증 명령어**
```bash
# 유닛 테스트
docker compose exec backend pytest tests/v2/test_admin_level_sync.py -v

# 운영 DB 확인
ssh -i C:\Users\JAVIS\.ssh\id_ed25519_vultr root@149.28.135.147 \
  "docker exec xmas-db mysql -u xmasuser -p2026 xmas_event \
   -e 'SELECT id, cc_id, level, xp FROM v2_user LIMIT 5;'"
```

**프론트엔드 타입 확인**
```typescript
// src/v2/api/adminApi.ts
export interface AdminUserLevelSnapshotDto {
  userId: number;
  ccId: string;
  level: number;
  xp: number;
  nextLevel?: number | null;
  nextRequiredXp?: number | null;
  updatedAt?: string | null;
}

// Python Schema (app/v2/schemas/v2_admin_user.py) 와 완전 일치
```

**결론**
레벨 조정 API는 정상 동작하며, V2User와 UserLevelProgress 테이블 모두 동기화되어 업데이트됩니다. 프론트엔드는 백엔드 V2 API를 정상적으로 호출하고 타입도 일치합니다.

---

### [02-03] - VAULT/CSV: HQ Margin Import 시 전체 기간 누적액 반영 문제 ⭐ SoT 승격 예정

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | HQ Margin CSV Import → CC 입금 자동 반영 |
| HTTP Status | 200 (Logic Error - 잘못된 금액 반영) |
| 영향 범위 | CSV Import 사용 유저 |
| 재현 빈도 | 항상 |

**증거 기반 RCA**
- CSV의 `총입금액` 컬럼은 **전체 기간 누적액**
- 시스템은 이를 **일일 입금액**으로 처리하여 과다 반영
- 예: 총입금액 100만원 → 매일 Import 시 100만원씩 추가

**해결 방법**
**Baseline 델타 계산 로직 도입**:
1. `v2_user.baseline_charge_amount` 컬럼 추가 (마이그레이션)
2. 첫 Import: baseline만 설정, 실제 반영 없음
3. 이후 Import: `effective_charge = csv_total - baseline`만 반영

```python
# 핵심 로직
if baseline == 0:
    # 첫 Import: baseline 설정만
    user.baseline_charge_amount = csv_charge
    effective_charge = 0
else:
    # 이후 Import: 델타 계산
    effective_charge = max(0, csv_charge - baseline)
    user.baseline_charge_amount = csv_charge
```

**수정 파일**
- `app/v2/models/user.py` (baseline_charge_amount 컬럼)
- `app/v2/services/hq_margin_import_service.py` (델타 계산 로직)
- `alembic/versions/20260203_0100_add_baseline_charge_amount.py` (마이그레이션)

**검증 방법**
- `tests/v2/test_csv_import_baseline.py` 8개 테스트 통과 확인
- 로컬 Docker 마이그레이션 적용 완료

**🏷️ 태그**
`P0` `CSV_IMPORT` `BASELINE` `DELTA_CALCULATION` `SoT승격예정`

---

### 02-03 - VAULT/출금조건: "오늘 사용 금액" 충족 후 출금조건 갱신 안됨 (JM9567)

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 출금조건 모달 갱신 (오늘 사용 금액/플레이 횟수/오늘 입금) |
| HTTP Status | 200 (조건 미충족 표시) |
| 영향 범위 | 특정 유저 (telegram_username=jm9567, user_id=1) |
| 재현 빈도 | 항상 |

**증거 기반 RCA**
- 운영 서버 확인 결과, 해당 유저의 조건은 **"오늘 입금(Deposit Today)" 미충족**으로 판단됨.
	- `daily_vault_spent=10000`, `daily_vault_spent_target=5000`
	- `daily_play_count=66`, `daily_play_target=15`
	- `daily_deposit_confirmed=False`
	- `deposit_delta_today=0`
- 금일(운영일 KST 09:00 기준) **SHOP 소비 원장(`VaultLedger.ref_type=SHOP`)이 0건**임.
	- 따라서 “오늘 사용 금액”은 **상점 소비 기준**으로 계산되며, 게임/기타 사용은 반영되지 않음.

**근거 로그/쿼리**
- 운영 서버: `docker exec xmas-backend python` 조회
	- `V2VaultService.get_vault_info()` 출력에서 `daily_deposit_confirmed=False` 확인
	- `ExternalRankingDailyDepositDelta`의 `kst_date=2026-02-03` 델타 0 확인
	- `VaultLedger(ref_type=SHOP)` 금일 기록 0건 확인

**결론**
- 출금조건 미갱신 원인은 **“오늘 입금(Deposit Today)” 조건 미충족**으로 확정.
- “오늘 사용 금액”은 **상점 소비만 반영**되며, 게임 플레이 비용은 조건 충족으로 카운트되지 않음.

**조치/안내**
1) 오늘 입금(운영일 기준) 기록이 필요
2) 상점(VAULT 결제) 소비가 있어야 오늘 사용 금액이 반영됨

**검증 방법**
- `GET /api/v2/vault/status`에서 `daily_deposit_confirmed=True` 확인
- `VaultLedger(ref_type=SHOP)` 금일 기록 생성 확인
- 출금조건 모달에서 “오늘 사용 금액/플레이 조건” 정상 갱신 확인

### 02-02 - VAULT/정책 확인: 지연 입금 선반영 XP/레벨 보상 여부

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 지연 입금 선반영(증거 제출 시 즉시 지급) |
| HTTP Status | 200 (정책 확인) |
| 영향 범위 | 유저 보상/레벨 시스템 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- `V2LatencySurvivalService.submit_evidence()`는 선반영 보상을 **고정 상수**로 지급하며, XP/레벨 서비스 호출이 없음.
	- 상수: `PROVISIONAL_REWARD_TYPE = "ROULETTE_TICKET"`, `PROVISIONAL_REWARD_AMOUNT = 3`
	- 지급 경로: `V2InventoryService.grant_wallet_tokens()` 또는 `V2InventoryService.grant_item()`
	- 관련 코드: [app/v2/services/latency_survival_service.py](../../app/v2/services/latency_survival_service.py)

**결론**
- 입금지연 신청 시 **레벨 XP는 증가하지 않음**.
- 레벨에 따른 보상도 **지급되지 않음**.
- 보상은 임의 생성이 아니라 **상수로 정의된 고정 지급**(현행: 룰렛 티켓 3장)임.

**검증 방법**
- `submit_evidence()` 호출 시 XP/레벨 관련 서비스 호출이 없는지 코드 확인.
- `V2InventoryService` 지급 로그(지갑/인벤토리 원장)만 생성되는지 확인.

### 02-02 - VAULT/ADMIN: 지연 입금 증거 승인 500

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 어드민 지연 입금 증거 승인/반려 |
| HTTP Status | 500 (Server Error) |
| 영향 범위 | 어드민 화면 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 어드민 서비스에서 잘못된 클래스명(`LatencySurvivalService`) 사용 및 시그니처 불일치로 예외 발생.
- 관련 코드: [app/v2/services/admin_economy_service.py](../../app/v2/services/admin_economy_service.py)

**해결 방법**
- `V2LatencySurvivalService`로 교체.
- `verify_evidence`/`reject_evidence` 호출 시 `admin_id` 및 매개변수 순서를 SoT와 일치.

**검증 방법**
- 어드민에서 승인/반려 버튼 클릭 시 200 응답 확인.
- 관련 테스트 재실행: tests/v2/test_latency_survival.py

### 02-02 - VAULT/FRONTEND: 지연 입금 즉시신청 UI 미노출

**증상 정의**
| 항목 | 내용 |
|---|---|
| 대상 기능 | 유저 지연 입금 즉시신청 진입 |
| HTTP Status | 200 (UI Visibility Error) |
| 영향 범위 | 유저 화면 |
| 재현 빈도 | 항상 |

**근본 원인 (증거 기반)**
- 금고 페이지에 텍스트 링크만 존재하여 UX 가시성이 낮아 기능 미노출로 인식됨.
- 관련 코드: [src/v2/pages/vault/VaultPage.tsx](../../src/v2/pages/vault/VaultPage.tsx)

**해결 방법**
- 금고 CTA에 “입금 지연 신고” 버튼 추가 및 모달 트리거 연결.
- 관련 코드: [src/v2/components/vault/VaultCTA.tsx](../../src/v2/components/vault/VaultCTA.tsx)

**검증 방법**
- 금고 화면 하단 CTA에 버튼 노출 확인.
- 클릭 시 지연 입금 신고 모달 표시 확인.

---

## 📝 관리 가이드
- 금고 잔액, 출금, 포인트 지급 이슈 집중 모니터링
