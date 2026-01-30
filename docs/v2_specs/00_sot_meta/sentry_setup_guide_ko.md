# Sentry 연동 가이드 (Error Tracking Setup)

**작성일**: 2026-01-30
**대상**: DevOps, Backend 팀
**목적**: 프로덕션 에러 추적 및 모니터링

---

## 📋 1. Sentry 프로젝트 생성

### 1.1 Sentry 계정 생성
1. https://sentry.io 접속
2. 계정 생성 또는 로그인
3. Organization 생성 (예: `xmas-event`)

### 1.2 프로젝트 생성
1. **Create Project** 클릭
2. **Platform**: Python 선택
3. **Project Name**: `xmas-backend-production`
4. **Alert Frequency**: `On every new issue` 선택
5. **Create Project** 클릭

.github/workflows/deploy.yml 파일에서 다음 3곳을 수정했습니다:

Line 76: env 섹션에 SENTRY_DSN 추가
Line 81: envs 리스트에 SENTRY_DSN 추가
Line 120: .env 파일 생성 시 echo "SENTRY_DSN=${SENTRY_DSN}" >> .env 추가

### 1.3 DSN 확인
생성 후 표시되는 DSN을 복사합니다:

**✅ 발급된 실제 DSN** (2026-01-30):
```
https://9b85622ad0875d05c361d1bda1b44786@o4510798708998144.ingest.de.sentry.io/4510798723022928
```

⚠️ **보안 주의**: DSN은 클라이언트에서도 사용 가능한 공개 키이지만, GitHub Public Repository에 직접 커밋하지 마세요. GitHub Secrets로 관리합니다.

---

## 🔧 2. 백엔드 설정

### 2.1 Dependencies 설치 (이미 완료됨)
```bash
# requirements.txt에 이미 추가됨
sentry-sdk==1.39.2
```

### 2.2 Sentry 초기화 (이미 완료됨)
[app/main.py](../../../app/main.py) 에 초기화 코드가 추가되었습니다:
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    environment=settings.env,
    traces_sample_rate=0.1,  # 10% 트랜잭션 샘플링
    profiles_sample_rate=0.1,  # 10% 프로파일링
    integrations=[
        FastApiIntegration(),
        SqlalchemyIntegration(),
    ],
    send_default_pii=False,  # 민감정보 필터링
)
```

---

## 🚀 3. 환경 변수 설정

### 3.1 GitHub Secrets 등록 (CI/CD 자동 배포용)

1. **GitHub Repository 이동**:
   - https://github.com/YOUR_ORG/ch25 (실제 Repository URL로 변경)

2. **Settings → Secrets and variables → Actions**로 이동

3. **New repository secret** 클릭

4. **Secret 추가**:
   ```
   Name: SENTRY_DSN
   Value: https://9b85622ad0875d05c361d1bda1b44786@o4510798708998144.ingest.de.sentry.io/4510798723022928
   ```

5. **Add secret** 클릭

✅ 이제 `.github/workflows/deploy.yml`이 자동으로 이 Secret을 사용하여 운영 서버에 배포합니다.

### 3.2 수동 배포 시 `.env` 파일 업데이트

CI/CD 파이프라인을 사용하지 않고 수동으로 배포하는 경우:

```bash
# SSH 접속
ssh -i ~/.ssh/id_ed25519_vultr root@149.28.135.147

# 프로젝트 디렉토리로 이동
cd /opt/ch25

# .env 파일에 추가
echo "SENTRY_DSN=https://9b85622ad0875d05c361d1bda1b44786@o4510798708998144.ingest.de.sentry.io/4510798723022928" >> .env
```

### 3.3 Docker Compose 환경 변수 전달
[docker-compose.yml](../../../docker-compose.yml) 에서 이미 `env_file: .env`로 설정되어 있으므로 추가 작업 불필요.

---

## 📦 4. 배포

### 4.1 자동 배포 (GitHub Actions) ✅ 권장

1. **GitHub Secrets 등록 완료 확인** (Step 3.1)

2. **deploy 브랜치에 Push**:
   ```bash
   # 로컬에서 변경사항 커밋 (이미 완료됨)
   git add .
   git commit -m "feat: add Sentry integration for production error tracking"

   # deploy 브랜치에 push
   git push origin deploy
   ```

3. **GitHub Actions 자동 실행 확인**:
   - GitHub Repository → Actions 탭
   - "XMAS Event V2 Deployment" 워크플로우 실행 확인
   - 자동으로:
     - Docker 이미지 빌드/푸시
     - 운영 서버 배포
     - `.env`에 `SENTRY_DSN` 자동 추가
     - 컨테이너 재시작

4. **배포 로그 확인**:
   ```bash
   # SSH 접속
   ssh -i ~/.ssh/id_ed25519_vultr root@149.28.135.147

   # 백엔드 로그에서 Sentry 초기화 확인
   docker logs xmas-backend --tail 50 | grep Sentry
   # 예상 출력: ✅ Sentry initialized (env=production)
   ```

### 4.2 수동 배포 (선택사항)

자동 배포 파이프라인 없이 수동으로 배포하는 경우:

```bash
# SSH 접속
ssh -i ~/.ssh/id_ed25519_vultr root@149.28.135.147

# 프로젝트 디렉토리로 이동
cd /opt/ch25

# 최신 코드 가져오기
git pull origin deploy

# .env에 SENTRY_DSN 추가 (아직 추가하지 않은 경우)
echo "SENTRY_DSN=https://9b85622ad0875d05c361d1bda1b44786@o4510798708998144.ingest.de.sentry.io/4510798723022928" >> .env

# 컨테이너 재시작
docker-compose down
docker-compose up -d --build

# 로그 확인
docker logs xmas-backend --tail 50 | grep Sentry
# 예상 출력: ✅ Sentry initialized (env=production)
```

---

## ✅ 5. 검증

### 5.1 Sentry 초기화 확인
```bash
# 백엔드 로그 확인
docker logs xmas-backend | grep Sentry

# 예상 출력:
# ✅ Sentry initialized (env=production)
```

### 5.2 테스트 에러 전송

**방법 1: /sentry-debug 엔드포인트 추가 (권장)**

[app/main.py](../../../app/main.py)에 테스트 엔드포인트 추가:
```python
@app.get("/sentry-debug")
async def trigger_error():
    """Sentry 테스트용 에러 발생 엔드포인트 (프로덕션에서는 제거)"""
    division_by_zero = 1 / 0
    return {"status": "should not reach here"}
```

그 후 브라우저나 curl로 호출:
```bash
curl https://cc-jm.com/sentry-debug
# 500 Internal Server Error 발생 → Sentry에 자동 전송
```

⚠️ **배포 후 이 엔드포인트는 보안상 제거해야 합니다.**

**방법 2: Docker 컨테이너에서 직접 실행**
```bash
docker exec xmas-backend python -c "
import sentry_sdk
import os
sentry_sdk.init(dsn=os.getenv('SENTRY_DSN'))
try:
    1/0
except Exception as e:
    sentry_sdk.capture_exception(e)
print('✅ Test error sent to Sentry')
"
```

### 5.3 Sentry 대시보드 확인
1. https://sentry.io 접속
2. Organization 선택 후 프로젝트 선택
3. **Issues** 탭에서 `ZeroDivisionError` 확인
4. 에러 상세 정보 확인:
   - Stack trace
   - Request 정보 (URL, method, headers)
   - Environment: `production`
   - Server name
   - Timestamp

---

## 📊 6. Sentry 대시보드 설정

### 6.1 Alert Rules
1. **Alerts** → **Create Alert Rule**
2. **Conditions**:
   - When an event is seen
   - Issue is first seen
   - Issue changes state
3. **Actions**:
   - Send a notification to #alerts (Slack 연동)
   - Send an email to devops@example.com

### 6.2 Performance Monitoring
1. **Performance** 탭 활성화
2. **Transaction Summary** 확인:
   - Slow API endpoints (p95 > 200ms)
   - DB query 성능

### 6.3 Release Tracking
```bash
# 배포 시 릴리즈 생성
export SENTRY_AUTH_TOKEN=your-auth-token
export SENTRY_ORG=xmas-event
export SENTRY_PROJECT=xmas-backend-production

sentry-cli releases new "v2.0.$(date +%Y%m%d)"
sentry-cli releases set-commits "v2.0.$(date +%Y%m%d)" --auto
sentry-cli releases finalize "v2.0.$(date +%Y%m%d)"
```

---

## 🔍 7. Sentry 사용법

### 7.1 수동 에러 캡처
```python
import sentry_sdk

try:
    # 위험한 작업
    result = risky_operation()
except Exception as e:
    sentry_sdk.capture_exception(e)
    # 에러 처리 로직
```

### 7.2 커스텀 컨텍스트 추가
```python
sentry_sdk.set_context("user", {
    "id": user.id,
    "username": user.cc_id,
})

sentry_sdk.set_tag("feature", "telegram_auth")
```

### 7.3 Breadcrumbs 추가
```python
sentry_sdk.add_breadcrumb(
    category="auth",
    message="User login attempt",
    level="info",
)
```

---

## 📈 8. 모니터링 메트릭

### 주요 지표
- **Error Rate**: < 0.1% 목표
- **Response Time (p95)**: < 200ms 목표
- **Issue Resolution Time**: < 24시간 목표

### Sentry Alerts 기준
- 🚨 **Critical**: Error rate > 1% (즉시 알림)
- ⚠️ **Warning**: Error rate > 0.5% (15분 내 알림)
- ℹ️ **Info**: 새로운 이슈 발견 (1시간 내 알림)

---

## 🔒 9. 보안 고려사항

### 9.1 민감정보 필터링
Sentry 초기화 시 `send_default_pii=False`로 설정하여 다음 정보가 자동 필터링됩니다:
- 사용자 IP 주소
- 쿠키 정보
- 요청 헤더 (Authorization 등)

### 9.2 추가 필터링
특정 필드를 추가로 필터링하려면:
```python
sentry_sdk.init(
    dsn=dsn,
    before_send=lambda event, hint: filter_sensitive_data(event),
)

def filter_sensitive_data(event):
    # password, token 등 민감 정보 제거
    if 'request' in event:
        if 'data' in event['request']:
            event['request']['data'] = '[Filtered]'
    return event
```

---

## 📝 10. 트러블슈팅

### 문제: Sentry 초기화 실패
```
⚠️ Sentry initialization failed: ...
```

**해결**:
1. `SENTRY_DSN` 환경변수 확인
2. `sentry-sdk` 패키지 설치 확인: `pip list | grep sentry`
3. 네트워크 연결 확인: `curl https://sentry.io`

### 문제: 에러가 Sentry에 전송되지 않음
**해결**:
1. 환경 확인: `settings.env == "production"`인지 확인
2. `before_send` 필터 확인
3. Sentry 프로젝트 상태 확인 (quota 초과 여부)

---

## 📚 11. 참고 자료

- **Sentry 공식 문서**: https://docs.sentry.io/platforms/python/
- **FastAPI 연동**: https://docs.sentry.io/platforms/python/guides/fastapi/
- **Performance Monitoring**: https://docs.sentry.io/product/performance/

---

**설정 담당자**: DevOps Team
**검증 완료일**: 2026-01-30
**다음 리뷰**: 2026-02-07
