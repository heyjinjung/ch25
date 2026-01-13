# CI 배포 Runbook + 장애 회고 (2026-01-13)
문서 타입: 운영/배포 Runbook + Postmortem(요약)
버전: v1.0
작성일: 2026-01-13
대상 독자: 운영/인프라/백엔드

## 0) 목적
- GitHub Actions 기반 배포를 **끝까지 자동 통과**시키고, 배포 직후 사용자가 `https://cc-jm.com`에 접속 가능한 상태를 재현한다.
- 이번에 실제로 발생한 장애 패턴(502/401/TLS)을 “다음 배포에서” 반복하지 않도록 **검증 커맨드/판단 기준**을 남긴다.

## 1) 시스템 요약(SoT)
- 서버: `149.28.135.147`
- 앱 경로: `/opt/xmas-event`
- 배포: GitHub Actions → SSH로 서버에서 `docker compose pull && docker compose up -d --remove-orphans`
- 프록시: nginx(80/443) → backend(8000), frontend(80)
- 도메인: `cc-jm.com`

## 2) 배포 성공 정의(운영 기준)
아래 4개가 모두 만족하면 “배포 성공”으로 본다.
1) DB 마이그레이션이 head에 도달
2) backend 컨테이너 내부 `/api/health` OK
3) nginx 경유 `/health`, `/api/health` OK
4) 도메인 HTTPS `https://cc-jm.com/health` OK

## 3) 배포 직후 점검 커맨드(서버)
> 서버에서 실행

```bash
cd /opt/xmas-event

docker compose ps

docker compose exec -T backend alembic current

docker compose exec -T backend python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=2).read(); print('OK')"

curl -fsS http://127.0.0.1/health >/dev/null && echo OK_NGINX_HEALTH
curl -fsS http://127.0.0.1/api/health >/dev/null && echo OK_NGINX_API_HEALTH

curl -skf https://127.0.0.1/health >/dev/null && echo OK_NGINX_HTTPS_HEALTH
```

## 4) CI 게이트(스모크) 기준
### 4.1 HEALTH 게이트
- 1차: backend 컨테이너 자체 `/api/health`가 먼저 200이어야 함(nginx 영향 제거)
- 2차: nginx 경유 `/health`, `/api/health` 확인

### 4.2 Admin smoke 게이트(중요)
- 목적은 “정상 JSON 라우팅” 확인이다.
- `/admin/api/...`는 정책상 **401이 정상**일 수 있으므로, 다음을 정상으로 허용한다.
  - `200 + application/json`
  - `401 + application/json` 그리고 body에 `AUTH_REQUIRED`
- 대신 `text/html`(SPA index.html)로 떨어지면 프록시/라우팅 문제로 즉시 실패 처리한다.

## 5) 이번 장애/해결 요약(재발 방지)
### 5.1 배포 직후 nginx 경유 `/api/health`가 502로 실패
- 현상: backend 내부 health는 200인데 nginx 경유는 일시적으로 502
- 대응: 배포 직후 nginx를 1회 `restart`하여 upstream 갱신을 유도
- 운영 팁: 502가 길게 지속되면 nginx/백엔드 로그를 같이 본다.
  - `docker compose logs --tail=200 nginx`
  - `docker compose logs --tail=200 backend`

### 5.2 Admin smoke가 401(AUTH_REQUIRED)로 실패
- 현상: CI가 401을 “실패”로 오판
- 대응: 위 4.2 규칙으로 스모크 게이트를 수정

### 5.3 도메인 접속: 80은 301인데 443에서 `ERR_CONNECTION_CLOSED`
- 현상: `http://cc-jm.com/health`는 301로 https 이동, 그런데 https는 TLS handshake 단계에서 끊김
- 원인(이번 케이스): nginx 설정에서 443 SSL server block이 비활성(주석 처리)
- 대응: 443 SSL server block 활성화 후 nginx 재시작
- 확인:
  - 클라이언트: `curl -vk https://cc-jm.com/health`
  - 서버: `docker compose exec -T nginx nginx -T | sed -n '1,220p'`

## 6) 롤백 기준(간단)
- 배포 직후 5분 내에 health/접속이 복구되지 않으면 롤백 우선(원인 추적은 다음)
- 롤백 전 필수: DB 덤프 파일(또는 직전 스냅샷) 존재 확인

## 7) 참고 문서
- 배포 예상 오류 리스트: `docs/06_ops/deployment/DEPLOYMENT_EXPECTED_ERRORS.md`
- 배포 후 검증 체크리스트: `docs/06_ops/deployment/04_post_deployment_verification_v1.0.md`
- CI 워크플로: `.github/workflows/deploy.yml`
