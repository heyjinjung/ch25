# Admin Lottery Configuration Guide
문서 타입: 가이드
버전: v1.1
작성일: 2025-12-25
작성자: 시스템 설계팀
대상 독자: 관리자, 백엔드/프론트엔드 개발자

## 1. 목적 (Purpose)
- 복권 설정 화면 및 API 연동 시 필수 필드, 검증, QA 절차를 정리한다.

## 2. 범위 (Scope)
- `/admin/api/lottery-config` CRUD, 관리자 UI “복권 설정”, 사용자용 `/api/lottery/status` 응답에 필요한 설정 값만 다룬다.

## 3. 용어 정의 (Definitions)
- prize: 추첨 풀에 들어가는 당첨 항목.
- weight: 추첨 가중치. 0 이상, 전체 합이 0보다 커야 함.
- stock: 잔여 수량. `NULL`=무제한, 0이면 당첨 불가.

## 4. 위치/접근
- 로그인: `/admin/login` (기본 `admin` 계정).
- 메뉴: `/admin` → “복권 설정”.
- API: `GET/POST/PUT /admin/api/lottery-config[/<id>]`.

## 5. 필드 설명
- `name`, `is_active`, `max_daily_plays`(0 또는 1=무제한/제한 없음).
- `prizes[]` (1개 이상, weight 합 > 0):
   - `label`: 상품명.
   - `weight`: 가중치(0 이상, 합 > 0).
   - `stock`: 재고(`NULL`=무제한, 0이면 당첨 불가).
   - `reward_type`: 지급 종류(`POINT`, `NONE` 등 사내 코드).
   - `reward_amount`: 지급 수량(예: 100).
   - `is_active`: 비활성 prize는 추첨 풀 제외.

## 6. 설정 절차
1) 목록 확인: “복권 설정”에서 현재 설정 200 응답 확인.
2) 생성: 이름, `max_daily_plays` 입력 후 prize 리스트 최소 1개 작성(가중치 합>0, stock/보상 값 유효) → 저장 201.
3) 수정: prize 활성/비활성, weight/stock/보상 수정 후 저장 200.

## 7. 자주 나는 오류 & 해결
- `INVALID_LOTTERY_CONFIG`/500: 활성 prize 없음, weight 합 0, 음수 weight/stock → 최소 1개 활성, 양수 합 보장.
- 404: 잘못된 id 또는 서버/DB 상태 점검.

## 8. 저장 후 체크 (QA)
- `GET /api/lottery/status` 200, `prize_preview` 포함, `token_balance` 필드 존재.
- 로그 확인: `SELECT * FROM lottery_log ORDER BY created_at DESC LIMIT 3;`
- 지갑 확인: `SELECT * FROM user_game_wallet WHERE token_type='LOTTERY_TICKET';`

## 9. 변경 이력
- v1.1 (2025-12-25, 시스템 설계팀): 문서 규칙 적용, QA/범위/정의 섹션 추가.
- v1.0 (2025-12-08, 시스템 설계팀): 최초 작성.
