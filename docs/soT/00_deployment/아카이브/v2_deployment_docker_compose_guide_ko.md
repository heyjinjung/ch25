문서 타입: 운영 가이드
버전: v1.1
작성일: 2026-01-30
작성자: GitHub Copilot
대상: DevOps/Backend
상태: SoT

# V2 배포 Docker Compose 설정 가이드

## 1. 목적 (Purpose)
V2 배포 시 Docker Compose 설정의 필수 항목과 검증 기준을 정의한다.

## 2. 범위 (Scope)
- backend, frontend, nginx, db, redis 서비스 구성
- health/헬스 체크 라우팅
- 환경 변수 및 볼륨 마운트 기본 원칙
- V1 Vultr 서버 재사용
- SSH 키(ed 시작, 식별자 149) 사용

## 3. 구성 원칙 (Principles)
1) 서비스 네이밍은 인프라/로그/헬스 체크 규칙과 일치해야 한다.
2) 헬스 체크는 최소 2단계(backend 직결, nginx 경유)로 확인한다.
3) 환경 변수는 .env/.env.production 등 배포 프로필을 사용한다.
4) DB/Redis/Backend는 의존성을 명시한다.

## 4. 필수 서비스 체크리스트
- [ ] V1 Vultr 서버 접속 확인 (SSH 키: ed 시작, 식별자 149)
- [ ] backend
- [ ] frontend
- [ ] nginx
- [ ] db
- [ ] redis

## 5. 헬스 체크 기준
- [ ] backend 컨테이너 내부 `GET /api/v2/health` 200
- [ ] nginx 경유 `GET /health` 200
- [ ] nginx 경유 `GET /api/v2/health/db` 200

## 6. 운영 주의사항
- 프록시 갱신 문제로 nginx 502가 발생할 수 있으므로, 배포 직후 재시작 절차를 준비한다.
- 헬스 체크 실패 시 backend/nginx 로그를 우선 확인한다.

## 6.1 서버/키 참고
- 서버 주소: root@149.28.135.147
- SSH 키 경로: C:\Users\JAVIS\.ssh\id_ed25519_vultr (Windows)
- 참고 문서:
	- [.agent/workflows/deploy.md](.agent/workflows/deploy.md)
	- [scripts/sync_db_production.ps1](scripts/sync_db_production.ps1)

## 7. 변경 이력
- v1.0 (2026-01-30, GitHub Copilot): 최초 작성
- v1.1 (2026-01-30, GitHub Copilot): V1 Vultr 서버/SSH 키 사용 조건 반영
