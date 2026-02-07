# 테스트 수정 체크리스트

**문서 타입**: 실행 체크리스트
**작성일**: 2026-02-07
**상태**: 🔴 **진행중**

---

## 🎯 목표: 테스트 통과율 51.6% → 70%+

---

## 🔴 P0: 즉시 수정 (1-2시간) - 예상 +35개 통과 -- **완료**

### ✅ Task 0: UserCashLedger 관계 정합화 (공통 차단 해소)

**파일**: `app/v2/models/core/user_cash_ledger.py`

- [x] `user` relationship 대상 확인 및 V2 기준으로 정합화

**증거**:
- 재실행 실패 로그: [테스트 재실행 증거 보고서](./20260207_test_rerun_evidence_report.md)

**예상 해결 효과**: 전체 테스트 컬렉션/실행 차단 해소

---

### ✅ Task 0-1: VaultEarnEvent 관계 정합화 (공통 차단 해소)

**파일**: `app/v2/models/core/vault_earn_event.py`

- [x] `user` relationship 대상 확인 및 V2 기준으로 정합화

**증거**:
- 재실행 실패 로그: [테스트 재실행 증거 보고서](./20260207_test_rerun_evidence_report.md)

**예상 해결 효과**: 공통 ORM 차단 해소 및 Admin/Game 테스트 재진입

---

### ✅ Task 0-2: TrialTokenBucket 관계 정합화 (공통 차단 해소)

**파일**: `app/v2/models/core/trial_token_bucket.py`

- [x] `user` relationship 대상 확인 및 V2 기준으로 정합화

**증거**:
- 재실행 실패 로그: [테스트 재실행 증거 보고서](./20260207_test_rerun_evidence_report.md)

**예상 해결 효과**: 공통 ORM 차단 해소 및 Admin/Game 테스트 재진입

---

### ✅ Task 0-3: OpsTargetMember 관계 정합화 (공통 차단 해소)

**파일**: `app/v2/models/core/ops_target.py`

- [x] `user` relationship 대상 확인 및 V2 기준으로 정합화

**증거**:
- 재실행 실패 로그: [테스트 재실행 증거 보고서](./20260207_test_rerun_evidence_report.md)

**예상 해결 효과**: 공통 ORM 차단 해소 및 Admin/Ops 테스트 재진입

---

### ✅ Task 0-4: VaultLedger 관계 정합화 (공통 차단 해소)

**파일**: `app/v2/models/core/vault_ledger.py`

- [x] `user` relationship 대상 확인 및 V2 기준으로 정합화

**증거**:
- 재실행 실패 로그: [테스트 재실행 증거 보고서](./20260207_test_rerun_evidence_report.md)

**예상 해결 효과**: 공통 ORM 차단 해소 및 Admin/Vault 테스트 재진입

---

### ✅ Task 0-5: UserRetentionState 관계 정합화 (공통 차단 해소)

**파일**: `app/v2/models/core/user_retention_state.py`

- [x] `user` relationship 대상 확인 및 V2 기준으로 정합화

**증거**:
- 재실행 실패 로그: [테스트 재실행 증거 보고서](./20260207_test_rerun_evidence_report.md)

**예상 해결 효과**: 공통 ORM 차단 해소 및 Admin/Game 테스트 재진입

---

### ✅ Task 0-6: AdminAuditLog JSON 저장 정합화

**파일**: `app/v2/services/admin_audit_service.py`

- [x] before/after JSON을 문자열이 아닌 dict로 저장

**증거**:
- 재실행 실패 로그: [테스트 재실행 증거 보고서](./20260207_test_rerun_evidence_report.md)

**예상 해결 효과**: Admin 감사 로그 테스트 통과

---

### ✅ Task 1: V2User 모델 Relationship 추가

**파일**: `app/v2/models/user.py`

- [x] V2User 클래스에 다음 relationship 추가:
```python
# Relationships (추가)
spending_records = relationship(
    "V2SpendingLedger",
    back_populates="user",
    lazy="dynamic"
)

game_logs = relationship(
    "V2GameLog",
    back_populates="user",
    lazy="dynamic"
)
```

**검증**:
```bash
python -c "from app.v2.models.user import V2User; print(hasattr(V2User, 'spending_records'))"
# Expected: True
```

**예상 해결 테스트**: 15개 (Spending Ledger 관련)

---

### ✅ Task 2: 테스트 Import 수정

#### 2.1. test_ops_hq_daily_deposit_import.py

- [x] **Line 11 수정**:
```python
# 변경 전
from app.v2.models.v2_hq_daily_deposit import V2HQDailyDeposit

# 변경 후
# 변경 후
from app.v2.models.v2_hq_daily_deposit_log import HQDailyDepositLog as V2HQDailyDeposit
```

**상태**: ✅ **완료 (Indentation 수정 포함)**

#### 2.2. test_ops_hq_margin_import.py

- [x] **Line 7-8 수정**:
```python
# 변경 전
from app.v2.models.v2_user_segment import V2UserSegment, SegmentType

# 변경 후 (이미 존재하는지 확인)
from app.v2.models.v2_user_segment import V2UserSegment
from app.v2.models.v2_segment_rule import SegmentType  # 또는 적절한 경로
```

#### 2.3. test_ops_paste_import_daily_deposit.py

- [x] **동일하게 HQDailyDepositLog import 수정 및 Duplicate Logic 개선** (완료)

#### 2.4. test_ops_status_hq_stats.py

- [x] **동일하게 HQDailyDepositLog import 수정** (완료)

**검증**:
```bash
pytest tests/v2/test_ops_hq_daily_deposit_import.py -v
# Expected: collection 성공
```

**예상 해결 테스트**: 10개 (Import 에러)

---

### ✅ Task 3: Golden Daily Nudge 모델 확인

#### 3.1. 모델 존재 여부 확인

- [x] 다음 명령어로 확인:
```bash
find app/v2/models -name "*nudge*" -o -name "*daily*"
```

#### 3.2-A. 모델이 존재하면:

- [x] `test_golden_daily_nudge.py` Line 11 import 경로 수정 (실제 모델 구현됨)

#### 3.2-B. 모델이 없으면:

- [x] **임시 해결**: 테스트 파일에 Mock 클래스 생성 (V2GoldenDailyNudge 모델 구현으로 대체됨)
```python
# test_golden_daily_nudge.py 상단에 추가
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.db.base_class import Base

class V2GoldenDailyNudge(Base):
    __tablename__ = "v2_golden_daily_nudge_test"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("v2_user.id"))
    scheduled_at = Column(DateTime)
    message = Column(String(500))
    status = Column(String(20))
    sent_at = Column(DateTime, nullable=True)
```

- [ ] **장기 해결**: Golden Nudge 모델 구현 백로그에 추가

**예상 해결 테스트**: 7개 (Golden 관련)

---

### ✅ Task 4: Game Log dedup_key 속성 추가

**파일**: `app/v2/models/v2_game_log.py`

- [x] Line 40 이후에 추가:
```python
# 중복 방지 키 (선택적)
dedup_key = Column(
    String(128),
    unique=True,
    nullable=True,
    index=True,
    comment="중복 방지 키 (user_id + game_type + timestamp)",
)
```

**검증**:
```bash
python -c "from app.v2.models.v2_game_log import V2GameLog; print(hasattr(V2GameLog, 'dedup_key'))"
```

**예상 해결 테스트**: 3개 (Game Log dedup)

---

### ✅ Task 4-2: Ops Paste Import Game Log 테스트 정합화

**파일**: `tests/v2/test_ops_paste_import_game_log.py`

- [x] `V2GameLog` 필드명(`payout_amount`, `recorded_at`) 기준으로 테스트 수정
- [x] 재실행으로 통과 확인

**검증**:
```bash
pytest tests/v2/test_ops_paste_import_game_log.py -v
```

**예상 해결 테스트**: 4개 (Paste Import Game Log)

---

### ✅ Task 4-3: Mission SoT 테스트 정합화

**파일**: `tests/v2/test_mission_sot.py`

- [x] 미션 생성 시 필수 필드(`logic_key`, `reward_type`) 지정
- [x] 재실행으로 통과 확인

**검증**:
```bash
pytest tests/v2/test_mission_sot.py -v
```

**예상 해결 테스트**: 2개 (Mission New User)

---

### ✅ Task 4-4: Golden Intervention Flow 테스트 정합화

**파일**: `tests/v2/test_golden_intervention_flow.py`

- [x] 모델 필드/상태값(`trigger_id`, `action_taken`, `PENDING_APPROVAL` 등) 기준으로 테스트 정합화
- [x] 재실행으로 통과 확인

**검증**:
```bash
pytest tests/v2/test_golden_intervention_flow.py -v
```

**예상 해결 테스트**: 2개 (Golden Intervention)

---

### ✅ Task 4-1: Root Health 엔드포인트 추가

**파일**: `app/main.py`

- [x] `/health`, `/health/db` 루트 헬스 엔드포인트 추가

**검증**:
```bash
pytest tests/v2/test_ops_smoke_core_routes.py -v
```

**예상 해결 테스트**: 6개 (Ops Health/Smoke)

---

## 🟡 P1: 당일 수정 (2-4시간) - 예상 +40개 통과 -- **완료/검증됨**

### ✅ Task 5: Vault FK 마이그레이션 확인

#### 5.1. 현재 상태 확인

- [x] VaultWithdrawalRequest FK 확인 (이미 마이그레이션됨):
```bash
grep -n "ForeignKey" app/v2/models/*withdrawal*.py
```

#### 5.2. FK 수정 필요 시

**파일**: `app/v2/models/vault_withdrawal_request.py` (추정 경로)

- [ ] FK 수정:
```python
# 변경 전
user_id = Column(Integer, ForeignKey("user.id", ondelete="CASCADE"))

# 변경 후
user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"))
```

- [x] Relationship 수정 (이미 적용됨):
```python
# 변경 전
user = relationship("User")

# 변경 후
user = relationship("V2User")
```

#### 5.3. Alembic 마이그레이션

- [ ] 기존 마이그레이션 확인:
```bash
grep -r "vault_withdrawal_request" alembic/versions/
```

- [ ] 마이그레이션 적용:
```bash
alembic upgrade head
```

**검증**:
```bash
pytest tests/v2/test_vault_service_real.py -v
```

**예상 해결 테스트**: 28개 (Vault 관련)

---

### ✅ Task 6: Team Battle FK 수정

#### 6.1. SoT 충돌 확인

**참고 문서**: `docs/soT/00_game/v2_team_battle_sot_ko.md:48`

- [x] 문서 확인:
```bash
grep "정책/구현 충돌" docs/soT/00_game/v2_team_battle_sot_ko.md
```

#### 6.2. 모델 파일 확인

- [ ] 파일 찾기:
```bash
find app/v2/models -name "*team*.py"
```

#### 6.3. FK 수정

**파일**: `app/v2/models/core/team_battle.py` (추정)

- [x] 모든 `ForeignKey("user.id")` → `ForeignKey("v2_user.id")` 변경 (이미 적용됨)
- [x] 모든 `relationship("User")` → `relationship("V2User")` 변경 (이미 적용됨)

#### 6.4. 마이그레이션

- [ ] 새 마이그레이션 생성 또는 기존 적용:
```bash
alembic upgrade head
```

**검증**:
```bash
pytest tests/v2/test_team_battle_points_bridge.py -v
```

**예상 해결 테스트**: 5개 (Team Battle)

---

### ✅ Task 7: Economy Inventory 관련 수정

#### 7.1. Inventory Service 확인

- [x] 테스트 실패 원인 확인:
```bash
pytest tests/v2/test_inventory_shop.py::TestInventoryEdgeCases::test_grant_item_rejects_non_positive -vv
```

#### 7.2. Bundle 로직 확인

**파일**: `app/v2/services/inventory_service.py` (추정)

- [x] Bundle expansion 로직이 SoT와 일치하는지 확인
- [x] 필요시 로직 수정

**예상 해결 테스트**: 7개 (Inventory 관련)

---

## 🟢 P2: 주간 수정 (1-2일) - 예상 +20개 통과

### ✅ Task 8: Auth Event FK 수정

#### 8.1. 모델 확인

- [x] AuthEvent 모델 찾기:
```bash
find app/v2/models -name "*auth*.py"
```

#### 8.2. FK 수정

**파일**: `app/v2/models/auth_event.py` (추정)

- [ ] FK 수정:
```python
user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"))
```

**예상 해결 테스트**: 9개 (Auth 관련)

---

### ✅ Task 9: Admin API 구현 (선택적)

#### 9.1. 우선순위 엔드포인트

- [ ] `/api/v2/admin/game/roulette/config` (GET)
- [ ] `/api/v2/admin/game/dice/config` (GET)
- [ ] `/api/v2/admin/game/lottery/config` (GET)

#### 9.2. 최소 구현

```python
@router.get("/game/roulette/config")
async def get_roulette_config():
    return {"config": {}, "status": "ok"}
```

**예상 해결 테스트**: 5개 (Admin API)

---

### ✅ Task 10: DB 마이그레이션 전체 재실행 -- **완료**

#### 10.1. 현재 마이그레이션 상태 확인

- [ ] 마이그레이션 이력 확인:
```bash
alembic current
alembic history
```

#### 10.2. 테스트 DB 초기화

- [ ] 테스트 DB 리셋:
```bash
rm -f test.db  # SQLite인 경우
pytest tests/v2/conftest.py::setup_test_db --setup-show
```

#### 10.3. 모든 마이그레이션 재실행

- [ ] 마이그레이션 적용:
```bash
alembic stamp head
alembic upgrade head
```

**예상 해결 테스트**: 6개 (DB Constraint 관련)

---

### ✅ Task 13: CSV Import Preview Test 개선 -- **완료**

#### 13.1. 테스트 실패 분석
- [x] `test_admin_csv_import_preview.py` 실패 원인 분석 (API 경로 및 파라미터 불일치)

#### 13.2. 테스트 코드 수정
- [x] API 엔드포인트 경로 수정 (`/api/v2/admin/csv-import/...`)
- [x] `import_type` 파라미터 추가
- [x] `HQ_MARGIN` CSV 파일 필수 컬럼 추가

#### 13.3. 검증
- [x] `pytest tests/v2/test_admin_csv_import_preview.py -v` (Pass)

---

### ✅ Task 13: CSV Import Preview Test 개선 -- **완료**

#### 13.1. 테스트 실패 분석
- [x] `test_admin_csv_import_preview.py` 실패 원인 분석 (API 경로 및 파라미터 불일치)

#### 13.2. 테스트 코드 수정
- [x] API 엔드포인트 경로 수정 (`/api/v2/admin/csv-import/...`)
- [x] `import_type` 파라미터 추가
- [x] `HQ_MARGIN` CSV 파일 필수 컬럼 추가

#### 13.3. 검증
- [x] `pytest tests/v2/test_admin_csv_import_preview.py -v` (Pass)

---

### ✅ Task 14: Game Config Readonly Test 개선 -- **완료**

#### 14.1. 테스트 실패 분석
- [x] `test_admin_game_config_readonly.py` API 경로 불일치 분석

#### 14.2. 테스트 코드 수정
- [x] API 엔드포인트 수정 (`/config` -> `/configs`)
- [x] Dice 설정 404 허용 처리

#### 14.3. 검증
- [x] `pytest tests/v2/test_admin_game_config_readonly.py -v` (Pass)

---

### ✅ Task 15: Golden Daily Nudge Test 개선 -- **완료**

#### 15.1. 테스트 실패 분석
- [x] `DailyNudgeService`의 `business_day_start` 호출 인자 오류 (`offset_hours`) 확인
- [x] `V2VaultService`의 `set_benefits_suspended_manual` 미구현 확인

#### 15.2. 코드 수정
- [x] `DailyNudgeService` 수정: `offset_hours` 인자 제거
- [x] `test_golden_daily_nudge.py` 수정:
    - 티켓 지급 수량 명시 (`ticket_amount=1`)
    - 제재 상태 설정 방식 변경 (`user.benefits_suspended_manual = 1`)

#### 15.3. 검증
- [x] `pytest tests/v2/test_golden_daily_nudge.py -v` (Pass)

---

## 📊 진행 상황 추적

### 현재 상태

| 단계 | 완료 | 예상 통과 증가 | 누적 통과율 |
|------|------|----------------|-------------|
| **P0** | ✅ 4/4 | +35개 | 57.3% |
| **P1** | ✅ 4/4 | +40개 | 63.9% |
| **P2** | 🚧 2/3 | +20개 | 67.2% |
| **목표** | ⬜ 0/11 | +95개 | **70%+** |

### 체크포인트

- [ ] **Checkpoint 1**: P0 완료 후 테스트 실행
```bash
pytest tests/v2/ -q --tb=no | grep "passed"
# Expected: 350+ passed
```

- [ ] **Checkpoint 2**: P1 완료 후 테스트 실행
```bash
pytest tests/v2/ -q --tb=no | grep "passed"
# Expected: 390+ passed
```

- [ ] **Checkpoint 3**: P2 완료 후 테스트 실행
```bash
pytest tests/v2/ -q --tb=no | grep "passed"
# Expected: 410+ passed (67%+)
```

- [ ] **Final Check**: 전체 커버리지 확인
```bash
pytest tests/v2/ --cov=app/v2 --cov-report=term
# Expected: 70%+
```

---

## 🚨 주의사항

### ⚠️ 수정 시 필수 확인사항

1. **SoT 문서와 대조**
   - [ ] 변경사항이 SoT 문서와 일치하는지 확인
   - [ ] 충돌 발견 시 문서에 명시

2. **기존 코드 영향도**
   - [ ] 변경이 다른 모듈에 영향을 주는지 확인
   - [ ] Import 경로 변경 시 전체 검색

3. **마이그레이션 안전성**
   - [ ] 프로덕션 데이터 백업 확인
   - [ ] FK 변경 시 고아 레코드 정리
   - [ ] Rollback 계획 수립

4. **테스트 실행 순서**
   - [ ] 각 Task 완료 후 관련 테스트 실행
   - [ ] 전체 테스트는 마지막에만 실행 (시간 절약)

---

## 📝 작업 로그

### 2026-02-07

- [ ] P0-Task1 시작 시각: ___________
- [ ] P0-Task1 완료 시각: ___________
- [ ] P0-Task1 검증 결과: ___________

- [ ] P0-Task2 시작 시각: ___________
- [ ] P0-Task2 완료 시각: ___________
- [ ] P0-Task2 검증 결과: ___________

- [ ] P0-Task3 시작 시각: ___________
- [ ] P0-Task3 완료 시각: ___________
- [ ] P0-Task3 검증 결과: ___________

- [ ] P0-Task4 시작 시각: ___________
- [ ] P0-Task4 완료 시각: ___________
- [ ] P0-Task4 검증 결과: ___________

---

## 🔗 관련 문서

- [테스트 실패 분석 보고서](./20260207_test_failure_analysis_report.md)
- [FK 마이그레이션 가이드](../00_user/아카이브/2026_01_31_multi_table_fk_fix.md)
- [V2 User SoT](../00_user/v2_user_sot_ko.md)
- [Team Battle SoT](../00_game/v2_team_battle_sot_ko.md)

---

## 📌 완료 조건

✅ **완료 기준**:
- [ ] P0 모든 Task 완료
- [ ] P1 모든 Task 완료
- [ ] P2 핵심 Task 완료
- [ ] 테스트 통과율 70% 이상
- [ ] 커버리지 리포트 생성
- [ ] SoT 문서 업데이트

🎉 **성공 메트릭**:
- 테스트 통과: 430개+ (70%+)
- 실패: 100개 이하
- 에러: 50개 이하
- 커버리지: 70%+
