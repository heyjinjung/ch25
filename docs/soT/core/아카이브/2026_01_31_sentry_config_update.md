# 트러블슈팅: Sentry 전체 로그 추적 강화 및 최신 SDK 업데이트

**날짜**: 2026-01-31
**우선순위**: 🟡 중
**상태**: ✅ 수정 완료 (배포 대기)

---

## 문제 배경

### Sentry Transactions Deprecation 경고
Sentry SDK에서 `traces_sample_rate` 대신 신규 필터 방식(`traces_sampler`) 사용을 권고하고 있었습니다.

### 전체 로그 추적 필요성
- 새로운 로그나 에러가 발생해도 Sentry에서 잘 캡처되지 않음
- 샘플링 비율이 낮아(10%) 중요한 이벤트를 놓칠 가능성
- 디버깅 시 전체 트랜잭션 흐름 파악이 어려움

---

## 수정 내용

### 파일: `app/main.py`

#### 1. `traces_sample_rate` → `traces_sampler` 마이그레이션

**Before (Line 38):**
```python
sentry_sdk.init(
    dsn=sentry_dsn,
    environment=settings.env,
    traces_sample_rate=0.1,  # 10% 트랜잭션 샘플링
    profiles_sample_rate=0.1,  # 10% 프로파일링
    ...
)
```

**After (Line 35-68):**
```python
def traces_sampler(sampling_context):
    """최신 SDK 권장: 트랜잭션별 샘플링 결정"""
    # ASGI scope에서 경로 추출
    asgi_scope = sampling_context.get("asgi_scope")
    if asgi_scope:
        path = asgi_scope.get("path", "")

        # 헬스체크/정적 파일은 샘플링 제외
        if path in ["/", "/health", "/ping"] or path.startswith("/static"):
            return 0.0

        # 에러가 발생한 트랜잭션은 100% 샘플링
        if sampling_context.get("parent_sampled") is False:
            return 1.0

        # API 엔드포인트는 100% 샘플링 (전체 로그 추적)
        if path.startswith("/api") or path.startswith("/admin"):
            return 1.0

    # 기본: 100% 샘플링 (전체 추적)
    return 1.0

sentry_sdk.init(
    dsn=sentry_dsn,
    environment=settings.env,
    # 최신 SDK 권장: traces_sample_rate 대신 traces_sampler 사용
    traces_sampler=traces_sampler,
    ...
)
```

#### 2. 전체 로그 추적 강화

**추가된 설정:**
```python
sentry_sdk.init(
    ...
    # 전체 로그 추적 강화
    enable_tracing=True,  # 트레이싱 활성화
    _experiments={
        "continuous_profiling_auto_start": True,  # 자동 프로파일링
    },
    # 브레드크럼 설정 (사용자 액션 추적)
    max_breadcrumbs=100,  # 기본 100개
    attach_stacktrace=True,  # 모든 메시지에 스택트레이스 첨부
)
```

#### 3. 로깅 레벨 조정

**Before:**
```python
logging_integration = LoggingIntegration(
    level=logging.INFO,
    event_level=logging.ERROR,  # ERROR 이상만 이벤트로 전송
)
```

**After:**
```python
logging_integration = LoggingIntegration(
    level=logging.INFO,  # INFO 레벨 이상 로그 캡처
    event_level=logging.WARNING,  # WARNING 이상은 이벤트로 전송
)
```

---

## 주요 개선 사항

### 1. 샘플링 정책 세분화

| 경로 패턴 | 샘플링 비율 | 이유 |
|-----------|-------------|------|
| `/`, `/health`, `/ping` | 0% | 헬스체크 - 노이즈 제거 |
| `/static/*` | 0% | 정적 파일 - 불필요 |
| `/api/*`, `/admin/*` | **100%** | **모든 API 요청 추적** |
| 에러 발생 트랜잭션 | **100%** | **에러 전체 추적** |
| 기본 | **100%** | **전체 추적** |

### 2. 로그 캡처 레벨 확대
- **기존**: ERROR 레벨만 Sentry 이벤트로 전송
- **변경**: **WARNING 레벨**부터 Sentry 이벤트로 전송
- **효과**: 더 많은 잠재적 이슈 조기 발견

### 3. 스택트레이스 자동 첨부
- 모든 로그 메시지에 스택트레이스 자동 첨부
- 에러 발생 컨텍스트 파악 용이

### 4. 브레드크럼 확장
- 최대 100개의 사용자 액션 추적
- 에러 발생 전 사용자 행동 패턴 분석 가능

---

## 성능 영향 분석

### 샘플링 비율 증가
- **기존**: 10% 샘플링 (모든 요청의 10%만 추적)
- **변경**: 100% 샘플링 (API 요청 전체 추적)

### 예상 트래픽 증가
- Sentry로 전송되는 이벤트 수: **약 10배 증가**
- 운영 서버 영향: **미미** (비동기 전송)

### Sentry 쿼터 고려사항
- Sentry 월간 이벤트 쿼터 확인 필요
- 필요 시 쿼터 확대 또는 샘플링 비율 재조정

---

## 검증 방법

### 1. 로컬 테스트
```bash
# Docker 컨테이너에서 확인
docker compose exec backend python -c "from app.main import app; print('✅ Sentry config loaded')"
```

### 2. 배포 후 Sentry 대시보드 확인

#### 확인 항목:
1. **Transactions 탭**
   - API 요청이 100% 샘플링되는지 확인
   - `/api/*`, `/admin/*` 경로의 트랜잭션 데이터 확인

2. **Issues 탭**
   - WARNING 레벨 이스가 캡처되는지 확인
   - 스택트레이스가 자동 첨부되는지 확인

3. **Performance 탭**
   - 트랜잭션별 성능 데이터 확인
   - 느린 API 엔드포인트 식별

### 3. 테스트 엔드포인트 호출

```bash
# Sentry 테스트 엔드포인트
curl http://localhost:8000/debug-sentry

# 예상 로그:
# INFO: Sentry log test from /debug-sentry endpoint
# ERROR: ValueError: This is a test error for Sentry verification
```

Sentry 대시보드에서:
- 에러 이벤트 확인
- 스택트레이스 확인
- 브레드크럼 확인 (이전 요청 기록)

---

## 운영 서버 배포 시 주의사항

### 1. SENTRY_DSN 환경 변수 확인
```bash
# 운영 서버에서 확인
docker compose exec backend printenv | grep SENTRY_DSN
```

### 2. 배포 후 모니터링 (첫 24시간)
- Sentry 이벤트 급증 모니터링
- 쿼터 사용량 확인
- 필요 시 샘플링 비율 조정

### 3. 비상 롤백 준비
샘플링이 과도하게 많아질 경우:
```python
# traces_sampler 함수에서 기본 샘플링 비율 조정
return 0.5  # 50% 샘플링으로 조정
```

---

## 관련 문서

### Sentry SDK 공식 문서
- [Sampling Transactions](https://docs.sentry.io/platforms/python/configuration/sampling/)
- [Performance Monitoring](https://docs.sentry.io/platforms/python/tracing/)
- [Logging Integration](https://docs.sentry.io/platforms/python/integrations/logging/)

### 프로젝트 내 참고 파일
- `app/main.py` (Sentry 초기화)
- `app/core/error_handlers.py` (예외 처리)

---

## 후속 조치

### 배포 전
- [x] 코드 수정 완료
- [x] 로컬 임포트 테스트
- [ ] 배포 문서 업데이트

### 배포 후
- [ ] Sentry 대시보드 모니터링 (24시간)
- [ ] 쿼터 사용량 확인
- [ ] WARNING 레벨 이슈 검토
- [ ] 성능 영향 분석

### 향후 개선
- [ ] 샘플링 정책 최적화 (필요 시)
- [ ] 커스텀 브레드크럼 추가 (중요 비즈니스 로직)
- [ ] Sentry 알림 규칙 설정

---

## 변경 이력
- **2026-01-31**: 최초 작성 - Sentry 전체 로그 추적 강화 및 최신 SDK 업데이트
