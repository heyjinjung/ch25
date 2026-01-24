# Admin User Identity Backfill Plan (E2)
문서 타입: 운영 계획
작성일: 2026-01-03
대상: 운영자, 백엔드 담당

## 1. 목적
`external_id=tg_{id}_...` 형태를 가진 사용자 중 `user.telegram_id`가 비어 있는 케이스를 안전하게 채워, 이후 식별자 기반 운영(Resolver)이 안정적으로 동작하도록 한다.

## 2. 적용 대상(필터)
- 대상: `user.telegram_id IS NULL`
- 조건: `user.external_id`가 `tg_{digits}_...` 패턴 매칭
- 제외: 같은 `telegram_id`를 이미 다른 유저가 보유한 경우(충돌) → 스크립트가 자동 스킵

## 3. 실행 전 체크(Pre-check)
- 서비스 트래픽이 낮은 시간대 선택
- DB 백업/스냅샷 확보(권장)
- dry-run 결과에서 업데이트 예상 건수 확인

## 4. 실행 절차
스크립트: `scripts/backfill_set_telegram_id_from_external_id.py`

### 4.1 Dry-run(기본)
- 명령:
  - `python scripts/backfill_set_telegram_id_from_external_id.py --dry-run`
- 확인:
  - Found N users… 출력 확인
  - 샘플 출력이 기대한 tg_id인지 확인

### 4.2 Apply(실제 반영)
- 권장: 변경 로그를 CSV로 남겨 롤백 가능하게 운영
- 명령 예시:
  - `python scripts/backfill_set_telegram_id_from_external_id.py --apply --log-file logs/backfill_telegram_id_20260103.csv`
- 배치 크기 조절(선택):
  - `--batch-size 500` (기본)

## 5. 성공 기준(Post-check)
- 실행 로그에서 `updated`, `skipped_collision` 확인
- 운영/어드민에서 resolver 동작 확인(대표 케이스 1~2건)
  - `GET /admin/api/users/resolve?identifier=tg_...`
  - `GET /admin/api/users/resolve?identifier=<tg_id>`

## 6. 리스크 및 완화
- **충돌(telegram_id 중복)**: 스크립트가 자동 스킵하며 `skipped_collision`로 집계됨.
- **성능(N+1)**: 스크립트가 `admin_profile`을 joinedload로 프리로드.
- **부분 커밋**: 배치 커밋으로 진행. 중간 실패 시 이미 커밋된 배치는 유지됨.

## 7. 롤백 계획
가장 안전한 롤백은 **Apply 시 생성한 CSV 로그를 기반으로 원복**하는 것이다.

### 7.1 롤백 입력(필수)
- Apply 시 사용한 `--log-file` CSV
  - 컬럼: `user_id`, `old_user_telegram_id`, `new_user_telegram_id`, `old_profile_telegram_id`, ...

### 7.2 롤백 방법(권장)
- DB에서 해당 `user_id`들만 대상으로, `user.telegram_id`를 `old_user_telegram_id`로 되돌린다.
- `admin_profile.telegram_id`도 필요 시 `old_profile_telegram_id`로 되돌린다.

> 주의: CSV 없이 조건식만으로 일괄 롤백하면, 기존에 정상적으로 설정된 telegram_id까지 영향받을 수 있으므로 권장하지 않는다.

## 8. 커뮤니케이션
- 실행 전/후 업데이트 건수 및 충돌 건수 공유
- 문제 발생 시: 실행 로그 + CSV 첨부
