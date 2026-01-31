문서 타입: 트러블슈팅 (주간)
주차: W05 (2026-01-27 ~ 2026-02-02)
도메인: GAME (게임)
상태: ACTIVE

# W05 GAME 트러블슈팅

## 요약
| 날짜 | 이슈 | 상태 |
|---|---|---|
| 01-31 | 게임 API ModuleNotFoundError | ✅ RESOLVED |
| 01-31 | 복권 퍼즐조각 미지급 버그 | ✅ RESOLVED |
| 01-31 | 주사위 게임 골든아워 미적용 | ✅ RESOLVED |
| 01-31 | 게임 로그 테이블 FK 누락 | ✅ RESOLVED |
| 01-31 | 주사위 골든아워 시간설정 500 에러 | ✅ RESOLVED |

---

## 01-31 - [GAME] 게임 API ModuleNotFoundError (v2_user 경로 오류)

**우선순위**: P0
**관련 도메인**: GAME, BACKEND

### 증상
- 주사위/룰렛/복권 플레이 시 500 에러 발생.
- 로그 에러 메시지: `ModuleNotFoundError: No module named 'app.v2.models.v2_user'`

### 근본 원인
- **기술적 원인**: `vault_service.py` 내의 `is_benefits_suspended()` 메서드에서 리팩토링 중 잘못된 모델 import 경로가 고착됨.
- **코드 레벨 분석**: `from app.v2.models.v2_user import V2User` (오류) -> `from app.v2.models.user import V2User` (정상)으로 수정이 필요했음.

### 해결 방법
#### Immediate Fix
- `app/v2/services/vault_service.py` 파일의 import 구문을 수정하고 백엔드 긴급 배포.

### 검증 방법
- `POST /api/v2/roulette/play` 호출 시 200 OK 응답 및 정상 플레이 확인.

---

## 01-31 - [GAME] 복권 퍼즐조각 미지급 및 보상 금액 0 설정 오류

**우선순위**: P1
**관련 도메인**: GAME, DB

### 증상
- 복권 게임 당첨(PUZZLE_C1, PUZZLE_C2) 시 인벤토리에 아이템이 지급되지 않음.
- 당첨 메시지는 뜨지만 실제 재화 변동이 없음.

### 근본 원인
- **분석**: `v2_lottery_prize` 테이블의 `reward_amount` 값이 0으로 시드(Seed)되어 있었음. 보상 지급 로직은 `amount > 0`일 때만 작동하도록 설계되어 있어 스킵됨.

### 해결 방법
#### Immediate Fix
- DB 업데이트 수행: `UPDATE v2_lottery_prize SET reward_amount=1 WHERE reward_type IN ('PUZZLE_C1', 'PUZZLE_C2')`
#### Long-term Fix
- `20260130_2100_seed_core_game_mission_admin.py` 시드 스크립트 수정 및 재검증.

### 검증 방법
- 수동 게임 플레이 후 인벤토리 아이템 수량 증가 확인.

---

## 01-31 - [GAME/DB] 게임 로그 테이블 (Dice/Roulette/Lottery) FK 누락

**우선순위**: P1
**관련 도메인**: GAME, DB, DATA_INTEGRITY

### 증상
- `v2_dice_log`, `v2_roulette_log`, `v2_lottery_log` 테이블에 `user_id` -> `v2_user.id` 물리적 FK 제약조건이 없음.

### 근본 원인
- **분석**: 초기 V2 마이그레이션 시 설정(Config) 테이블과의 FK는 생성되었으나, 트래픽이 높은 로그 테이블의 특성을 고려해 유저 FK를 고의 또는 실수로 누락함.

### 해결 방법
#### Immediate Fix
- `alembic` 마이그레이션(`20260131_1500_add_v2_user_fk_to_log_tables.py`)을 통해 FK 제약조건 추가.
- `ON DELETE SET NULL` 옵션을 적용하여 유저 삭제 시에도 감사용 로그 데이터는 보존하도록 설정.

### 검증 방법
- `SHOW CREATE TABLE v2_dice_log` 등을 통해 CONSTRAINT 생성 여부 확인.

---

## 01-31 - [GAME] 주사위 게임 골든아워 미적용 문제

**우선순위**: P1
**관련 도메인**: GAME, VAULT (Event)

### 증상
- 전역 골든아워가 활성화(FORCE_ON) 상태임에도 불구하고 주사위 게임에서 배율(X2) 보너스가 적용되지 않음.

### 근본 원인
- **기술적 원인**: `v2_dice_config.enable_golden_hour` 필드가 `0`(비활성)으로 설정되어 있었음.
- **분석**: 주사위 게임의 골든아워는 `전역 설정`과 `개별 게임 설정`이 모두 `True`여야 작동함. 서비스 로직(`v2_dice_game_service.py`)에서 1차 게이트인 개별 설정을 통과하지 못해 전역 설정을 확인하지 않음.

### 해결 방법
#### Immediate Fix
- 운영 DB 수정: `UPDATE v2_dice_config SET enable_golden_hour = 1 WHERE id = 1;`
#### Long-term Fix
- 어드민 설정 페이지(/admin/game/dice)의 "골든 아워 설정" 가시성을 높여 운영자가 상시 확인 가능하도록 UI 개선.

### 검증 방법
- `is_golden_hour` 판정 로직 테스트 및 실제 주사위 플레이 시 배율 적용 확인.

### 예방 가이드라인
- 새로운 주사위 설정(Config) 추가 시 골든아워 활성화 여부를 기본 체크리스트에 포함.

---

## 01-31 - [GAME/DB] 주사위 골든아워 시간설정 500 에러 (Data too long)

**우선순위**: P1
**관련 도메인**: GAME, DB, FRONTEND

### 증상
- 어드민 페이지(/admin/game/dice)에서 골든아워 시작/종료 시간 설정 후 저장 시 500 에러 발생.
- API 요청: `PUT /api/v2/admin/game/dice/config/1`

### 근본 원인
- **Stack Trace**: `sqlalchemy.exc.DataError: (1406, "Data too long for column 'golden_hour_start_time' at row 1")`
- **Parameter 분석**: `golden_hour_start_time: '15:30:00:00'` (11자)
- **DB 컬럼 제약**: `golden_hour_start_time` 컬럼은 `String(8)` (HH:MM:SS 8자 형식)
- **코드 레벨 원인**: 
  1. 프론트엔드 `<Input type="time" step="1" />` 설정으로 `HH:MM:SS` 형식이 입력될 수 있음
  2. `onChange` 핸들러에서 `e.target.value + ":00"` 로직 적용 시 `HH:MM:SS:00` (11자) 생성
  3. 백엔드에서 입력값 검증 없이 DB에 직접 저장 시도

### 해결 방법
#### Frontend Fix (DiceConfigPage.tsx)
```tsx
// Before (버그)
<Input type="time" step="1" ... />
onChange={(e) => handleConfigChange("goldenHourStartTime", e.target.value + ":00")}

// After (수정)
<Input type="time" ... />  // step="1" 제거
onChange={(e) => {
  const timeValue = e.target.value.substring(0, 5) + ":00";  // HH:MM:SS 고정
  handleConfigChange("goldenHourStartTime", timeValue);
}}
```

#### Backend Fix (game_config_routes.py)
```python
# 방어 코딩 추가: 8자 초과 시 절삭, 5자(HH:MM)면 :00 추가
if payload.golden_hour_start_time is not None:
    time_str = payload.golden_hour_start_time[:8] if len(payload.golden_hour_start_time) > 8 else payload.golden_hour_start_time
    if len(time_str) == 5:
        time_str = time_str + ":00"
    config.golden_hour_start_time = time_str
```

### 검증 방법
- 어드민에서 골든아워 시간 수정 후 저장 → 200 OK 응답 확인
- DB에서 `SELECT golden_hour_start_time FROM v2_dice_config WHERE id=1` → 8자 형식 확인

### 예방 가이드라인
1. **DB String 컬럼 정의 시** 최대 길이를 명확히 정의하고 문서화
2. **시간 입력 UI** 구현 시 `step` 속성 사용에 주의 (초 단위 입력 시 형식 변경)
3. **백엔드 API**에서 DB 저장 전 입력값 길이/형식 검증 필수

---

## 변경 이력
- 2026-01-31: W05 GAME 문서 생성, 기존 분산 문서 통합
- 2026-01-31: 골든아워 시간설정 500 에러 이슈 추가
- 2026-01-31: HQ Margin CSV Import 테스트 실패 (Assert 0 == 1) 추가

---

## 01-31 - [GAME] HQ Margin CSV Import 테스트 실패 (Assert 0 == 1)

**우선순위**: P1
**관련 도메인**: GAME, ADMIN, TEST

### 증상
- `test_import_hq_margin_csv_success` 테스트 실행 중 `assert result["updated_count"] == 1` 실패 (Actual: 0).
- `NameError`, `SyntaxError` 테스트 코드 작성 중 발생.

### 근본 원인
- **Mocking Strategy**: `db.query().filter().first()` 체이닝에 대한 Mock `side_effect`가 불안정하여, 첫 번째 Row("user1") 처리 시 유저를 찾지 못한 것으로 판단됨 (또는 `skipped_count`로 빠짐).
- **Test Code Quality**: `patch` 객체 미할당 및 들여쓰기 오류로 인한 실행 불가 상태 발생.

### 해결 방법
#### Immediate Fix
- `test_hq_margin_integration.py`의 Mock Setup을 `user_filter_mock.first.side_effect = [mock_user1, None]`으로 명확히 지정.
- `with patch(...)` 블록 들여쓰기 교정.

### 검증 방법
- `pytest tests/v2/admin/test_hq_margin_integration.py -v` (Pass 확인)
