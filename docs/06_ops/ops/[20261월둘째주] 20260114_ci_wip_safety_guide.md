# [20261월둘째주] CI 배포 중 WIP 변경 안전 가이드 (터널링/마이그레이션/환경값)

- 문서 타입: 운영 (Runbook)
- 버전: v1.0
- 작성일: 2026-01-14
- 대상 독자: 개발/운영(온콜) / 릴리즈 담당

## TL;DR (5줄)
- 지금은 **CI 배포 중이므로 원격 푸시/서버 반영 금지**(테스트/정리 완료 전).
- 기준 브랜치(예: `origin/temp-merge2`)는 **깨끗하게 유지**하고, 작업은 로컬 통합 브랜치에서만 진행.
- 변경 유실 방지 1순위: **스냅샷(패치/번들/백업 브랜치)** 먼저 만든 뒤 정리.
- 변경은 최소 4덩어리로 분리: **migrations / infra / backend / frontend**.
- 최종 반영은 **검증된 커밋만 cherry-pick**으로 선별(merge 금지).

## 1) 목적
- 터널링/환경값/대규모 마이그레이션이 얽힌 상황에서, 변경을 잃지 않고(유실 방지) 정리/검증 후 안전하게 반영하는 절차를 고정한다.

## 2) 범위
- 로컬 작업 디렉토리에서의 안전한 보관/정리/검증/선별 반영 프로세스.
- 아래 항목은 본 문서 범위 밖(별도 문서/런북 참조):
  - 실제 서버 프로비저닝/CI 파이프라인 구성 상세
  - 기능 요구사항/정책 변경(SoT는 `docs/` 별도 문서)

## 3) 절대 규칙 (반드시 지키기)
1. **원격 푸시 금지**: 테스트/정리 완료 전에는 `git push`/서버 배포 작업을 하지 않는다.
2. **릴리즈 라인 깨끗 유지**: 기준 브랜치(예: `temp-merge2`)에 작업 커밋/스냅샷 커밋을 섞지 않는다.
3. **로컬 커밋 누적 금지(서버)**: 서버에서 로컬 커밋 쌓지 말고 `ff-only`로만 동기화한다.
4. **SoT 준수**: 경제 SoT(예: Vault SoT는 `user.vault_locked_balance`) 및 운영 전제(Real IP, Rate Limit, Fail-Open)는 문서/규칙을 우선한다.

## 4) 현 상태 체크 (작업 시작 전)
- 현재 브랜치/커밋 확인:
  - `git rev-parse --abbrev-ref HEAD`
  - `git rev-parse --short HEAD`
- 변경 개수/범위 확인:
  - `git status --porcelain`
  - `git diff --name-only | Select-Object -First 50`
- 스태시 확인:
  - `git stash list`

## 5) 스냅샷 만들기 (유실 방지)
> 아래 스냅샷은 **로컬에서만** 생성한다.

### 5.1 백업 브랜치 생성
- 목적: 현재 HEAD 기준점을 이름으로 고정
- 예시:
  - `git branch backup/wip-20260114`

### 5.2 워킹트리 패치 저장 (가장 강력한 안전장치)
- 목적: 커밋/스태시 꼬여도 복구 가능한 단일 파일 확보
- 예시:
  - `mkdir -Force tmp/wip-snapshots/20260114`
  - `git diff > tmp/wip-snapshots/20260114/worktree.patch`
  - `git diff --stat > tmp/wip-snapshots/20260114/diffstat.txt`
  - `git status --porcelain > tmp/wip-snapshots/20260114/status.txt`

### 5.3 (선택) git bundle 생성
- 목적: 원격이 불안정하거나, 브랜치/리베이스 실수 대비용
- 예시:
  - `git bundle create tmp/wip-snapshots/20260114/repo_temp-merge2.bundle temp-merge2`

## 6) 1차 정리: 4덩어리로 분리 (migrations/infra/backend/frontend)
> 목표: 워킹트리를 깨끗하게 만든 다음, 덩어리별로 다시 적용/커밋/검증한다.

### 6.1 권장 분류 기준(경로)
- migrations: `alembic/versions/**` (필요 시 `alembic.ini`)
- infra: `docker-compose*.yml`, `Dockerfile.*`, `nginx/**`, 배포 스크립트/런북
- backend: `app/**`, `requirements.txt`, `pytest.ini` 등
- frontend: `src/**`, `package.json`, `vite.config.ts`, `tailwind.config.js` 등

### 6.2 스태시로 분리(로컬)
- 예시(경로 기반, untracked 포함):
  - migrations:
    - `git stash push -u -m "wip/20260114-migrations" -- alembic/versions alembic.ini`
  - infra:
    - `git stash push -u -m "wip/20260114-infra" -- docker-compose.yml docker-compose.local.yml docker-compose.e2e.yml Dockerfile.backend Dockerfile.frontend nginx`
  - backend:
    - `git stash push -u -m "wip/20260114-backend" -- app requirements.txt pytest.ini scripts`
  - frontend:
    - `git stash push -u -m "wip/20260114-frontend" -- src package.json package-lock.json vite.config.ts tsconfig.json tsconfig.node.json tailwind.config.js postcss.config.js eslint.config.js public index.html cypress.config.ts cypress`

## 7) 검증 루틴 (덩어리별)
- migrations:
  - `alembic heads`가 1개인지 확인(다중 head면 merge revision 필요)
  - `alembic current` → `alembic upgrade head`
- backend:
  - 핵심 회귀: `pytest -q tests/test_streak_event_spec_midnight.py`
- frontend:
  - `npm run build`

## 8) 최종 반영(선별)
- 기준 브랜치로는 merge 대신 **검증된 커밋만 cherry-pick**.
- 운영 서버에서는 항상 `ff-only`로 동기화해서 재현/롤백 가능성을 유지.

## 9) 롤백/복구
- 워킹트리 패치로 복구:
  - `git apply --reject --whitespace=fix tmp/wip-snapshots/20260114/worktree.patch`
- bundle 복구(필요 시):
  - `git clone repo_temp-merge2.bundle <dir>` 또는 `git fetch repo_temp-merge2.bundle <ref>`

## 변경 이력
- v1.0 (2026-01-14)
  - 최초 작성: CI 배포 중 WIP 안전 정리 절차
