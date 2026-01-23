문서 타입: 가이드
버전: v1.1
작성일: 2026-01-23
작성자: GitHub Copilot
대상: V2 배포/검증 담당자
상태: Draft

## 1. 목적
V2 배포 전/후 필수 검증 항목을 표준화한다.

## 2. 범위
- Unit/Integration 테스트
- E2E 스모크 테스트
- 로컬/스테이징 로그 샘플 확인
- 모니터링 관찰
- 롤백 절차 문서화

## 3. 검증(VERIFY) 체크리스트
### 3.1 Unit & Integration 테스트
- [ ] 핵심 서비스 단위 테스트 추가
- [ ] 통합 테스트 추가
- [ ] 테스트 전부 통과 기록

### 3.2 E2E 스모크 테스트 (핵심 플로우)
- [ ] 로그인 → 홈 진입
- [ ] 상점 조회 → 구매
- [ ] 인벤토리 조회 → 아이템 사용
- [ ] 미션 조회 → 클레임
- [ ] 금고 상태 조회

### 3.3 로컬/스테이징 트래픽 샘플
- [ ] 핵심 API 요청 50~100건 샘플 수집
- [ ] 오류 로그 없음 확인
- [ ] 지연/타임아웃 징후 없음 확인

### 3.4 모니터링
- [ ] 에러율 추적 (릴리즈 후 24h)
- [ ] 응답시간 P95/P99 추적
- [ ] 핵심 엔드포인트 알람 설정 확인

### 3.5 롤백 절차 문서화
- [ ] 롤백 기준 정의(에러율, SLA)
- [ ] 롤백 커밋/이미지 태그 기록
- [ ] 롤백 실행 체크리스트 작성

### 3.6 우선순위 구현 체크리스트
- [ ] High: 인증(Auth)
- [ ] High: 금고(Vault) 읽기/쓰기
- [ ] High: 결제/구매(Shop Purchase)
- [ ] High: 게임 Play(roulette/dice/lottery)
- [ ] High: 인벤토리 사용(쓰기)
- [ ] Medium: 상태조회(read-only)
- [ ] Medium: 팀배틀
- [ ] Medium: 설문
- [ ] Low: 어드민 전용/저트래픽 경로

## 4. 관련 파일 앵커
- [docs/v2_specs/00_sot_meta/v2_v1_dependency_inventory_ko.md](docs/v2_specs/00_sot_meta/v2_v1_dependency_inventory_ko.md)
- [docs/v2_specs/00_sot_meta/v2_verification_log_template_ko.md](docs/v2_specs/00_sot_meta/v2_verification_log_template_ko.md)
- [app/v2/api/auth_routes.py](app/v2/api/auth_routes.py)
- [app/v2/api/user_routes.py](app/v2/api/user_routes.py)
- [app/v2/api/vault_routes.py](app/v2/api/vault_routes.py)
- [app/v2/api/routes.py](app/v2/api/routes.py)
- [app/v2/api/deps.py](app/v2/api/deps.py)
- [app/v2/services/vault_service.py](app/v2/services/vault_service.py)
- [app/v2/services/shop_service.py](app/v2/services/shop_service.py)

## 5. 변경 이력
- v1.1 (2026-01-23, GitHub Copilot): 우선순위 체크리스트 및 파일 앵커 추가
- v1.0 (2026-01-23, GitHub Copilot): 검증 체크리스트 문서 초안 작성
