# RankingService 모듈 기술서

- 문서 타입: 모듈
- 버전: v1.2
- 작성일: 2025-12-25
- 작성자: 시스템 설계팀
- 대상 독자: 백엔드 개발자

## 1. 목적 (Purpose)
- RANKING Day에 외부 집계된 랭킹 데이터(ExternalRankingData)를 조회하고 내 위치/점수를 반환하는 로직을 정의한다.

## 2. 범위 (Scope)
- 코드 경로: `backend/app/services/ranking_service.py`와 랭킹 전용 라우터/스키마/DB 테이블 책임을 다룬다.
- 랭킹 데이터 소스는 `external_ranking_data`(app.models.external_ranking.ExternalRankingData) 테이블로, 외부 파이프라인/배치가 입력한다. 본 서비스는 조회만 담당한다.

## 3. 용어 정의 (Definitions)
- External Ranking: `external_ranking_data`에 저장된 외부 집계 값. deposit_amount/ play_count 기준으로 정렬한다.
- Display Name: `user.nickname` → `user.external_id` 순으로 노출 이름을 결정하며, 둘 다 없으면 "닉네임 없음"으로 채운다.
- Rank Ordering: deposit_amount DESC, play_count DESC, user_id ASC 순으로 1-based rank를 계산한다.

## 4. 책임 (Responsibilities)
- 오늘 feature_type=RANKING인지, feature_config.is_enabled=1인지 검증 후 비활성 시 조회 차단(`NO_FEATURE_TODAY`). feature_schedule이 0건/2건이면 `INVALID_FEATURE_SCHEDULE` 처리.
- ExternalRankingData 전 레코드를 정렬 규칙에 따라 순회해 external_entries(ranks) 배열을 구성한다.
- 현재 사용자(user_id)에 해당하는 entry를 찾아 my_external_entry로 반환한다. 기본 entries 필드는 비워두며, external_entries만 클라이언트에 제공한다.
- Admin 업로드는 본 서비스 범위 밖이며, 데이터 파이프라인이 external_ranking_data를 채운다고 가정한다.

## 5. 주요 메서드 시그니처

### 5-1. get_today_ranking
```python
def get_today_ranking(self, db, now, user_id: int, top_n: int = 10) -> dict:
    """오늘 기준 Top N + 내 랭킹 정보를 반환한다."""
```
- 단계:
  1) feature_type=RANKING + feature_config.is_enabled 확인.
  2) ExternalRankingData 전 레코드 조회 후 deposit_amount DESC, play_count DESC, user_id ASC로 정렬.
  3) 정렬 순서대로 rank를 부여하고, user.nickname → user.external_id → "닉네임 없음" 순으로 표시 이름 결정.
  4) 현재 user_id 매칭 row를 my_external_entry로 반환. entries/top_n 필드는 현재 미사용이며 external_entries에 전체 목록을 담는다.

## 6. 데이터 연동
- 테이블: `external_ranking_data`, `user`(nickname/external_id 조인).
- 정렬 기준: deposit_amount DESC, play_count DESC, user_id ASC.
- SeasonPassService 연동 없음.

## 7. API 연동
- GET `/api/ranking/today`: external_entries, my_external_entry를 그대로 반환.
- 다른 게임과 달리 play/status가 없으며 조회만 제공한다.
- Admin 업로드/파이프라인은 본 문서 범위 밖.

## 8. 예시 응답 (today)
```json
{
  "date": "2025-12-25",
  "entries": [],
  "my_entry": null,
  "external_entries": [
    { "rank": 1, "user_id": 101, "user_name": "김OO", "deposit_amount": 550000, "play_count": 12, "memo": null }
  ],
  "my_external_entry": { "rank": 12, "user_id": 777, "user_name": "닉네임 없음", "deposit_amount": 180000, "play_count": 3, "memo": null },
  "feature_type": "RANKING"
}
```

## 9. 에러 코드
- `NO_FEATURE_TODAY`: 오늘 feature_type이 RANKING이 아니거나 비활성화된 경우.
- `INVALID_FEATURE_SCHEDULE`: 날짜별 스케줄이 0개/2개 이상일 때.
- `INVALID_RANKING_CONFIG`: ExternalRankingData가 비어있거나 필수 컬럼 누락 시 보호 코드로 사용할 수 있음(현재 기본 구현은 단순 조회).

## 변경 이력
- v1.2 (2025-12-25, 시스템 설계팀)
  - ExternalRankingData 정렬/닉네임 조인 기반 현재 구현으로 책임/예시/에러를 갱신
- v1.1 (2025-12-09, 시스템 설계팀)
  - feature_config.is_enabled/feature_schedule 검증을 명시하고 버전/작성일을 정정
  - ranking_daily를 관리자 입력 모델로 명확히 정의하고 display_name 필드를 예시/로직에 반영
- v1.0 (2025-12-08, 시스템 설계팀)
  - 최초 작성: 랭킹 조회 책임, ranking_daily 참조, get_today_ranking 시그니처 정의
