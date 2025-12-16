# 개인화 기능 작업 체크리스트

원칙
- 문서 내용이 코드와 다르면 **코드를 우선**한다.
- 새 기능 추가 전, 기존 코드/모델/마이그레이션/라우트를 먼저 확인한다.
- DB 변경은 **SQLAlchemy 모델 + Alembic 마이그레이션**으로 진행한다.

---

## 0) 사전 확인(코드 우선)
- [x] 기존에 activity/segment/campaign/coupon/reward-pool/posts 관련 모델/테이블/마이그레이션이 이미 있는지 검색
- [x] 기존에 /api/activity/*, /admin/api/segments/* 등 유사 엔드포인트가 이미 있는지 확인(충돌 방지)
- [x] 운영 정책(입금/충전 데이터 소스)은 `external_ranking_data` 기반임을 문서/코드로 재확인

---

## 1) 데이터 모델/DB 스키마

### 1.1 user_activity (신규)
- [x] SQLAlchemy 모델 추가 (예: `app/models/user_activity.py`)
- [x] Alembic 마이그레이션 생성: `user_activity` 테이블
- [x] FK는 `user.id` 기준(`user_id` int)
- [x] 인덱스 설계(예: `user_id`, `updated_at`)
- [x] (결정) `last_login_at` 컬럼 유지 (현재 `user.last_login_at` 존재; 필요 시만 미러링)
- [x] (정의) `last_charge_at` 산출 규칙 명시: `external_ranking_data.deposit_amount` 증분 발생 시 `external_ranking_data.updated_at`로 갱신

### 1.2 user_segment (신규)
- [x] SQLAlchemy 모델 추가 (예: `app/models/user_segment.py`)
- [x] Alembic 마이그레이션 생성: `user_segment` 테이블
- [x] PK/FK: `user_id`(int) 단일키
- [x] segment 값 enum/문자열 정책 결정(문자열 권장)

---

## 2) 사용자 이벤트 수집 API

### 2.1 /api/activity/record (신규)
- [x] 라우트 추가 (예: `app/api/routes/activity.py` 또는 기존 라우트 파일에 추가)
- [x] 요청 스키마 정의 (event_type, metadata 등)
- [x] 인증/식별 방식 결정 (로그인 유저 기반: `get_current_user_id`)
- [x] 이벤트별 업데이트 규칙
  - [x] roulette_play → roulette_plays +1
  - [x] dice_play → dice_plays +1
  - [x] lottery_play → lottery_plays +1
  - [x] bonus_used → last_bonus_used_at 갱신
  - [x] play_duration_seconds → total_play_duration 누적
- [x] idempotency/중복 방지 정책(필요 시)
  - [x] event_id(UUID) 기반 dedupe 적용(옵션)


---

## 3) 충전(last_charge_at) 연동
- [x] `external_ranking_data` 업데이트 시(관리자 upsert) 해당 유저의 `user_activity.last_charge_at` 갱신 로직 추가
- [x] 증가(증분) 있을 때만 갱신하도록 방어 로직 반영

---

## 4) 세그멘테이션 배치
- [x] 배치 스크립트 추가 (예: `scripts/segment_users.py`)
- [x] 분류 규칙 정의(초기 최소 버전)
  - [x] NEW
  - [x] DORMANT_SHORT
  - [x] DORMANT_LONG
  - [x] VIP
- [x] 실행 방법 문서화(Cron/수동 실행): `python scripts/segment_users.py --dry-run` / `python scripts/segment_users.py`

---

## 5) 어드민(옵션/후순위: 문서 요구와 실제 운영 필요에 따라)
- [x] 세그먼트 조회/수정 API (예: `/admin/api/segments/*`)
- [x] 규칙 관리 테이블/엔드포인트(`segment_rules`) 필요 여부 결정
  - 기준: (1) 비개발 운영자가 규칙을 자주 바꿔야 함 (2) 변경 이력/승인/적용일 관리 필요 (3) 규칙이 복잡(우선순위/조합)
  - 위 요구가 없으면 초기에는 scripts/segment_users.py 내 코드 규칙으로 유지(배포로 변경)

---

## 6) 프론트/어드민 UI(옵션/후순위)
- [x] 사용자 앱에서 `/api/activity/record` 호출(플레이/보너스 등)
- [x] 어드민에서 user_segment 조회/수정 화면 필요 여부 확인

---

## 7) 테스트/검증
- [ ] 마이그레이션 적용/롤백 확인
- [x] activity record API 단위 테스트 추가(가능 시)
- [x] 외부랭킹 upsert → last_charge_at 갱신 흐름 테스트 추가(가능 시)

---

## 8) 문서 반영
- [x] `scripts/개인화기능.md`에서 실제 구현과 어긋나는 부분 지속 교정
- [x] 운영 관점의 runbook(배치 실행/장애 대응) 추가

