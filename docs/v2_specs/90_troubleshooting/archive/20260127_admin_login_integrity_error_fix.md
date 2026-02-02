# 20260127 어드민 로그인 실패 및 IntegrityError 기술 분석 보고서

## 1. 개요
어드민 계정(`admin / 2026`)으로 로그인 시도 시 `400 LOGIN_FAILED` 응답과 함께 로그인이 불가능했던 현상을 분석하고 수정한 내역을 기록합니다.

## 2. 증상 및 현상
- **API 응답**: `POST /api/auth/token` -> `400 Bad Request`, `detail: "LOGIN_FAILED"`
- **서버 로그**: 
  ```text
  (pymysql.err.IntegrityError) (1062, "Duplicate entry '2-2-STATIC' for key 'user_mission_progress.uq_user_mission_reset'")
  SAWarning: Session's state has been changed on a non-active transaction - this state will be discarded.
  ```
- **특이사항**: `test_mode` 스크립트에서는 성공하나 실서버 API 호출 시에만 간헐적 또는 지속적으로 실패함.

## 3. 근본 원인 분석 (Root Cause Analysis)

### 3.1. 데이터베이스 환경 불일치
- **원인**: Docker 컨테이너의 `.env` 설정에서 `MYSQL_DATABASE`가 `xmas_event`로 되어 있었으나, 호스트 측 일부 스크립트나 설정이 `v2`를 바라보고 있어 비밀번호 초기화 및 권한 부여가 엉뚱한 DB에 적용됨.
- **해결**: 모든 환경변수와 DB 연결을 `xmas_event` (실제 개발/라이브 데이터)로 통일하고 컨테이너를 재생성하여 환경을 동기화함.

### 3.2. MissionService 로직 결함 (IntegrityError)
- **원인**: `MissionService.ensure_login_progress` 함수 내의 중복 루프 구조.
  - LOGIN 액션 타입 미션을 조회한 후 루프를 돌림.
  - 루프 내부에서 `NEW_USER` 카테고리인 경우 직접 `UserMissionProgress`를 생성하려고 시도함.
  - 그런데 루프 내의 다른 분기에서 `update_progress("LOGIN")`을 또 호출함.
  - `update_progress` 내부에서 이미 해당 미션의 레코드를 생성(`db.add`)했는데, 외부 루프의 `NEW_USER` 로직에서 동일한 `(user_id, mission_id, reset_date)` 조합으로 또 생성을 시도하여 고유 키(Unique Key) 위반 발생.
- **결과**: 예외 발생으로 인해 트랜잭션이 롤백되고, `auth.py`의 상위 catch 블록에서 `LOGIN_FAILED`로 뭉뚱그려 응답함.

## 4. 해결 방법

### 4.1. 서비스 로직 리팩토링 (`MissionService.py`)
- `ensure_login_progress` 함수를 구조적으로 개선:
  1. `self.update_progress(user_id, "LOGIN", delta=1)`를 1회만 호출하여 모든 LOGIN 타입 미션의 진행도를 안전하게 갱신/생성함.
  2. 이후 `NEW_USER` 전용 점프 로직(가입 2일차 시 target_value로 바로 이동)만 별도로 수행함.
  3. 이를 통해 동일 트랜잭션 내 동일 레코드 중복 생성을 원천 차단함.

### 4.2. 환경 정규화
- `.env` 및 `docker-compose.yml` 리로드를 통해 `xmas_event` 데이터베이스로 고정.
- 어드민 비밀번호를 `2026`으로 재설정하고 `ROLE_ADMIN` 태그 부여 확인.

## 5. 검증 결과
- `scripts/diagnose_xmas_event.py` (자체 제작 진단 스크립트) 통과.
- `POST /api/auth/token` 실서버 API 호출 결과 **200 OK** 및 JWT 토큰 빌드 성공 확인.

## 6. 교훈 및 권장 사항
- **에러 핸들링**: `auth.py` 등 핵심 로직에서 `catch Exception` 시 원본 에러를 로깅하지 않으면 원인 파악이 매우 힘듦. 개발 단계에서는 Traceback을 출력하도록 유지 권장.
- **멱등성(Idempotency)**: DB 삽입 로직 전에는 반드시 존재 여부를 체크하거나 `INSERT ... ON DUPLICATE KEY UPDATE` 성격의 로직을 사용해야 함.
