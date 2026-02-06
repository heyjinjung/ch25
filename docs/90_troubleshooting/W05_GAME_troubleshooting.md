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
| 02-01 | 어드민 유저 게임 로그 조회 500 (dice_sum 속성) | ✅ RESOLVED |
| 02-01 | 어드민 유저 게임 로그 조회 500 (V2RouletteLog segment_index 속성 오류) | ✅ FIXED |
| 01-20 | [GAME] 게임 토큰 명칭 불일치 (GOLD_KEY vs GOLD_KEY_TICKET) | ✅ FIXED |
| 01-20 | [GAME] 프리미엄 룰렛 접근 제어 로직 누락 | ✅ FIXED |
| 01-20 | [GAME] Roulette 스키마 직렬화 실패 (reward_type/grade Error) | ✅ FIXED |
| 02-02 | 룰렛 체험 티켓 일일 3회 제한 오작동 및 Nudge 지급 버그 | ✅ RESOLVED |
| 02-02 | 어드민 룰렛 설정 저장 422 (TRIAL_TICKET RewardType 누락) | ✅ RESOLVED |

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

---

## 02-01 - [GAME] 어드민 게임 결과 로그 시각화 부재

### 📝 증상
- 어드민 > 유저 디테일 드로우에서 유저의 개별 게임 결과(Dice, Roulette, Lottery) 상세 내역을 확인할 수 없음.
- 특정 유저의 승/패 패턴이나 보상 지급 내역 디버깅이 어려움.

### 🔍 원인
- 백엔드에 `GameLog`를 통합 조회하는 API 부재 (개별 게임별로 흩어져 있음).
- 프론트엔드 UI 미구현.

### 🛠 해결
- **Backend**: `GET /api/v2/admin/users/{user_id}/game-logs` 엔드포인트 신설. (UserRoutes)
    - `type`(게임 종류) 필터링 지원 및 `items` 통합 반환.
- **Frontend**: `UserDetailDrawer` > `Game History` 탭 구현 및 `useUserGameLogs` 훅 연결.

### 📅 적용 일자
- 2026-02-01 (Feature)

---

## 02-01 - [GAME/ADMIN] 어드민 유저 게임 로그 조회 500 (dice_sum 속성)

**우선순위**: P1
**관련 도메인**: GAME, ADMIN, BACKEND

### 증상 정의 (Symptom Abstraction)
| 항목 | 내용 |
|---|---|
| **대상 기능** | 어드민 유저 게임 로그 조회 (`GET /api/v2/admin/users/{user_id}/game-logs`) |
| **HTTP Status** | 500 (Internal Server Error) |
| **영향 범위** | 어드민 유저 상세(게임 로그 탭) |
| **재현 빈도** | 간헐적 (로그 기준 확인) |

### 증거(로그)
```
AttributeError: 'V2DiceLog' object has no attribute 'dice_sum'
File "/app/app/v2/api/admin/user_routes.py", line 1307, in get_user_game_logs
  result=str(log.dice_sum) if log.dice_sum else None,
```

### 근본 원인 (증거 기반)
- `get_user_game_logs`에서 `V2DiceLog.dice_sum` 접근 시 `AttributeError` 발생.
- **증거**: 운영 서버 로그 스택 트레이스에서 `V2DiceLog` 객체에 `dice_sum` 속성이 없다고 명시.

### 즉시 조치(가이드)
- ✅ `V2DiceLog` 모델 확인 완료: `dice_sum` 컬럼 없음
- ✅ 실제 컬럼: `user_sum`, `dealer_sum`, `result` (WIN/LOSE/DRAW)
- ✅ `user_routes.py`의 `get_user_game_logs`에서 `dice_sum` → `result`로 수정

### 해결 코드
```python
# Before (버그)
result=str(log.dice_sum) if log.dice_sum else None,
vault_earn=log.vault_earn,

# After (수정)
result=log.result if log.result else None,
vault_earn=getattr(log, "vault_earn", None),
```

### 수정 파일
- `app/v2/api/admin/user_routes.py` (Line ~1307)

### 검증 방법
- 어드민에서 유저 상세 → 게임 로그 탭 진입 시 200 OK 및 리스트 표시 확인.
- 백엔드 로그에서 `AttributeError` 재발 여부 모니터링.

---

## 02-02 - [GAME/ADMIN] 어드민 룰렛 설정 저장 422 (TRIAL_TICKET RewardType 누락)

**우선순위**: P1
**관련 도메인**: GAME, ADMIN, FRONTEND

### 증상 정의 (Symptom Abstraction)
| 항목 | 내용 |
|---|---|
| **대상 기능** | 어드민 룰렛 설정 저장 (`PUT /api/v2/admin/game/roulette/config/{id}`) |
| **HTTP Status** | 422 (Unprocessable Entity) |
| **영향 범위** | 어드민 룰렛 설정 페이지 저장 기능 전체 |
| **재현 빈도** | 항상 (TRIAL_TICKET 포함 시) |

### 증거(로그/응답)
```
PUT https://cc-jm.com/api/v2/admin/game/roulette/config/4 422 (Unprocessable Entity)
```

### 근본 원인 (증거 기반)
- **스키마 불일치**: `app/v2/schemas/v2_admin_game.py`의 `RewardType`에 `TRIAL_TICKET` 누락.
- **프론트 요청**: `src/v2/constants/rewardItems.ts`에서 `TRIAL_TICKET`을 보상 타입으로 사용하며, 저장 시 `reward_type=TRIAL_TICKET`가 전송됨.
- 결과적으로 FastAPI/Pydantic 검증에서 422 발생.

### 해결 방법
#### Immediate Fix
- `RewardType`에 `TRIAL_TICKET` 추가
  - 파일: `app/v2/schemas/v2_admin_game.py`

### 검증 방법
1. 어드민 룰렛 설정에서 `TRIAL_TICKET` 보상 포함 후 저장
2. 응답 200 OK 확인 및 재조회 시 설정 값 유지 확인

### 예방 가이드라인
- SoT의 GameTokenType/RewardType과 프론트 보상 목록(REWARD_ITEMS) 정합성 점검 자동화
- RewardType 업데이트 시 admin 스키마/프론트 보상 목록 동시 갱신

### 수정 시각
- 2026-02-01 14:XX KST

---

## 02-01 - [GAME/ADMIN] 어드민 유저 게임 로그 조회 500 (V2RouletteLog segment_index 속성 오류)

**우선순위**: P1
**관련 도메인**: GAME, ADMIN, BACKEND

### 증상
- Admin 유저 상세 페이지에서 게임 로그 탭 진입 시 500 에러 발생
- 프론트엔드 콘솔:
  ```
  GET https://cc-jm.com/api/v2/admin/users/1/game-logs 500 (Internal Server Error)
  ```

### 증상 정의 (Symptom Abstraction)
| 항목 | 내용 |
|---|---|
| **대상 기능** | Admin 유저 게임 로그 조회 (`/api/v2/admin/users/{id}/game-logs`) |
| **HTTP Status** | 500 (Internal Server Error) |
| **영향 범위** | 어드민 유저 상세 페이지 게임 로그 탭 |
| **재현 빈도** | 항상 (룰렛 로그가 있는 유저) |

### 증거(로그)
```
AttributeError: 'V2RouletteLog' object has no attribute 'segment_index'
INFO:     144.48.39.14:0 - "GET /api/v2/admin/users/1/game-logs HTTP/1.1" 500 Internal Server Error
```

### 근본 원인
- `user_routes.py`의 `get_user_game_logs`에서 `V2RouletteLog`의 속성을 잘못 참조
- **모델 실제 속성**: `segment_id` (FK to `v2_roulette_segment.id`)
- **코드에서 사용**: `segment_index` ❌ (존재하지 않는 속성)

### 모델 vs 코드 불일치
| 항목 | 모델 (`v2_roulette.py`) | 코드 (`user_routes.py`) |
|---|---|---|
| 세그먼트 참조 | `segment_id` ✅ | `segment_index` ❌ |

### 해결 코드
```python
# Before (버그)
result=str(log.segment_index) if log.segment_index is not None else None,

# After (수정)
result=str(log.segment_id) if log.segment_id is not None else None,
```

### 수정 파일
- `app/v2/api/admin/user_routes.py` (Line ~1327)

### 검증 방법
```bash
# 로컬 검증
python -c "from app.v2.api.admin.user_routes import router; print('OK')"

# 배포 후 API 테스트
curl -H "Authorization: Bearer $TOKEN" https://cc-jm.com/api/v2/admin/users/1/game-logs
```

### 예방 가이드라인
1. **모델 속성 참조 시 모델 파일 확인 필수**
2. 게임 로그 DTO 매핑 시 `getattr()` 방어적 패턴 사용 권장
3. 새 게임 타입 추가 시 모델-라우트 속성 매핑 테스트 추가

---

## [REFERENCE] V2 게임 토큰 관련 트러블슈팅 (Game Token & Premium)

### 1. 골드키/다이아키 티켓 차감 누락
- **원인**: 프론트엔드(`GOLD_KEY`)와 백엔드 DB(`GOLD_KEY_TICKET`) 간의 토큰 타입 명칭 불일치.
- **해결**: 
    - FE: `TOKEN_TYPE_V2_MAP`을 통한 표준 명칭 매핑.
    - BE: `GameTokenType` Enum에 Legacy Alias 포함 및 서비스 레이어에서 양방향 호환(`in_()`) 처리.

### 2. Premium 룰렛 접근 제어 오류
- **증상**: VIP/WHALE 전용 게임에 COMMON 유저가 접근하거나, 정당한 권한자가 차단됨.
- **해결**: `GOLD_KEY`와 `GOLD_KEY_TICKET`을 모두 'Premium' 집합으로 관리하고, `UserSegment`를 조회하여 `["VIP", "WHALE"]` 여부를 엄격히 검증.

---

---

## 01-20 - [GAME/CONFIG] 게임 토큰 명칭 불일치 (GOLD_KEY vs GOLD_KEY_TICKET)

**우선순위**: P1
**관련 도메인**: GAME, VAULT, INVENTORY

### 증상
- 특정 게임(GOLD_KEY 룰렛 등) 실행 시 자산 부족 에러 발생 또는 토큰 소모 실패.
- 인벤토리에는 아이템이 있으나 게임 서버에서 인식하지 못함.

### 근본 원인
- 소스 코드 및 DB 설정 간 토큰 식별자 혼용: `GOLD_KEY` vs `GOLD_KEY_TICKET`.
- 이전 V1/V2 전환 과정에서 명칭 정의가 상이하게 적용됨.

### 해결 조치
- 모든 게임 설정 및 백엔드 로직에서 `GOLD_KEY_TICKET`으로 명칭 표준화(`token_type` 정규화).

### 검증 방법
- 황금열쇠 룰렛 실행 시 인벤토리의 열쇠가 정상 차감되고 게임이 시작되는지 확인.

---

## 01-20 - [GAME/ACCESS] 프리미엄 룰렛 접근 제어 및 티켓 검증

**우선순위**: P2
**관련 도메인**: GAME, AUTH

### 증상
- 일반 티켓 유저가 프리미엄 룰렛(황금열쇠 전용)에 접근 가능하거나, 잘못된 토큰 타입으로 게임 시도 시 500 에러 발생.

### 근본 원인
- `v2_roulette_game_service.py`에서 플레이 시도 시 사용자가 보유한 티켓 타입과 룰렛 설정(`reward_type`) 간의 엄격한 매칭 로직 누락.

### 해결 조치
- 게임 플레이 진입점(`play_game`)에서 `is_premium` 필드 및 `required_token_type` 검증 단계 추가.

### 검증 방법
- 일반 티켓 유저로 프리미엄 룰렛 API 호출 시 `403 Forbidden` 또는 `400 Invalid Token` 반환 확인.

---

## 01-20 - [GAME/SCHEMA] Roulette 스키마 직렬화 실패 (reward_type/grade)

**우선순위**: P2
**관련 도메인**: GAME, BACKEND

### 증상
- `/api/v2/admin/game/roulette/configs` 호출 시 `Pydantic ValidationError` 또는 500 에러 발생.

### 근본 원인
- DB에 저장된 `reward_type` (예: `TICKET_DICE`) 또는 `grade` 값이 Pydantic DTO의 Enum 허용 범위(`POINT|CREDIT|TICKET`)를 벗어남.

### 해결 조치
- `RouletteSegmentDto` 및 `RouletteConfigDto` 레벨에서 데이터 정규화(Normalization) 로직 추가.
- `TICKET_*` 로 시작하는 값은 자동으로 `TICKET`으로 매핑 처리.

### 검증 방법
- 어드민 룰렛 설정 페이지 로딩 시 에러 없이 리스트가 출력되는지 확인.

---

## 변경 이력
- 2026-01-31: W05 GAME 문서 생성 및 게임 API 모듈 감사
- 2026-01-31: 복권 퍼즐 미지급 및 주사위 골든아워 미적용 버그 해결 기록
- 2026-02-01: 어드민 게임 로그 조회 속성(dice_sum/segment_index) 오류 해결
- 2026-02-02: V2DiceLog 속성 참조 오류 및 게임 모듈 임포트 실패 해결 내역 추가 (Antigravity)
- 2026-02-02: 게임 토큰 표준화 및 프리미엄 접근 제어 사례 추가 (Antigravity)
- 2026-02-02: 게임 설정 및 정규화 이슈 분류 내역 추가 (Antigravity)
- 2026-02-02: 룰렛 체험 티켓 일일 제한 강제 및 Nudge 서비스 버그 수정 (Antigravity)

---

## 02-02 - [GAME] 룰렛 체험 티켓 일일 3회 제한 오작동 및 Nudge 지급 버그

**우선순위**: P0 (정책 미준수 및 재화 오류)
**관련 도메인**: GAME, INVENTORY, RETENTION

## 증상 정의 (필수)
| 항목 | 내용 |
|---|---|
| 대상 기능 | 룰렛 체험 티켓 (`TRIAL_TICKET`) 플레이 및 일일 넛지 지급 |
| HTTP Status | 200 (Logic Error) -> 400 (DAILY_LIMIT_REACHED)로 강제 |
| 영향 범위 | 전체 유저 (체험 티켓 보유자) |
| 재현 빈도 | 항상 |

### 증상
1. 룰렛 체험 티켓(`TRIAL_TICKET`)의 "하루 3번" 제한이 작동하지 않고 보유한 티켓만큼 무제한 플레이 가능.
2. 일일 넛지(`DailyNudgeService`)로 티켓이 1장만 지급되거나, 잘못된 메서드 호출로 지급 자체가 실패함.
3. 프론트엔드 UI에서 남은 횟수 표시가 없어서 사용자가 제한 여부를 알 수 없음.

### 근본 원인 (증거 기반)
- **백엔드**: `V2RouletteGameService.play`에서 플레이 횟수 검증(`DailyLimitReachedError`) 로직이 누락되어 `v2_roulette_config.max_daily_spins` 값이 무시됨.
- **서비스 오류**: `DailyNudgeService`에서 `V2InventoryService`의 레거시/미존재 메서드(`grant_ticket`)를 호출하고, 토큰 타입도 `GameTokenType.TRIAL_TICKET` 대신 일반 `ROULETTE` 명칭을 사용함.
- **프론트엔드**: `RoulettePage.tsx`에서 서버가 제공하는 `remaining_spins` 데이터를 실시간으로 반영하여 버튼을 제어하는 로직이 부재함.

### 해결 방법
#### Immediate Fix (Backend)
- `V2RouletteGameService.play` 및 `get_status` 수정: `Asia/Seoul` (KST) 09:00 리셋 정책(`_operational_date_kst`)을 적용하여 일일 3회 제한 강제.
- `DailyNudgeService.send_daily_nudge` 수정: `grant_wallet_tokens` 사용, `TRIAL_TICKET` 명입, 기본 수량 **3장**으로 상향.

#### Immediate Fix (Frontend)
- `RoulettePage.tsx`: 상단 스탯 영역에 `오늘 남은 횟수: {remaining}/{max}` UI 추가.
- 일일 제한 도달 시 `SPIN NOW` 버튼을 `LIMIT REACHED`로 변경하고 `disabled` 처리.

### 검증 방법
1. **플레이 제한**: 3회 플레이 후 4회째에 `400 Bad Request (DAILY_LIMIT_REACHED)` 응답 및 팝업 확인.
2. **Nudge 지급**: `DailyNudgeService` 트리거 후 `TrialTokenBucket`에 3장이 정상 지급되는지 DB 확인.
3. **UI 피드백**: 제한 도달 시 버튼 비활성화 및 상단 스탯 갱신(3/3) 확인.

### 예방 가이드라인
- **SoT 준수**: 모든 게임 모드 추가 시 `max_daily_spins` 필드 검증을 필수 체크리스트에 포함.
- **KST 정책**: 시간 관련 로직은 반드시 프로젝트 공통 유틸리티(`_operational_date_kst`)를 사용하여 09:00 리셋을 유지할 것.

### 관련 문서 (SoT/learned)
- [v2_ticket_enum_sot_ko.md](../01_core/v2_ticket_enum_sot_ko.md)
- [W05_GAME_troubleshooting.md (본 문서)](#02-02---game-룰렛-체험-티켓-일일-3회-제한-오작동-및-nudge-지급-버그)
- [app/v2/services/v2_roulette_game_service.py](../../../app/v2/services/v2_roulette_game_service.py)
