# 변경 로그: /api/events/valentine-seol/status 운영일 필터 적용

**날짜**: 2026-02-14  \
**작성자**: GitHub Copilot  \
**관련 도메인**: API / Events (valentine-seol)

## 변경 내용
- Endpoint: `GET /api/events/valentine-seol/status`
- 반환되는 `missions`는 **운영일(Asia/Seoul, 09:00 리셋)** 기준으로 “현재 운영일에 해당하는 이벤트 미션만” 포함한다.
- `Mission.start_date/end_date` 필터는 운영일 구간과의 **overlap(겹침) 조건**으로 적용하여 경계값(예: `end_date=23:59:59`) 이슈를 회피한다.

## 관련 코드
- `app/v2/api/event_routes.py`

## 테스트/검증 근거
- API 레벨 검증: `tests/v2/test_event_status_operational_day.py`
