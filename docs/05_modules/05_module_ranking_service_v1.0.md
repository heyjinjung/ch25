# RankingService 모듈 기술서

- 문서 타입: 모듈
- 버전: v1.0
- 작성일: 2025-12-08
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드 개발자

## 1. 목적 (Purpose)
- RANKING Day에 오늘 기준 Top N 랭킹 리스트와 내 위치/점수를 조회하는 로직을 정의한다.

## 2. 범위 (Scope)
- 코드 경로: `backend/app/services/ranking_service.py`와 랭킹 전용 라우터/스키마/DB 테이블 책임을 다룬다.
- 랭킹 데이터는 관리자가 수기로 `ranking_daily`를 채우거나 업로드하며, 본 서비스는 조회만 담당한다.

## 3. 용어 정의 (Definitions)
- Ranking Score: `ranking_daily.score`에 저장되는 당일 점수(예: 이용액, 충전액, 미션 점수 등).
- Precomputed Rank: 관리자가 직접 입력해 저장한 rank 값.
- Display Name: `ranking_daily.display_name`에 저장되는 노출용 이름/가명(유저 실명/ID 노출 최소화).
- Top N: 클라이언트가 조회할 상위 N명 목록, 기본 10명.

## 4. 책임 (Responsibilities)
- 오늘 feature_type=RANKING인지 검증 후 비활성 시 조회 차단.
- ranking_daily에서 오늘 날짜 기준 상위 N 레코드 조회, display_name 또는 nickname 포함해 응답 구성.
- 현재 사용자(user_id)에 해당하는 레코드 조회하여 내 rank/score/is_in_top 여부 반환(없으면 rank=None, is_in_top=False).
- user_event_log에 조회 이벤트 기록, SeasonPassService 연동은 기본 없음(정책 시 추가 가능).

## 5. 주요 메서드 시그니처

### 5-1. get_today_ranking
```python
def get_today_ranking(self, db, now, user_id: int, top_n: int = 10) -> dict:
    """오늘 기준 Top N + 내 랭킹 정보를 반환한다."""
```
- 단계:
  1) feature_type=RANKING + feature_config.is_enabled 확인.
  2) ranking_daily에서 date=today, rank <= top_n 조회 후 정렬.
  3) user_id 매칭 row 조회(없으면 rank=None, score=0, is_in_top=False 처리, display_name은 None 또는 빈 문자열).
  4) 응답 dict: {date, top: [...], me: {...}}.

## 6. 데이터 연동
- 테이블: `ranking_daily`, 공통 `user_event_log`.
- ranking_daily는 관리자가 수기로 점수/순위를 입력하거나 업로드한다.
- 필요한 경우 user 테이블에서 nickname을 조인하거나 display_name만 채운 상태로 운용한다.

## 7. API 연동
- GET `/api/ranking/today`: get_today_ranking 결과를 그대로 반환.
- 다른 게임과 달리 play/status가 없으며 조회만 제공한다.

## 8. 예시 응답 (today)
```json
{
  "date": "2025-12-26",
  "top": [
    { "rank": 1, "display_name": "김OO", "score": 550000 },
    { "rank": 2, "display_name": "박OO", "score": 420000 }
  ],
  "me": {
    "rank": 12,
    "score": 180000,
    "is_in_top": false
  }
}
```

## 9. 에러 코드
- `NO_FEATURE_TODAY`: 오늘 feature_type이 RANKING이 아니거나 비활성화된 경우.
- `INVALID_FEATURE_SCHEDULE`: 날짜별 스케줄이 0개/2개 이상일 때.
- `INVALID_RANKING_CONFIG`: ranking_daily 데이터가 비어있거나 필수 컬럼 누락 시 사용할 수 있는 보호 코드(필요 시 사용).

## 변경 이력
- v1.1 (2025-12-09, 시스템 설계팀)
  - ranking_daily를 관리자 입력 모델로 명확히 정의하고 display_name 필드를 예시/로직에 반영
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 랭킹 조회 책임, ranking_daily 참조, get_today_ranking 시그니처 정의
