# Admin Dice Configuration Guide
문서 타입: 가이드
버전: v1.1
작성일: 2025-12-25
작성자: 시스템 설계팀
대상 독자: 관리자, 백엔드/프론트엔드 개발자

## 1. 목적 (Purpose)
- 관리자 주사위 설정 화면과 연동되는 필드/검증/체크 절차를 일관되게 안내한다.

## 2. 범위 (Scope)
- `/admin/api/dice-config` CRUD와 FE 설정 화면, 사용자용 `/api/dice/status` 응답에 필요한 설정 값만 다룬다.

## 3. 용어 정의 (Definitions)
- reward_type: 지급 종류 코드(`POINT`, `NONE` 등 사내 정의 상수).
- reward_amount: 지급 수량 정수(예: 100). 승/무/패 각각 별도 입력.

## 4. 위치/접근
- 로그인: `/admin/login` (기본 계정 `admin`).
- 메뉴: `/admin` → “주사위 설정”.
- API: `GET/POST/PUT /admin/api/dice-config[/<id>]`.

## 5. 필드 설명
- `name`: 설정 이름.
- `is_active`: 활성 여부(최소 1개 활성 필요).
- `max_daily_plays`: 일일 제한(0이면 무제한).
- 보상 필드(모두 필수):
  - `win_reward_type`, `win_reward_amount`
  - `draw_reward_type`, `draw_reward_amount`
  - `lose_reward_type`, `lose_reward_amount`

## 6. 설정 절차
1) 목록 확인: “주사위 설정”에서 현재 설정 200 응답 확인.
2) 생성: 이름, `max_daily_plays`(0=무제한), 승/무/패 보상 타입·값 입력 후 저장 → 201 확인.
3) 수정: 값 변경 후 저장 → 200 확인.
4) 활성: 최소 1개 `is_active=true` 여야 `/api/dice/status` 200 OK.

## 7. 자주 나는 오류 & 해결
- `VALIDATION_ERROR`/500: 보상 필드 누락 또는 alias 불일치(프론트는 `_amount` 사용) → 모든 보상 필드 채움.
- `INVALID_CONFIG`: 활성 config 없음 → 최소 1개 활성화.
- 404: 잘못된 id 또는 서버/DB 상태 점검.

## 8. 저장 후 체크 (QA)
- `GET /api/dice/status` 200, `token_balance` 필드 존재.
- 로그 확인: `SELECT * FROM dice_log ORDER BY created_at DESC LIMIT 3;`
- 지갑 확인: `SELECT * FROM user_game_wallet WHERE token_type='DICE_TOKEN';`

## 9. 변경 이력
- v1.1 (2025-12-25, 시스템 설계팀): 문서 규칙 적용, 메타/QA 섹션 추가.
- v1.0 (2025-12-08, 시스템 설계팀): 최초 작성.
