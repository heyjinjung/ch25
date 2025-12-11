# Admin Lottery Configuration Guide

## 어디서?
- 로그인: `/admin/login` → 기본 `admin` 계정.
- 메뉴: `/admin` → “복권 설정”.
- API: `GET/POST/PUT /admin/api/lottery-config[/<id>]`.

## 필드 설명
- `name`, `is_active`, `max_daily_plays`(없음/무제한이면 0 또는 1로 설정).
- `prizes[]` (1개 이상 필수, weight 합 > 0):
  - `label`: 상품명.
  - `weight`: 가중치. 숫자가 클수록 더 자주 당첨됨(0 이상, 전체 합 > 0).
  - `stock`: 남은 재고. `NULL`=무제한, 0이면 더 이상 당첨되지 않음.
  - `reward_type`: 지급 종류(예: `POINT`, `NONE`). 사내 정의된 코드만 사용.
  - `reward_amount`: 지급 수량(예: 100 포인트).
  - `is_active`: 비활성 prize는 추첨 풀에서 제외.

## 설정 절차
1) 로그인 후 “복권 설정” 목록 확인(200 응답).
2) 새 설정 생성
   - 이름, max_daily_plays 입력.
   - prize 리스트 입력: 최소 1개, weight 합계 > 0, stock/보상 값 확인.
   - 저장 → 201 확인.
3) 수정
   - prize 활성/비활성, weight/stock/보상 수정 후 저장 → 200 확인.

## 자주 나는 오류 & 해결
- INVALID_LOTTERY_CONFIG / 500: 활성 prize 없음, weight 합 0, 음수 weight/stock.
- 404: 잘못된 id 또는 서버/DB 상태 확인.

## 저장 후 체크
- `GET /api/lottery/status` 200, `prize_preview` 포함, `token_balance` 필드 존재.
- 로그: `SELECT * FROM lottery_log ORDER BY created_at DESC LIMIT 3;`
- 지갑: `SELECT * FROM user_game_wallet WHERE token_type='LOTTERY_TICKET';`
