# Admin Roulette Configuration Guide

## 어디서?
- 로그인: `/admin/login` → 기본 `admin/1234`.
- 메뉴: `/admin` → “룰렛 설정” 카드 클릭.
- API 참고: `GET/POST/PUT /admin/api/roulette-config[/<id>]`, 활성/비활성 `/activate` `/deactivate`.

## 필드 설명 (한눈에)
- `name`: 설정 이름(예: “크리스마스 룰렛”).
- `is_active`: 활성 여부(현재 사용 설정 1개만 유지 권장).
- `max_daily_spins`: 하루에 돌릴 수 있는 횟수. 무제한이면 0으로 둡니다.
- `segments` (반드시 6개):
  - `slot_index`: 0~5, 슬롯 번호(중복 금지).
  - `label`: 화면에 보이는 글자.
  - `weight`: “잘 뽑히는 정도”. 숫자가 클수록 뽑힐 확률이 올라갑니다. 0 이상, 6개 합이 0보다 커야 함.
  - `reward_type`: 무엇을 줄지 종류(예: `POINT` = 포인트, `NONE` = 꽝). 사내에서 정의된 코드만 사용.
  - `reward_amount`: 얼마나 줄지 숫자(예: 100 포인트).
  - `is_jackpot`: 잭팟 여부(true/false).

## 설정 절차 (UI 기준)
1) 로그인 후 “룰렛 설정” 진입, 목록이 뜨면 백엔드 OK.
2) 새 설정 생성
   - 이름, max_daily_spins 입력(무제한=0).
   - 슬롯 6개 모두 입력: slot_index 0~5, weight·reward 채우기.
   - 저장 → 응답 201 확인.
3) 수정
   - 행 선택 → 슬롯/필드 수정 후 저장 → 응답 200 확인.
4) 활성화/비활성화
   - 행의 “활성화/비활성화” 버튼 → 응답 200 확인.

## 자주 나는 오류 & 해결
- 500 / VALIDATION_ERROR: 슬롯 6개 미만, slot_index 중복/범위 오류, weight 합계 0 이하.
- INVALID_ROULETTE_CONFIG: 음수 weight, reward_type 잘못, 필수 슬롯 누락.
- 404: 잘못된 config_id 또는 서버/DB 상태 확인.

## 저장 후 꼭 확인
- API: `GET /api/roulette/status` 200, segments 6개, token_balance 필드 존재.
- 로그: `SELECT * FROM roulette_log ORDER BY created_at DESC LIMIT 3;`
- 지갑: `SELECT * FROM user_game_wallet WHERE token_type='ROULETTE_COIN';`
