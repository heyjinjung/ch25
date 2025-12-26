# Admin Roulette Configuration Guide
문서 타입: 가이드
버전: v1.1
작성일: 2025-12-25
작성자: 시스템 설계팀
대상 독자: 관리자, 백엔드/프론트엔드 개발자

## 1. 목적 (Purpose)
- 룰렛 설정(UI/API) 필수 조건과 QA 체크 절차를 정리한다.

## 2. 범위 (Scope)
- `/admin/api/roulette-config` CRUD, `/activate` `/deactivate`, 관리자 UI “Roulette” 화면, 사용자용 `/api/roulette/status` 응답을 포함한다.

## 3. 용어 정의 (Definitions)
- segment: 룰렛 슬롯 하나(총 6개 필요). `slot_index`는 0~5 고정, 중복 불가.
- weight: 추첨 가중치. 전체 합은 0보다 커야 함.

## 4. 위치/접근
- 로그인: `/admin/login` (기본 `admin/1234`).
- 메뉴: `/admin` → Roulette.
- API: `GET/POST/PUT /admin/api/roulette-config[/<id>]`, 활성/비활성 `/activate`, `/deactivate`.

## 5. 필드 설명
- `name`: 설정 이름(예: 크리스마스 룰렛).
- `is_active`: 활성/비활성(최소 1개 활성 권장).
- `max_daily_spins`: 일일 최대 스핀(0=무제한).
- `segments` (총 6개 입력 필수):
  - `slot_index`: 0~5 고정 인덱스, 중복 불가.
  - `label`: 화면 표시 텍스트.
  - `weight`: 추첨 가중치(전체 합 > 0, 각 값 0 이상).
  - `reward_type` / `reward_amount`: 보상 종류/수량(예: POINT/100, TOKEN/1, NONE/0 등).
  - `is_jackpot`: 잭팟 여부(true/false).

## 6. 설정 절차 (UI)
1) 리스트 확인: `/admin/roulette`에서 기존 설정 로드.
2) 생성: 이름·회전 제한 입력 후 segment 6개 모두 채우고 저장 → 201.
3) 수정: segment 내용 변경 후 저장 → 200.
4) 활성/비활성: toggle 버튼으로 상태 변경 → 200.

## 7. 자주 나는 오류 & 해결
- 400 `INVALID_ROULETTE_CONFIG`: segment 6개 미입력, `slot_index` 중복, weight 합 0 → 6개 모두 입력·중복 제거·양수 합 보장.
- 404: 잘못된 `config_id` → ID 확인 또는 서버/DB 상태 점검.

## 8. 저장 후 체크 (QA)
- API: `GET /api/roulette/status` 200, segment 6개와 `token_balance` 확인.
- 로그: `SELECT * FROM roulette_log ORDER BY created_at DESC LIMIT 3;`
- 지갑: `SELECT * FROM user_game_wallet WHERE token_type='ROULETTE_COIN';`

## 9. 변경 이력
- v1.1 (2025-12-25, 시스템 설계팀): 문서 규칙 적용, 인코딩 복구 및 QA 섹션 보강.
- v1.0 (2025-12-08, 시스템 설계팀): 최초 작성.
