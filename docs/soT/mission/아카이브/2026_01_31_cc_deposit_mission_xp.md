# 트러블슈팅: CC 입금 내역이 미션/XP에 반영 안 되는 문제

**날짜**: 2026-01-31
**우선순위**: 🔴 높음
**상태**: ✅ 수정 완료 (배포 대기)

---

## 문제 증상

### 사용자 보고
1. 금고 출금 조건 모달에는 입금 내역이 표시됨
2. **레벨 XP가 반영되지 않음**
3. **주간 CC 입금 3회 미션 진행이 0/3으로 정체**

```
미션 예시:
주간 CC 입금 3회
보상: 5,000
진행 중: 0 / 3  ← 입금해도 증가하지 않음
```

---

## 원인 분석

### 1. 코드 분석
- **파일**: `app/v2/services/admin_cc_deposit_service.py`
- **메서드**: `V2AdminCCDepositService.upsert_many()` (Line 155-351)

#### 입금 처리 시 수행되는 작업:
```python
# Line 257: ✅ Vault 신호 발송 (정상)
vault_service.handle_deposit_increase_signal(...)

# Line 334: ✅ XP 적립 (정상)
level_xp.add_xp(db, user_id=row.user_id, delta=xp_to_add, source="CC_DEPOSIT", ...)

# ❌ 미션 진행 업데이트 누락!
# mission_service.update_progress(user_id, "CC_DEPOSIT", delta=1) 호출 없음
```

#### XP 적립 조건 (Line 331):
```python
if deposit_steps > 0 and xp_per_step > 0 and deposit_delta > 0:
    # deposit_delta = 새 입금액 - 이전 입금액
    # deposit_steps = deposit_delta // STEP_AMOUNT (기본: 100,000원)
```

**핵심**: 입금액이 **증가해야만** XP와 미션이 업데이트됨!

### 2. 운영 서버 데이터 확인 결과

```bash
=== external_ranking_data (입금 데이터) ===
User 2: 5,050,000원, updated: 2026-01-24
User 4: 100,000원, updated: 2026-01-27
User 998909: 2,000,000원, updated: 2026-01-27
User 998914: 1,000,000원, updated: 2026-01-27
...총 7명

=== user_xp_event_log (CC_DEPOSIT) ===
User 4: 1회, 총 20 XP, 생성: 2026-01-27
User 998909: 1회, 총 100 XP, 생성: 2026-01-27
User 998914: 1회, 총 200 XP, 생성: 2026-01-27

=== Mission 17: 주간 CC 입금 3회 (WEEKLY) ===
진행 중인 유저: 0명  ← ❌ 문제!
```

### 3. 근본 원인

**2026-01-27 이전 코드에는 미션 업데이트 로직이 없었습니다.**

- XP는 일부 유저에게 정상 반영됨 (deposit_delta > 0인 경우)
- 미션 진행은 **전혀** 업데이트되지 않음

---

## 해결 방법

### 수정 내용

**파일**: `app/v2/services/admin_cc_deposit_service.py`
**위치**: Line 342-361 (XP 적립 직후)

```python
# Mission progress update: CC_DEPOSIT 미션 진행 업데이트
# deposit_steps 단위로 미션 카운트 (입금 횟수 기준)
try:
    from app.v2.services.mission_service import V2MissionService
    mission_service = V2MissionService(db)
    mission_service.update_progress(
        user_id=row.user_id,
        action_type="CC_DEPOSIT",
        delta=1  # 입금 1회로 카운트
    )
    logger.info(
        "cc_deposit -> mission progress updated: user_id=%s action=CC_DEPOSIT delta=1",
        row.user_id
    )
except Exception as e:
    logger.warning(
        "cc_deposit -> mission progress update failed: user_id=%s error=%s",
        row.user_id,
        str(e)
    )
```

### 적용 시점
- **코드 수정**: 2026-01-31 완료
- **효과**: 다음 입금 데이터 업데이트부터 XP + 미션 모두 정상 반영

### 기존 데이터 처리
**1월 27일 이전 입금 데이터는 소급 적용되지 않습니다.**

- 이유: `upsert_many`는 **입금 증가 시에만** XP/미션을 업데이트
- 해결: 새로운 입금 데이터가 업데이트되면 자동으로 반영됨

---

## 검증 방법

### 1. 로컬 테스트
```bash
# Docker 컨테이너 내에서 확인
docker compose exec backend python -c "
from app.v2.services.admin_cc_deposit_service import V2AdminCCDepositService
from app.v2.services.mission_service import V2MissionService
print('✅ Import successful')
"
```

### 2. 운영 서버 검증

#### 배포 후 입금 데이터 업데이트 시:
```bash
# 백엔드 로그 확인
docker logs xmas-backend --tail=100 | grep "cc_deposit -> mission"

# 예상 로그:
# INFO: cc_deposit -> mission progress updated: user_id=XXX action=CC_DEPOSIT delta=1
```

#### DB 직접 확인:
```sql
-- 미션 진행 상황 확인
SELECT
    u.nickname,
    p.current_value,
    p.reset_date
FROM user_mission_progress p
JOIN v2_user u ON p.user_id = u.id
WHERE p.mission_id = 17  -- 주간 CC 입금 3회
AND p.reset_date = '2026-W05'  -- 현재 주차
ORDER BY p.current_value DESC;
```

---

## 관련 이슈

### 스키마/마이그레이션 문제 여부: ❌ 없음
- `user_mission_progress`, `external_ranking_data` 모두 v2_user FK로 정상 변경됨
- Issue 20까지 완료 - FK 마이그레이션 완료

### 비즈니스 로직 문제: ✅ 발견 및 수정
- 입금 처리 시 미션 업데이트 로직 누락
- `mission_service.update_progress()` 호출 추가로 해결

---

## 기술 참고 문서

### 관련 파일
- `app/v2/services/admin_cc_deposit_service.py` (수정)
- `app/v2/services/mission_service.py` (참조)
- `app/models/mission.py` (미션 모델)

### 미션 액션 타입 정의
`app/v2/services/mission_service.py:31`
```python
ACTION_TYPE_ALIASES = {
    "CC_DEPOSIT": ["DEPOSIT", "CC_INPUT"],
    ...
}
```

### XP 적립 기준
- **STEP_AMOUNT**: 100,000원 (기본)
- **XP_PER_STEP**: 20 XP (기본)
- **조건**: `deposit_delta > 0` (입금 증가 필요)

---

## 후속 조치

### 배포 전
- [x] 코드 수정 완료
- [ ] 로컬 환경 테스트
- [ ] 배포 문서 업데이트

### 배포 후
- [ ] 운영 서버 로그 모니터링
- [ ] 다음 입금 업데이트 시 미션 진행 확인
- [ ] 사용자 피드백 수집

### 향후 개선 사항
- 입금 데이터 업데이트 자동화 고려
- 미션 진행 상황 실시간 모니터링 대시보드
- XP/미션 업데이트 실패 시 알림 시스템

---

## 변경 이력
- **2026-01-31**: 최초 작성 (Issue 21 - CC 입금 미션/XP 반영 문제)
