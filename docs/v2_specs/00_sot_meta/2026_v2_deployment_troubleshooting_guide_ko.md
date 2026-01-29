# V2 배포 트러블슈팅 및 검증 리포트 (V2 Deployment Troubleshooting)

**문서 타입**: 장애 대응 및 검증 리포트 (Troubleshooting & Verification)
**작성일**: 2026-01-29
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

### 🛡️ 어드민 전용 이슈 (Admin Specific)
#### 1. RBAC 권한 충돌 (Permission Denied)
- **증상**: 신규 운영자가 Dashboard 메뉴는 보이나 '수정' 버튼 클릭 시 403 에러 발생.
- **원인**: `AdminUserProfile`의 `tags`에 `WRITE_ACCESS`가 누락되었거나 `STAFF` 등급으로 설정됨.
- **조치**: `SUPERADMIN` 계정으로 해당 운영자의 권한 태그를 `ADMIN` 또는 `MANAGER`로 격상.

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

## 🔍 2. 단계별 정밀 검증 절차 (Verification Guide)

### 🏠 A. 시스템 서버 내부 (Local Verification)

| 검증 영역 | 명령어 | 기대 결과 |
| :--- | :--- | :--- |
| **인증 서버** | `curl -X POST http://localhost:8000/api/v2/auth/refresh` | `401` (토큰 없음) 또는 유효한 갱신 응답 |
| **Redis 통신** | `redis-cli monitor` | `PUBLISH golden:v2:events:...` 로그 실시간 포착 |
| **DB 마이그레이션** | `alembic current` | 최신 V2 revision 반영 상태 |

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
> [!IMPORTANT]
> 모든 장애 상황은 `v2_admin_action_audit`에 기록되어 추후 ROI 분석 및 롤백의 근거 자료가 됩니다. 장애 발생 시 로그를 삭제하지 마십시오.
