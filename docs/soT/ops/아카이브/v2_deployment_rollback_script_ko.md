문서 타입: 운영 가이드
버전: v1.1
작성일: 2026-01-30
작성자: GitHub Copilot
대상: DevOps/Backend
상태: SoT

# V2 배포 롤백 스크립트 가이드

## 1. 목적 (Purpose)
배포 실패 또는 장애 발생 시 롤백 절차의 필수 단계와 검증 기준을 정의한다.

## 2. 범위 (Scope)
- 코드 롤백
- DB 롤백
- 캐시 정리
- 헬스 체크 재검증
- V1 Vultr 서버 재사용
- SSH 키(ed 시작, 식별자 149) 사용

## 3. 필수 단계 (Required Steps)
1) 이전 안정 버전으로 코드 롤백
2) 컨테이너 재기동
3) 필요 시 Alembic 롤백
4) 캐시 초기화
5) 헬스 체크 재검증

## 4. 롤백 체크리스트
- [ ] V1 Vultr 서버 접속 확인 (SSH 키: ed 시작, 식별자 149)
- [ ] 코드 롤백 완료
- [ ] 컨테이너 재기동 완료
- [ ] Alembic downgrade 필요 여부 확인
- [ ] 캐시 초기화 완료
- [ ] `/health` 200
- [ ] `/api/v2/health/db` 200

## 4.1 서버/키 참고
- 서버 주소: root@149.28.135.147
- SSH 키 경로: C:\Users\JAVIS\.ssh\id_ed25519_vultr (Windows)
- 참고 문서:
	- [.agent/workflows/deploy.md](.agent/workflows/deploy.md)
	- [docs/v1archive/06_ops/deployment/01_vultr_seoul_setup_guide_v1.0.md](docs/v1archive/06_ops/deployment/01_vultr_seoul_setup_guide_v1.0.md)

## 5. 변경 이력
- v1.0 (2026-01-30, GitHub Copilot): 최초 작성
- v1.1 (2026-01-30, GitHub Copilot): V1 Vultr 서버/SSH 키 사용 조건 반영
