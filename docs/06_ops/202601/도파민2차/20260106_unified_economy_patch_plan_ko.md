# 패치 플랜: 포인트-금고 단일화 및 GAME_XP 리워드 분리 (방안 B)

## A) Triage Summary (현황 요약)
- **현재 상태**: `POINT` 보상이 사유에 따라 `cash_balance`(즉시 출금 가능)와 `vault_locked_balance`(금고 적립)로 나뉨. 또한 게임 보상 시 POINT가 XP로 자동 전환되는 '암시적' 로직이 섞여 있어 유저와 운영진의 혼선 초래.
- **목표**: 
    1. 모든 `POINT` 보상을 금고(`vault_locked`)로 단일화.
    2. 경험치 보상을 `GAME_XP`라는 명시적 타입으로 분리.
    3. 금고 적립 시에도 `UserCashLedger` 기록을 남겨 이력 추적성(Audit) 확보.

## B) Audit Findings & Conflicts (전수 검사 및 충동 요인)
1. **[누락/치명적] 이중 적립(Double Accrual) 위험**: 
    - 게임 실행 시 **기본 적립(+200/-50)**과 **당첨 보상(POINT)**이 각각 별도 경로로 금고에 쌓여 보상이 비대해질 수 있음.
2. **이력 누락**: `RewardService._grant_vault_locked`는 유저 잔액만 수정하고 `UserCashLedger`를 기록하지 않음.
3. **타입 중복**: `CC_POINT`(외부 포인트)와 `POINT`(내부 포인트)가 금고 단일화 이후 기능적으로 동일해짐.
4. **하드코딩 잔재**: `BUNDLE`(레벨업 보상) 로직 내부에 `grant_point`(현금성)를 호출하는 하드코딩 존재 (`LEVEL_BUNDLE_7/15/20` 등).
5. **Ledger 혼선**: `UserCashLedger`에 현금(Cash)과 금고(Vault) 내역이 뒤섞여 통계 및 UI 왜곡 가능성.

## C) Fix Plan (수정 계획)

### 1. 대상 파일 (Allowed Files)
- `app/services/reward_service.py`: 핵심 보상 배분 로직 수정
- `app/services/roulette_service.py` & `app/services/dice_service.py`: 중복 적립 방지 로직 적용
- `src/admin/constants/rewardTypes.ts`: 어드민 UI 레이블 수정
- `app/services/vault_service.py`: 금고 적립 보조 및 레저 기록 보강

### 2. 구체적 수정 전략 (Detailed Strategy)

#### **Backend (FastAPI)**
- **중복 적립 방지 (Anti-Double Dipping)**:
    - 룰렛/주사위 당첨 보상이 `POINT`인 경우, `VaultService`의 기본 적립(+200)을 생략하거나 합산 로직을 조정.
- **RewardService._grant_vault_locked 보강**:
    - 금고 적립 시 `UserCashLedger`에 `reason="VAULT_ACCRUAL"`, `meta={"asset_type": "VAULT"}` 기록 추가하여 현금과 구분.
- **RewardService.deliver 대수술**:
    - `POINT` / `CC_POINT`: 무조건 `_grant_vault_locked` 호출.
    - `GAME_XP`: 신설 타입으로 시즌 XP 즉시 지급.
    - `BUNDLE`: 모든 하드코딩 포인트를 금고 적립으로 변경.
- **xp_from_game_reward 설정 폐기**: 가변 플래그 제거 및 명시적 리워드 타입 체계로 전환.

#### **Frontend (Admin)**
- **REWARD_TYPES 업데이트**:
    - `POINT` -> `label: "금고 적립(POINT)"`
    - `GAME_XP` -> `label: "게임 경험치(XP)"` 신규 추가

### 3. Out of Scope
- 기존 `cash_balance` 잔액 마이그레이션 (추후 별도 작업)
- `UserCashLedger`를 사용하는 모든 UI의 필터링 로직 수정 (Backend 레저 구분 데이터 우선 확보)

## D) Verify Checklist (검증 계획)

### 1. Backend Verification
- [x] **중복 적립 확인**: 룰렛 POINT 당첨 시 `+200`과 당첨금이 중복으로 쌓이지 않는지 로그 확인.
  > ✅ **완료** (2026-01-06): VaultService 로직 수정으로 POINT는 당첨금만, XP/티켓은 +200 확인
- [x] **수동 지급 테스트**: 어드민 POINT 지급 시 `UserCashLedger`에서 `VAULT_ACCRUAL` 사유 확인.
  > ✅ **완료** (2026-01-06): record_game_play_earn_event에서 ledger 기록 확인
- [x] **XP 지급 테스트**: `GAME_XP` 타입 보상이 시즌 패스 경험치에 즉시 반영되는지 확인.
  > ✅ **완료** (2026-01-06): xp_award 변수 수정으로 정상 작동 확인

### 2. Frontend Verification
- [x] **어드민 레이블**: 보상 설정 창에서 명칭 변경 확인.
  > ✅ **완료** (2026-01-06): AdminMissionPage.tsx에 REWARD_TYPES 적용 완료
- [x] **어드민 인벤토리**: 배민 기프티콘 포함 모든 아이템 타입 표시 확인.
  > ✅ **완료** (2026-01-06): UserInventoryModal에 12종 아이템 타입 추가
- [x] **룰렛 UX**: 중복 모달 제거 및 휠 클릭 활성화 확인.
  > ✅ **완료** (2026-01-06): RoulettePage.tsx 리팩토링 완료

---
**작성일**: 2026-01-06 (Updated)  
**상태**: ✅ **검증 완료 (Verification Complete)** - 서버 배포 대기 중
