문서 타입: 운영 가이드
버전: v1.1
작성일: 2026-01-30
작성자: GitHub Copilot
대상: DevOps/Backend
상태: SoT

# V2 배포 자동화 스크립트 가이드

## 1. 목적 (Purpose)
배포 자동화 스크립트의 필수 단계와 검증 기준을 정의한다.

## 2. 범위 (Scope)
- 컨테이너 빌드/기동
- 마이그레이션 적용
- 헬스 체크
- 스모크 검증
- V1 Vultr 서버 재사용
- SSH 키(ed 시작, 식별자 149) 사용

## 3. 필수 단계 (Required Steps)
1) Docker 이미지 빌드
2) 컨테이너 기동
3) Alembic 마이그레이션 적용
4) 헬스 체크(backend 직결 + nginx 경유)
5) 스모크 검증(핵심 API 라우트)

## 4. 배포 스크립트 체크리스트
- [ ] V1 Vultr 서버 접속 확인 (SSH 키: ed 시작, 식별자 149)
- [ ] 이미지 빌드 완료
- [ ] 컨테이너 정상 기동
- [ ] Alembic head 적용 확인
- [ ] `/health` 200
- [ ] `/api/v2/health/db` 200

## 5. 실패 처리 기준
- 헬스 체크 실패 시 배포 중단 및 로그 수집
- 마이그레이션 실패 시 롤백 절차 이행

## 5.1 서버/키 참고
- 서버 주소: root@149.28.135.147
- SSH 키 경로: C:\Users\JAVIS\.ssh\id_ed25519_vultr (Windows)
- 참고 문서:
	- [.agent/workflows/deploy.md](.agent/workflows/deploy.md)
	- [docs/v1archive/06_ops/deployment/03_fast_deployment_guide_v1.0.md](docs/v1archive/06_ops/deployment/03_fast_deployment_guide_v1.0.md)

## 6. 변경 이력
- v1.0 (2026-01-30, GitHub Copilot): 최초 작성
- v1.1 (2026-01-30, GitHub Copilot): V1 Vultr 서버/SSH 키 사용 조건 반영
