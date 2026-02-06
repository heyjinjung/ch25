# 주사위 게임 골든아워 미적용 문제 (2026-01-31)

## 에러 내용
- **증상**: 주사위 게임에서 골든아워가 적용되지 않음
- **영향범위**: 주사위 게임 전체 (유저)
- **긴급도**: 🟡 중

## 문제 원인

### Root Cause
`v2_dice_config.enable_golden_hour = 0` (비활성화 상태)로 DB에 저장되어 있었음.

### 골든아워 적용 조건 (2-Factor 체크)

주사위 게임에서 골든아워가 적용되려면 **두 가지 조건**이 모두 충족되어야 합니다:

1. **전역 골든아워 활성화** (`vault2_config.golden_hour_config`)
   - `enabled = true`
   - `manual_override = FORCE_ON` 또는 시간대 내 (`start_time_kst` ~ `end_time_kst`)

2. **주사위 게임별 골든아워 게이트** (`v2_dice_config.enable_golden_hour`)
   - `enable_golden_hour = 1` (활성화)

### 코드 로직

**파일**: [app/v2/services/v2_dice_game_service.py:244-247](../../../app/v2/services/v2_dice_game_service.py#L244-L247)

```python
golden_active = False
golden_multiplier = 1.0
if bool(getattr(config, "enable_golden_hour", False)):  # 1차 체크: 주사위 게임 설정
    golden_active = V2EventService().is_golden_hour(db=db, now=now_dt)  # 2차 체크: 전역 골든아워
    if golden_active:
        golden_multiplier = float(getattr(config, "golden_hour_multiplier", 1.0) or 1.0)
```

### 문제 상황
- 전역 골든아워: `enabled=True`, `manual_override=FORCE_ON` ✅ 정상
- 주사위 골든아워: `enable_golden_hour=0` ❌ **비활성화**
- **결과**: 1차 체크에서 실패 → 골든아워 미적용

## 해결 방법

### 즉시 조치 (운영 DB 직접 수정)

```sql
UPDATE v2_dice_config
SET enable_golden_hour = 1
WHERE id = 1;
```

**적용 결과**:
```
현재 설정: enable_golden_hour=1, multiplier=2.0
전역 골든아워 활성: True
주사위 골든아워 적용: True ✅
```

### 향후 관리 방법

어드민 페이지에서 설정 변경 가능:
- **경로**: `/admin/game/dice` → "골든 아워 설정" 섹션
- **필드**: "골든 아워 켜짐/꺼짐" 토글
- **백엔드 API**: `PUT /api/v2/admin/game/dice` (`enable_golden_hour` 필드)

## 관련 파일

### 백엔드
- [app/v2/services/v2_dice_game_service.py](../../../app/v2/services/v2_dice_game_service.py)
  - Lines 244-250: 골든아워 체크 및 배율 적용 로직
- [app/v2/services/event_service.py](../../../app/v2/services/event_service.py)
  - Lines 22-47: `is_golden_hour()` - 전역 골든아워 판정
- [app/v2/models/v2_dice.py](../../../app/v2/models/v2_dice.py)
  - Lines 36-38: `enable_golden_hour`, `golden_hour_multiplier` 컬럼 정의
- [app/v2/api/admin/game_config_routes.py](../../../app/v2/api/admin/game_config_routes.py)
  - Lines 522-525: 어드민 API - 골든아워 설정 업데이트

### 프론트엔드
- [src/v2/admin/pages/game/DiceConfigPage.tsx](../../../src/v2/admin/pages/game/DiceConfigPage.tsx)
  - Lines 331-335: 골든아워 토글 UI
- [src/v2/api/adminApi.ts](../../../src/v2/api/adminApi.ts)
  - Lines 1752-1753: `AdminDiceConfigDto` 타입 정의
  - Lines 1990-1993: API 요청 시 snake_case 변환

## 정책 문서

- [docs/v2_specs/07_golden/v2_golden_hour_policy_sot_ko.md](../../07_golden/v2_golden_hour_policy_sot_ko.md)
  - 골든아워 전역 정책 및 주사위 적용 SoT

## 검증

### 전역 골든아워 상태 확인
```python
from app.v2.services.event_service import V2EventService
svc = V2EventService()
is_golden = svc.is_golden_hour(db, now)
status = svc.get_golden_hour_status(db, now)
```

### 주사위 골든아워 설정 확인
```sql
SELECT id, name, enable_golden_hour, golden_hour_multiplier
FROM v2_dice_config
WHERE is_active = 1;
```

### 통합 테스트
```python
from app.v2.services.v2_dice_game_service import V2DiceGameService
from app.v2.services.game_config_service import V2GameConfigService

config = V2GameConfigService.get_active_dice_config(db)
golden_active = V2EventService().is_golden_hour(db=db, now=now)
will_apply = bool(config.enable_golden_hour) and golden_active
```

## 예방 조치

### 초기 시드 데이터 확인
마이그레이션 또는 시드 스크립트에서 `enable_golden_hour` 기본값을 `True`로 설정:

```python
# alembic/versions/XXXXX_seed_dice_config.py
op.execute("""
    INSERT INTO v2_dice_config
    (name, ticket_type, is_active, enable_golden_hour, golden_hour_multiplier)
    VALUES
    ('Default Dice Config', 'DICE_TICKET', 1, 1, 2.0)
    ON DUPLICATE KEY UPDATE
    enable_golden_hour = VALUES(enable_golden_hour);
""")
```

### 어드민 알림
골든아워 전역 설정이 `FORCE_ON` 또는 시간대 내인데 주사위 `enable_golden_hour=0`인 경우 어드민 페이지에 경고 표시 고려.

## 상태
✅ **해결 완료** (2026-01-31 14:15 KST)

## 커밋
수동 DB 업데이트로 해결 (코드 변경 없음)
