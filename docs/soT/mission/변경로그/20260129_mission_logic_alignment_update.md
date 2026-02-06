# 2026-01-29 미션 로직 정합성 및 주간 미션 보정 업데이트

## 1. 배경
Telegram 인증 및 V2 API 연동 시 미션 진행 상태가 누락되지 않도록 로직을 단일화하고, 주간 미션 리셋 시 발생하는 정합성 오류(Item 364)를 해결함.

## 2. 주요 변경 사항

### [A] V2 미션 전용 `ensure_login_progress` 메서드 추가
- **기능**: 로그인(LOGIN) 액션 발생 시 해당 액션과 연결된 모든 미션(출석, 가입 등)의 진행도를 안전하게 업데이트함.
- **적용**: `telegram_routes.py` 및 `auth_routes.py`에서 공용으로 사용하여 중복 로직 제거 및 정합성 확보.
- **대상 파일**: `app/v2/services/mission_service.py`

### [B] 주간 미션(WEEKLY) 리셋 날짜 형식 보정
- **기능**: 주간 미션의 `reset_date` 생성 시 ISO 표준 주(Monday 기준)를 따르는 `%V` 형식을 명시적으로 사용하여 DB 및 어드민 페이지 간의 정합성 오류 방지.
- **포맷**: `YYYY-WXX` (예: 2026-W05).
- **대상 파일**: `app/v2/services/mission_service.py`

## 3. 검증 결과
- **정상 작동**: `V2MissionService.ensure_login_progress` 호출 시 DB의 `user_mission_progress` 테이블에 'LOGIN' 관련 레코드가 정상적으로 생성/업데이트됨을 확인.
- **형식 검증**: `WEEKLY` 카테고리 미션의 `reset_date`가 `2026-W05` 형식으로 안전하게 저장됨을 확인.

## 4. 향후 계획
- 주간 미션 리셋 시점에 맞춰 어드민 대시보드에서 주차별 통계가 정상적으로 노출되는지 최종 모니터링 예정.
