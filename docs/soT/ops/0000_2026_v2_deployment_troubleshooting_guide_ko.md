# V2 배포 트러블슈팅 및 검증 리포트 (V2 Deployment Troubleshooting)

**문서 타입**: 장애 대응 및 검증 리포트 (Troubleshooting & Verification)
**작성일**: 2026-01-29
**최종 수정**: 2026-01-30
**프로젝트**: Golden V2

---

## 🛠️ 1. V2 주요 배포 장애 대응 (Known Issues)

Golden V2 배포 중 발생할 수 있는 주요 시나리오와 해결책입니다.

### ❌ 이슈 1: 텔레그램 인증 `unauthorized` (Hash 검증 실패)
- **현상**: 유저가 텔레그램으로 로그인 시도 시 `401 Unauthorized` 또는 `Invalid Hash` 에러 발생.
- **원인**: 
  1. `TELEGRAM_BOT_TOKEN`이 로컬 테스트용과 프로덕션용이 불일치.
  2. 프론트엔드에서 전달하는 `initData`의 인코딩/디코딩 문제.
- **해결책**:
  1. `.env`의 봇 토큰이 실제 채널에 연결된 토큰인지 대조.
  2. `app/v2/core/telegram.py` 로깅을 통해 받은 `auth_date`가 만료되었는지 확인.

### ❌ 이슈 2: 금고/티켓 지급 시 `CircuitBreakerError` 대량 발생
- **현상**: 운영자가 재화 지급 시 "Circuit Breaker limit exceeded" 메시지와 함께 차단됨.
- **원인**: 
  1. 시간당 한도(`CIRCUIT_LIMIT_VAULT`)가 비즈니스 규모에 비해 너무 낮게 설정됨.
  2. Redis 키(`golden:v2:circuit:*`)가 비정상적으로 누적됨.
- **해결책**:
  1. 비즈니스 요구사항에 따라 `.env` 한도값 상향 조정.
  2. `GET /admin/economy/circuit-breaker/status`를 통해 현재 소진율 확인 후 필요시 `RESET` API 호출.

### ❌ 이슈 3: CSV 임포트 시 `User Not Found` 오류
- **현상**: 외부 로그 업로드 시 많은 행이 'Skipped' 처리됨.
- **원인**: CSV의 `user_id`가 V2 시스템의 내부 고유 ID가 아닌 외부 플랫폼 ID일 경우.
- **해결책**: CSV 생성 시 반드시 V2의 `cc_id` 또는 `user_id`를 매핑하여 포함하도록 데이터 수집 공정 수정.

### ❌ 이슈 4: `failed to read dockerfile: open Dockerfile.backend: no such file or directory`
- **현상**: 배포/빌드 중 Dockerfile.backend를 찾지 못해 빌드 실패.
- **원인**:
  1. 작업 디렉터리가 리포지토리 루트가 아님.
  2. `docker compose` 실행 위치가 서버 홈(예: `/root`) 등으로 이동된 상태.
  3. **SCP 복사 대상에 Dockerfile이 누락됨** (2026-01-30 추가)
- **해결책**:
  1. **리포지토리 루트에서 실행**: `/opt/ch25` 등 실제 프로젝트 루트에서 `docker compose build` 실행.
  2. 배포 스크립트 내 `cd /opt/ch25` 등 **작업 디렉터리 고정**.
  3. `docker compose config`로 `dockerfile: Dockerfile.backend` 경로 확인.
  4. **deploy.yml SCP source에 `Dockerfile.backend,Dockerfile.frontend` 추가** (2026-01-30 수정)

### ❌ 이슈 5: Celery Worker/Beat 빌드 실패 (`requirements.txt not found`) — 2026-01-30 추가
- **현상**: `celery-worker`, `celery-beat` 컨테이너 빌드 시 `/requirements.txt`, `/app`, `/alembic` 등 파일을 찾지 못함.
- **원인**: 
  1. `docker-compose.yml`에서 `celery-worker`, `celery-beat`에 `image:` 설정이 없어 매번 로컬 빌드 시도.
  2. 서버에는 소스 코드가 없어서 빌드 실패.
- **해결책**:
  1. `celery-worker`, `celery-beat`에 `image: ghcr.io/heyjinjung/xmas-backend:latest` 추가.
  2. pre-built 이미지를 pull하여 사용하도록 설정.

```yaml
# docker-compose.yml 수정 예시
celery-worker:
  image: ghcr.io/heyjinjung/xmas-backend:latest  # 추가
  build:
    context: .
    dockerfile: Dockerfile.backend
```

### ❌ 이슈 6: 볼륨 마운트 실패 (`alembic.ini` mount error) — 2026-01-30 추가
- **현상**: `error mounting "/opt/ch25/alembic.ini" to rootfs: not a directory`
- **원인**: 
  1. 서버에 `alembic.ini` 파일이 존재하지 않음.
  2. 프로덕션 환경에서 불필요한 볼륨 마운트(`./app`, `./alembic`, `./docs`)가 설정됨.
- **해결책**:
  1. **프로덕션 docker-compose.yml에서 개발용 볼륨 마운트 제거**:
     - `./app:/app/app` 제거
     - `./alembic:/app/alembic` 제거
     - `./alembic.ini:/app/alembic.ini` 제거
     - `./docs:/app/docs` 제거
  2. **로컬 개발용 볼륨은 `docker-compose.override.yml`에 유지**.
  3. 필요시 SCP source에 `alembic.ini,alembic/*` 추가.

```yaml
# docker-compose.yml (프로덕션) - 최소 볼륨만 유지
backend:
  volumes:
    - ./logs:/app/logs  # 로그만 마운트

# docker-compose.override.yml (로컬 개발) - 개발용 볼륨 추가
backend:
  volumes:
    - ./logs:/app/logs
    - ./app:/app/app
    - ./alembic:/app/alembic
    - ./alembic.ini:/app/alembic.ini
    - ./docs:/app/docs
```

### ❌ 이슈 7: Mission Stats API 500 에러 — 2026-01-30 추가
- **현상**: `GET /api/v2/admin/game/missions/stats` 호출 시 500 Internal Server Error.
- **원인**: `mission_routes.py`에서 잘못된 `db.bind.dialect.type_descriptor` 사용.
- **해결책**: 
  1. 문제가 되는 dead code 제거 (불필요한 `func.cast` + `type_descriptor` 쿼리).
  2. 이미 아래에 올바른 개별 쿼리(`func.count`)가 있으므로 중복 코드 삭제.

```python
# 삭제된 코드 (잘못된 방식)
progress_stats = db.query(
    func.sum(func.cast(UserMissionProgress.is_completed, 
             db.bind.dialect.type_descriptor(...))).label("completed"),
).first()

# 유지된 코드 (올바른 방식)
completed_count = db.query(func.count(UserMissionProgress.id)).filter(
    UserMissionProgress.mission_id == mission.id,
    UserMissionProgress.is_completed == True,
).scalar() or 0
```

### 🛡️ 어드민 전용 이슈 (Admin Specific)
#### 1. RBAC 권한 충돌 (Permission Denied)
- **증상**: 신규 운영자가 Dashboard 메뉴는 보이나 '수정' 버튼 클릭 시 403 에러 발생.
- **원인**: `AdminUserProfile`의 `tags`에 `WRITE_ACCESS`가 누락되었거나 `STAFF` 등급으로 설정됨.
- **조치**: `ADMIN` 권한을 가진 계정으로 해당 운영자의 권한 태그를 `WRITE_ACCESS` 등으로 보완.

#### 2. 감사 로그(Audit Log) 기록 누락
- **증상**: 관리자 작업 후 `v2_admin_action_audit` 테이블에 이력이 남지 않음.
- **원인**: `AdminAPIRouter`의 미들웨어에서 특정 커스텀 엔드포인트를 예외 처리함.
- **조치**: `app/v2/api/admin/ops_routes.py`에 `@audit_log` 데코레이터가 누락되었는지 확인.

### 👤 유저 전용 이슈 (User Specific)
#### 1. 지갑 잔액 갱신 지연 (Vault Sync Delay)
- **증상**: 입금 후 유저 화면에서 잔액이 즉시 반영되지 않음 (F5 필요).
- **원인**: Redis Pub/Sub 메시지가 유저 세션에 전달되지 않았거나 `v2_user` 캐시 만료 전임.
- **조치**: `scripts/clear_user_cache.py <cc_id>` 실행 후 데이터 정합성 확인.

#### 2. 세션 만료 및 강제 로그아웃
- **증상**: 유저가 게임 중 갑자기 로그인 화면으로 튕김.
- **원인**: Access Token(15분) 만료 후 Refresh Token(30일)을 통한 갱신 시점에 브라우저 저장소(LocalStrage) 충돌.
- **조치**: 프론트엔드 `authProvider`에서 `silentRefresh` 로직이 오작동하는지 확인하고, 유저에게 쿠키 삭제 요청.

---


## 🔍 2. 단계별 정밀 검증 및 트러블슈팅 확장 가이드 (Full Verification & Troubleshooting)

### 2.1 스키마/Enum/파라미터 정합성
- **CSV/게임/인벤토리/미션/티켓/보상 등 모든 주요 API/DB Enum 값이 learned_ 및 canonical_enums와 일치하는지 검증**
- **FE↔BE 파라미터 snake_case/camelCase 일치 여부, 응답 필드 직렬화/alias 확인**
- **샘플 CSV/JSON/파라미터 파일로 실제 import/validation 테스트**

### 2.2 실시간/배치 파이프라인 장애
- **CSV-to-Redis 파이프라인**: CSV import 시 유저 매핑, 금액/결과/메타데이터 검증, Redis 이벤트 발행, 배치/히스토리컬/드라이런 모드별 장애 대응
- **실시간 모니터링**: golden:v2:events:game Redis Pub/Sub, WebSocket, InterventionLog API, 프론트 GoldenEventStream 연결/색상/상태 표시, 쿨다운/히스토리/실시간 동기화

### 2.3 스트릭/미션/09:00 KST 경계
- **streak_continuity_verification_guide.md**의 모든 시나리오(C1~C6) 수동/자동 검증
- **운영일(operational_play_date)과 mission reset(09:00 KST) 경계 테스트**
- **Row-level Lock, streak.reset 이벤트, race condition 방지**

### 2.4 권한/어드민/오류/403/권한 태그
- **RBAC/권한 태그/ADMINUserProfile 기반 권한 체크**
- **SUPERADMIN/OPERATOR 등급 하드코딩/필터링 로직 완전 제거**
- **403 Forbidden/Permission Denied 발생 시 get_current_admin_info, tags, 권한 체크 로직 우선 검토**
✅ auth.py에서 UserEventLog 삽입 로직을 V2EventLog로 변경 (장기 해결)

### 2.5 DB/마이그레이션/스키마/데이터 동기화
- **alembic legacy 문제(더미 파일, revision 누락, down_revision 오류, 컨테이너 미반영 등) 발생 시 즉시 파일 삭제/수정/재복사**
- **DB 스키마/인덱스/테이블/enum 값이 learned_ 및 최신 정책과 일치하는지 검증**
- **DB 백업/복원, alembic current, history, downgrade, 롤백 스크립트 실행**

### 2.6 프론트엔드/FE↔BE 연동/타입/Null Safety
- **FE 경로 상수화, V2 canonical path만 사용, Legacy redirect 제거**
- **Optional Chaining, Nullish Coalescing, Defensive Programming 적용**
- **API 응답 데이터 undefined/null 방어, 기본값 처리, 타입 불일치/런타임 크래시 예방**

### 2.7 실전 장애/운영자/유저별 대응
- **운영자**: ROI 집계, 롤백 Eligibility, 감사 로그 누락, 권한 태그, 대시보드, 회수/지급/수정/검색/닉네임/파라미터/로그/인벤토리/티켓 등 모든 Admin API/화면별 장애/오류/500/403/404/502/연동 문제
- **유저**: 금고/티켓/인벤/미션/스트릭/레벨/팀/로그인/세션/토큰/쿠키/캐시/동기화/지연/강제 로그아웃 등 실제 유저 경험 장애 및 대응

### 2.8 주요 스크립트/운영 명령어/실전 체크리스트
- **CSV import_external_casino_csv.py**: dry-run, 실시간, 히스토리컬, 배치, 추정, 검증 등 모든 옵션 실전 실행
- **clear_user_cache.py, validate_gifticon_naming.py, validate_level_sot.py, validate_team_battle_sot.py 등**: 각 도메인별 SoT/정합성/캐시/이벤트/스키마/파라미터/Enum/로그/집계/상태 검증
- **pytest, alembic, redis-cli, curl, npm run dev/build 등**: 실제 운영 환경에서의 명령어/테스트/빌드/모니터링/로그/에러/성능/응답/지연/에러율/슬랙/텔레그램 알림 등

---
## 🧠 4. 교훈 및 예방책 (Lessons Learned & Prevention)
- **정책-코드-운영-문서-테스트-DB-프론트-Enum-파라미터-케이스별 일치**가 핵심
- **learned_ 및 최신 SoT/핫픽스/트러블슈팅 문서 우선 적용**
- **FE↔BE 파라미터/타입/응답/직렬화/케이스/Enum/스키마/경계/운영일/09:00 KST/캐시/세션/토큰/권한/태그/로그/집계/실시간/배치/모니터링/알림/백업/복원/롤백/테스트/커버리지/실전 장애/운영자/유저/실시간/배치/모든 영역**을 전수 검증
- **장애 발생 시 즉시 learned_ 및 트러블슈팅 가이드/핫픽스/운영 내역/로그/DB/코드/정책/문서/테스트/스크립트/명령어/실전 케이스로 역추적**
- **모든 장애/이슈/핫픽스/운영 내역은 learned_ 및 v2_specs/90_troubleshooting/에 기록, 재발 방지 체크리스트로 관리**

### 🏠 A. 시스템 서버 내부 (Local Verification)

| 검증 영역 | 명령어 | 기대 결과 |
| :--- | :--- | :--- |
| **인증 서버** | `curl -X POST http://localhost:8000/api/v2/auth/refresh` | `401` (토큰 없음) 또는 유효한 갱신 응답 |
| **Redis 통신** | `redis-cli monitor` | `PUBLISH golden:v2:events:...` 로그 실시간 포착 |
| **DB 마이그레이션** | `alembic current` | 최신 V2 revision 반영 상태 |
| **핵심 인덱스 검증** | `scripts/user_consistency_check.py --check index` | `v2_user.telegram_id`, `v2_user_auth_event.user_id`, `jti`, `user_activity` 인덱스 활성화 확인 |

### 🌏 B. 운영자/관리자 환경 (Admin Dashboard)

| 검증 항목 | 위치 | 확인 내용 |
| :--- | :--- | :--- |
| **ROI 집계** | 운영 > ROI 분석 | 최근 24시간 내 캠페인별 비용 대비 수익률 출력 확인 |
| **롤백 테스트** | 운영 > 작업 로그 > 회수 | 특정 지급 건에 대한 '회수 가능 여부(Eligibility)' 조회 확인 |
| **보안 레이어** | (일반계정 로그인) | `/admin` 경로 접근 시 즉시 차단/메인 리다이렉트 확인 |

---

## 📈 3. 성능 모니터링 체크포인트 (Performance)

- **Redis Latency**: `redis-cli --latency` 확인 (1ms 이하 권장).
- **Backend Response**: `/metrics` 엔드포인트를 통해 Prometheus 메트릭 수집 확인.
- **Log Integrity**: 에러 로그 내에 `V1 Legacy` 관련 경로가 보이지 않는지 최종 확인.

---

## 🔧 5. 2026-01-30 긴급 패치 내역

### Issue 8: INVALID_REWARD_TYPE (VAULT 보상 설정 불가)
- **증상**: 어드민에서 레벨 6 보상을 "VAULT"로 설정 시 `INVALID_REWARD_TYPE` 오류
- **원인**: `level_routes.py`의 `ALLOWED_REWARD_TYPES`에 "VAULT"가 누락
- **해결**: `ALLOWED_REWARD_TYPES` set에 "VAULT" 추가
- **파일**: `app/v2/api/admin/level_routes.py`

### Issue 9: Admin Economy/Inventory API 500 에러 (FK 불일치)
- **증상**: 
  - `/api/v2/admin/economy/deposits` 500 에러
  - `/api/v2/admin/economy/tickets` 생성 시 500 에러
  - `/api/v2/admin/economy/inventory-items` 생성 시 500 에러
- **원인**: 
  1. API 코드에서 `User` 대신 `V2User`를 사용해야 하는데 레거시 `User` 참조
  2. `user_game_wallet`, `user_inventory_item` 등 테이블이 `user.id` FK 참조 → V2User만 있는 유저에게 지급 불가
- **해결 (코드 수정)**:
  - `economy_routes.py`: User→V2User 참조 수정 (4곳 join 쿼리)
  - `inventory_routes.py`: User→V2User 참조 수정
- **해결 (FK 마이그레이션)** - **미적용, 배포 필요**:
  - 마이그레이션: `20260130_1900_migrate_fk_to_v2_user.py`
  - 모델 변경: `game_wallet.py`, `game_wallet_ledger.py`, `inventory.py` FK를 `v2_user.id`로 변경
  - V2User 모델에 `game_wallets` relationship 추가

| 테이블 | 변경 전 FK | 변경 후 FK |
|--------|-----------|-----------|
| user_game_wallet | user.id | v2_user.id |
| user_game_wallet_ledger | user.id | v2_user.id |
| user_inventory_item | user.id | v2_user.id |
| user_inventory_ledger | user.id | v2_user.id |

### 배포 체크리스트 (Issue 9 완료용)
```bash
# 1. Git push 후 CI/CD 자동 배포 또는
# 2. 수동 배포 시
docker compose exec backend alembic upgrade head
docker compose restart backend
```

---
> [!IMPORTANT]
> 모든 장애 상황은 `v2_admin_action_audit`에 기록되어 추후 ROI 분석 및 롤백의 근거 자료가 됩니다. 장애 발생 시 로그를 삭제하지 마십시오.
