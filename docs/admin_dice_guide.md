# Admin Dice Configuration Guide

## 어디서?
- 로그인: `/admin/login` → 기본 `admin` 계정.
- 메뉴: `/admin` → “주사위 설정”.
- API: `GET/POST/PUT /admin/api/dice-config[/<id>]`.

## 필드 설명
- `name`: 설정 이름.
- `is_active`: 활성 여부(최소 1개 활성 필요).
- `max_daily_plays`: 일일 제한(없음=0).
- 보상 필드(모두 필수):
  - `win_reward_type`, `win_reward_amount`
  - `draw_reward_type`, `draw_reward_amount`
  - `lose_reward_type`, `lose_reward_amount`

용어 설명
- reward_type: 무엇을 줄지 종류(예: `POINT`, `NONE`). 정해진 코드만 사용.
- reward_amount: 얼마나 줄지 숫자(예: 100 포인트). 승/무/패 각각 필요.

## 설정 절차
1) 로그인 후 “주사위 설정” 목록 확인(200 응답).
2) 새 설정 생성
   - 이름, max_daily_plays(0=무제한), 승/무/패 보상 타입·값 입력.
   - 저장 → 201 확인.
3) 수정
   - 값 변경 후 저장 → 200 확인.
4) 활성 상태 확인
   - 활성 config가 최소 1개 있어야 `/api/dice/status`가 200 OK.

## 자주 나는 오류 & 해결
- VALIDATION_ERROR/500: 보상 필드 누락 또는 alias 불일치(프론트는 `_amount` 사용).
- INVALID_CONFIG: 활성 config 없음.
- 404: 잘못된 id 또는 서버/DB 상태 점검.

## 저장 후 체크
- `GET /api/dice/status` 200, `token_balance` 필드 존재.
- 로그: `SELECT * FROM dice_log ORDER BY created_at DESC LIMIT 3;`
- 지갑: `SELECT * FROM user_game_wallet WHERE token_type='DICE_TOKEN';`
