# Admin Roulette Configuration Guide

## 접근
- 로그인: `/admin/login` (기본 계정 admin/1234)
- 메뉴: `/admin` → Roulette
- API: `GET/POST/PUT /admin/api/roulette-config[/<id>]`, 활성/비활성 `/activate` `/deactivate`

## 필드 요약
- `name`: 설정 이름 (예: 크리스마스 룰렛)
- `is_active`: 활성/비활성 (한 번에 하나만 권장)
- `max_daily_spins`: 하루 최대 스핀 수 (0이면 무제한)
- `segments` (반드시 6개 모두 입력)
  - `slot_index`: 0~5 슬롯 번호, 시계방향 순서. 6개 모두 중복 없이 채워야 함.
  - `label`: 화면에 보이는 텍스트
  - `weight`: 당첨 확률 가중치 (전체 합이 0보다 커야 함)
  - `reward_type` / `reward_amount`: 보상 종류/수치 (예: POINT/100, TOKEN/1, NONE/0 등)
  - `is_jackpot`: 잭팟 여부(true/false)

## 설정 절차 (UI)
1) 리스트 확인: `/admin/roulette` 접속 → 기존 설정 로드
2) 생성: 이름/횟수 입력 + 슬롯 6개 모두 채우고 저장 → 201
3) 수정: 설정 선택 후 필드 수정 → 200
4) 활성/비활성: 토글 버튼 → 200

## 오류/검증
- 400 INVALID_ROULETTE_CONFIG: 슬롯 6개 미완성, slot_index 중복, weight 합 0 이하 등
- 404: 잘못된 config_id

## 점검
- API: `GET /api/roulette/status` 200, segments 6개/token_balance 확인
- 로그: `SELECT * FROM roulette_log ORDER BY created_at DESC LIMIT 3;`
- 잔액: `SELECT * FROM user_game_wallet WHERE token_type='ROULETTE_COIN';`
