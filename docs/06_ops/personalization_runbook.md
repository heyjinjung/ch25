# 개인화(세그멘테이션) 운영 Runbook

이 문서는 **개인화 데이터 수집(user_activity) + 세그멘트(user_segment) 운영**을 위한 최소 runbook 입니다.

## 1) 일일 배치 실행(세그멘트 산출)
- 스크립트: `scripts/segment_users.py`
- Dry-run(변경 없이 출력만): `python scripts/segment_users.py --dry-run`
- 실제 반영: `python scripts/segment_users.py`

권장 운영 방식(예시)
- 하루 1회(오프피크) 실행
- 실패 시 재실행해도 동일 규칙으로 덮어쓰는 형태(멱등에 가까움)

## 2) 수동 오버라이드(어드민)
자동 규칙과 별개로, 운영자가 특정 유저를 강제로 분류해야 할 때 사용합니다.

- 어드민 화면: `/admin/user-segments`
  - `external_id`로 검색
  - `segment` 값 수정 후 저장

백엔드 API
- 조회: `GET /admin/api/segments?external_id=...`
- 저장(upsert): `PUT /admin/api/segments` (body: `{ user_id? | external_id?, segment }`)

## 3) activity 수집 확인(프론트 연동)
다음 게임 플레이 성공 시 프론트에서 `/api/activity/record` 호출이 발생합니다.
- Roulette: `ROULETTE_PLAY`
- Dice: `DICE_PLAY`
- Lottery: `LOTTERY_PLAY`

주의
- activity 호출은 **fire-and-forget**로 처리되어 게임 UX를 막지 않습니다.
- 서버에서 401/403이 발생하면 userApi 인터셉터가 로그인으로 리다이렉트할 수 있습니다.

## 4) last_charge_at 정책(중요)
이 코드베이스에서 "충전/입금"은 결제 테이블이 아니라 다음 규칙으로 갱신됩니다.

- `external_ranking_data.deposit_amount`가 **증가**한 경우에만
- 해당 row의 `updated_at`을 `user_activity.last_charge_at`으로 반영

## 5) 트러블슈팅
- "세그먼트가 계속 NEW로만 보임":
  - 배치(`scripts/segment_users.py`)가 실행되지 않았거나, 기준 데이터(user_activity / external_ranking_data)가 비어있을 수 있습니다.
- "어드민 저장이 400":
  - segment는 기본적으로 `^[A-Z0-9_]+$` 패턴(예: `DORMANT_SHORT`)만 허용합니다.
- "DB 마이그레이션 검증":
  - 현재 로컬 Docker 엔진이 불가하면 MySQL 실적용(upgrade/downgrade)은 보류합니다.
