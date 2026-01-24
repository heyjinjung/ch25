# Admin E2E(Docker + Cypress) Runbook
- 문서 타입: 런북
- 버전: v1.2
- 작성일: 2026-01-13
- 작성자: 개발팀
- 대상 독자: BE 개발자, FE 개발자, 운영/QA

## 1. 목적
본 문서는 **Docker(MySQL 포함) 환경에서 백엔드 마이그레이션(Alembic)과 어드민 시딩을 완료한 뒤, Cypress E2E로 어드민 FE/BE/DB 전역 동기화(Integrated Verification)를 원커맨드로 검증**하는 절차를 정의한다.

## 2. 범위
- 포함
  - Docker Compose 기반 기동
  - MySQL 준비 대기
  - Alembic 업그레이드(반복 실행에 안전하도록 멱등 동작 전제)
  - 어드민 계정 시딩(`admin/admin1234`) 멱등 생성
  - Cypress E2E 실행(기본: `admin_global_sync`)
  - (확장 계획) 어드민 “메인 대시보드 → 상세 페이지” 탐색/검증
- 제외
  - 전체 Cypress 스위트가 항상 green이 되도록 개별 spec의 시딩/Mock을 완성하는 작업(별도 단계)
  - 운영 서버 배포/롤백 절차(배포 런북을 따른다)

## 3. 핵심 전제(SoT)
- FE 어드민 접근은 테스트 모드 우회를 허용한다.
  - 빌드 시 `VITE_TEST_MODE=true`가 주입되어야 한다.
  - 우회 로직은 프론트 `ProtectedRoute`/`adminAuth` 경로의 `import.meta.env.VITE_TEST_MODE`에 의존한다.
- BE는 테스트 모드를 사용한다.
  - Docker e2e 오버레이에서 `TEST_MODE=true`로 구동되는 것을 전제로 한다.
- 어드민 계정은 다음 고정 값을 사용한다.
  - ID: `admin`
  - PW: `admin1234`
  - 시딩 스크립트: `scripts/seed_admin_v3.py`

## 4. 원커맨드 실행(권장)
프로젝트 루트에서 실행:

```bash
npm run test:e2e:docker
```

이 스크립트는 내부적으로 다음 순서를 오케스트레이션한다.
- 도커 빌드/기동
- 백엔드 헬스/DB 준비 대기
- `alembic upgrade head`
- `python scripts/seed_admin_v3.py` (멱등)
- Cypress 실행

## 5. 빠른 재실행(빌드 스킵)
프론트/백엔드 이미지가 이미 최신이고 “테스트만 재시도”하려면:

```bash
node scripts/run_e2e_docker.mjs --skip-build
```

전체 spec을 함께 재실행하려면:

```bash
node scripts/run_e2e_docker.mjs --skip-build --all-specs
```

## 6. Cypress 단일 spec 실행(로컬/디버깅)
Docker 파이프라인 외에 로컬에서 Cypress만 돌릴 때:

```bash
npm run test:e2e -- --spec cypress/e2e/admin_global_sync.cy.ts
```

## 7. 현재 기준 통과 스펙
- 기본 실행(기본 파이프라인)은 `cypress/e2e/admin_global_sync.cy.ts`를 기준으로 안정화되어 있다.
  - 목적: Ops(캠페인/플랜) 및 Game Tokens(유저 생성→grant→원장/화면 반영) 동기화 검증

### 7.1 현재 진행도 (2026-01-13)
- Docker E2E(`--all-specs`) 기준으로 아래 5개 spec이 green 상태다.
  - `cypress/e2e/admin_global_sync.cy.ts`
  - `cypress/e2e/admin_nav_smoke.cy.ts`
  - `cypress/e2e/admin_page_anchors.cy.ts`
  - `cypress/e2e/survey_prompt.cy.ts`
  - `cypress/e2e/tma_audio.cy.ts`

## 8. 트러블슈팅
### 8.1 Alembic 오류
증상:
- `Duplicate column ...`
- `Table ... already exists`

대응:
- 반복 실행 환경에서 깨지는 revision은 **멱등 처리**가 되어 있어야 한다.
- 현재 상태 확인:

```bash
docker compose exec backend alembic current
```

업그레이드 재시도:

```bash
docker compose exec backend alembic upgrade head
```

### 8.2 Windows에서 Cypress `spawn EINVAL`
증상:
- Cypress 실행 단계에서 `spawn EINVAL`로 즉시 실패

대응:
- Cypress 실행 래퍼 스크립트가 Windows-safe로 동작해야 한다.
- 버전 스모크:

```bash
node scripts/run_cypress.mjs --version
```

### 8.3 어드민 페이지에서 요소 미발견(리다이렉트 의심)
증상:
- `#ops-campaign-select` 등 어드민 UI 요소를 찾지 못함

우선 확인:
- 프론트 빌드에 `VITE_TEST_MODE=true`가 실제로 반영되었는지
- Nginx/프론트가 최신 이미지로 배포되었는지(특히 `--skip-build` 사용 시)

## 9. 다음 단계(테스트 계획: 메인 대시보드 → 상세 페이지 전수 검증)
목표: “어드민 메인 대시보드에서 진입 가능한 모든 상세 페이지가 깨지지 않고 로딩/기본 상호작용이 가능하다”를 E2E로 보증한다.

### 9.1 단계별 확장 전략
1) Phase A (Smoke)
- 대시보드 진입
- 사이드바/상단 네비에서 주요 라우트로 이동
- 각 페이지의 **핵심 앵커 요소 1개** 존재 확인(예: 헤더 타이틀, 주요 테이블/폼)

2) Phase B (Read-only Validation)
- 필터/검색/페이지네이션/탭 전환 등 **읽기 동작** 위주 검증
- 외부 의존(오디오/서베이 등)이 있는 페이지는 “데이터 없음(empty state)”도 정상 UX로 허용

3) Phase C (Write path: 최소)
- 운영 사고 리스크가 낮은 작성 플로우 1~2개만 선정
  - 예: Ops 캠페인 생성 → 목록 반영
  - 예: Game tokens grant → 원장/표시 반영

### 9.2 데이터/시딩 정책(권장)
- spec 내 하드코딩 유저/리소스 의존을 피한다.
- “필수 엔티티”는 테스트 시작 시 API로 생성하고, 생성된 ID를 UI 검증에 사용한다.
- 시간/일자 키가 필요한 경우 시간대를 명시(KST)하고, UI 반영은 폴링/재시도로 안정화한다.

### 9.3 실행 모드 권장
- PR/로컬: `admin_global_sync` + 대시보드 smoke
- Nightly: 전체 spec(단, 개별 spec별 시딩 요구사항이 충족된 경우)

## 10. 변경 이력
- v1.2 (2026-01-13, 개발팀): 어드민 라우트별 앵커 검증 spec(`admin_page_anchors`) 추가 및 진행도(5개) 반영
- v1.1 (2026-01-13, 개발팀): `--all-specs` 실행/현재 통과 스펙(4개) 및 진행도 섹션 추가
- v1.0 (2026-01-13, 개발팀): Docker e2e 파이프라인(Alembic+admin seed+Cypress) 런북 최초 작성
