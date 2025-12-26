# 개발 로그 (2025-12-21)

## 오늘의 목표
- `/team-battle`를 Figma UI 플로우로 복구하면서도 실제 기능(미스터리 팀 배정/데이터 표시)이 동작하도록 정리.
- 사용자가 수정한 가이드 페이지 텍스트가 배포 후에도 **항상 최신으로 반영**되도록(특히 캐시/SPA shell 이슈) 안정화.
- 팀 배틀 데이터 검증: “산타팀 4명” 등 DB 기준 실제 데이터 확인.

---

## 완료한 작업 요약

### 1) Team Battle: Figma UI 복구 + 미스터리 팀 배정(실제 API 연결)
- `/team-battle` 라우트를 TeamBattle Figma 스타일 페이지로 연결.
- “팀이 없는 상태”에서 사용자가 바로 참여할 수 있도록 **미스터리 팀 배정** 패널을 추가.
- 시즌 시작 시각 기준으로 **시즌 시작 후 24시간 내**에만 배정이 가능하도록(join window) UI/버튼 제한 로직을 적용.
- 배정 성공 시 `getMyTeam` / 리더보드 데이터가 즉시 갱신되도록 refetch 처리.

### 2) 팀 배틀 DB 검증 (로컬 DB 기준)
- MySQL DB(`xmas_event_dev`) 내 팀 배틀 테이블을 직접 조회하여 팀 구성/인원 수 확인.
- 확인 결과(당시 조회 기준):
  - Santa Team: 멤버 수 4
  - Rudolph Team: 멤버 수 4
- UI에서 팀이 여러 개 보이는 현상은 “현재 활성으로 남아있는 기존 팀 데이터가 추가로 존재”하기 때문으로 확인.

### 3) GuidePage: 수정 텍스트가 배포 후 안 바뀌는 문제 해결(캐시/SPA shell)
- 증상
  - `GuidePage.tsx`를 수정하고 빌드/재기동했는데, 브라우저에서 이전 텍스트가 계속 보이는 현상.
  - 원인 후보: 정적 자산 캐시 / 특히 SPA entry(`index.html`) 캐시로 인해 **이전 번들의 해시**를 계속 참조.

- 해결
  - 프론트 정적 서빙 Nginx 설정에서 **SPA shell에 대해 캐시를 끔**:
    - `location = /index.html` 및 `location /`에 `Cache-Control: no-store/no-cache`, `Pragma: no-cache` 적용.
    - 해시가 붙은 정적 자산(`.js/.css`)은 기존대로 장기 캐시(`immutable`) 유지.

- 배포/반영 확인(운영 관점)
  - `curl -I http://localhost:3000/`로 캐시 헤더가 실제로 적용되는지 확인.
  - `index.html`이 참조하는 번들 해시가 갱신되는지 확인.
  - 실제로 서빙 중인 JS 번들을 내려받아(예: `/assets/index-xxxx.js`) 가이드 문자열이 포함되는지 검색하여 “배포된 번들에 최신 문자열이 들어있음”을 확인.

---

## 변경/영향 범위(대화 기반 정리)
> 아래는 오늘 작업에서 관찰/수정된 영역을 대화 흐름 기준으로 정리한 것입니다.

- 프론트 라우팅
  - `/team-battle` → Figma Team Battle 페이지로 연결

- Team Battle Figma 페이지
  - 미스터리 팀 배정 버튼/패널 추가
  - 시즌 시작 후 24시간 참여창(join window) 계산/노출
  - 배정 성공 시 내 팀/리더보드 refetch

- 프론트 정적 서빙(Nginx)
  - `index.html` 및 SPA 라우팅 응답에 대해 no-cache/no-store 적용
  - 해시 정적 자산은 immutable 캐시 유지

---

## 실행/검증 메모(재현 가능한 형태)

### 프론트 반영이 애매할 때(도커 빌드 캐시 강제 무시)
- 프론트 이미지를 강제로 새로 빌드:
  - `docker compose build --no-cache frontend`
- 컨테이너 재기동:
  - `docker compose up -d --force-recreate frontend`

### 캐시 헤더 확인
- `curl -I http://localhost:3000/ | findstr /i "cache-control pragma expires"`

### 실제 번들에 가이드 문구가 들어갔는지 확인
- `/assets/index-*.js` 파일을 내려받아 문자열 검색(예: “CC카지노 이벤트” 등)

---

### 4) 티켓 제로(게임 토큰 0) 락아웃 제거: 해결 경로 패널 + 어드민 즉시 반영
- 목표
  - “티켓 0이면 플레이 불가” 락아웃 UX를 제거하고, 부족 상태에서 유저가 즉시 행동할 수 있는 해결 경로(CTA)를 제공.
  - 운영(어드민)이 문구/CTA를 매일 바꿔도 유저 화면에 빠르게 반영되도록 구성.

- Backend
  - DB 기반 UI 설정 저장소 `app_ui_config` 도입(keyed JSON).
  - Public API: `GET /api/ui-config/{key}` (유저 화면에서 읽기)
  - Admin API: `GET/PUT /admin/api/ui-config/{key}` (어드민에서 편집)
  - 어드민 라우터 전역 인증을 정리하고, 인증 의존성 버그를 수정해 `/admin/api/*` 보호가 일관되도록 보강.

- Frontend
  - 토큰 부족 시 안내/해결 패널 `TicketZeroPanel`로 통일:
    - 문구/CTA는 `ticket_zero` UI-config를 읽어 표시
    - CTA 2개(Primary/Secondary) 지원 + 레거시 필드 호환
    - “체험 티켓 1장 받기” 액션 제공(서버 멱등)
    - 금고 프리뷰(보유 금액) 노출
  - 앱 진입 1회(일 1회, KST 기준) 자동 체험지급 트리거(로컬 스토리지 키로 중복 방지)
  - 룰렛/주사위/복권 페이지에서 `token_balance <= 0`이면 패널이 뜨도록 연동

- 운영/즉시반영 포인트
  - 유저 화면은 `ui-config`를 staleTime 최소화로 조회 → 새 문구는 다음 조회/진입에서 즉시 반영.

---

### 5) 도커 환경 반영 이슈: DB_SCHEMA_MISMATCH 해결(마이그레이션 누락)
- 증상
  - 도커에서 최신 UI/백엔드 기능이 “반영 안 되는 것처럼” 보이고, `GET /api/ui-config/ticket_zero`가 실패.
  - 응답 에러 코드: `DB_SCHEMA_MISMATCH`

- 원인
  - 이미지 재빌드만 수행하고 DB 마이그레이션(`alembic upgrade head`)이 적용되지 않아, 신규 테이블/컬럼이 누락된 상태.

- 해결
  - 백엔드 컨테이너에서 `alembic upgrade head` 실행하여 스키마 동기화.

- 검증
  - `GET http://localhost:8000/api/ui-config/ticket_zero` → 200
  - `GET http://localhost/api/ui-config/ticket_zero`(nginx 경유) → 200
  - 유저 status API에서 `token_balance=0` 확인 후 패널 노출 조건이 성립함을 확인.

---

### 6) Vault Phase 1: locked 단일 기준 전환 + external_ranking 책임 분리
- 목표
  - Phase 1 원칙을 코드/DB에 반영:
    - 계산 기준은 `user.vault_locked_balance` 단일 기준
    - `user.vault_balance`는 legacy read-only mirror(UI/호환용)
    - external_ranking은 “입금 증가 신호”만 제공, unlock 계산/지급은 `VaultService`로 일원화

- DB / Migration
  - Alembic 마이그레이션 추가:
    - `20251221_0026_add_vault_phase1_locked_columns.py`
      - `user.vault_locked_balance`, `user.vault_available_balance`, `user.vault_locked_expires_at` 컬럼 추가
      - 기존 `vault_balance` → `vault_locked_balance` 백필
      - `vault_balance`를 locked mirror로 동기화

- Backend
  - `VaultService`가 locked 기준으로 seed/fill 처리 및 legacy mirror 동기화(`sync_legacy_mirror`)를 단일 책임으로 보장
  - `AdminExternalRankingService`에서 unlock 계산/지급 제거 → deposit 증가 감지 후 `VaultService.handle_deposit_increase_signal()` 호출로 책임 이동
  - `NewMemberDiceService`에서 신규 정착 seed를 locked에 적립하고 mirror 동기화

- Tests / E2E
  - `tests/test_external_ranking_vault_unlock.py`를 Phase 1 locked+mirror 기준으로 업데이트
  - `scripts/e2e_vault_unlock_from_external_ranking.ps1`를 `vault_locked_balance` 기준으로 seed/검증하도록 업데이트

- 문서
  - Phase 1 백엔드 체크리스트 문서 추가 및 완료 체크 반영:
    - `docs/05_modules/05_module_vault_phase1_backend_checklist.md`

---

### 7) 도커 전체 최신 재빌드 + 마이그레이션 적용
- 수행
  - `docker compose pull db redis nginx`
  - `docker compose build --no-cache backend frontend`
  - `docker compose up -d --force-recreate`
  - `docker compose exec -T backend alembic upgrade head`

- 결과
  - 컨테이너 재기동 및 healthcheck 정상
  - Alembic 업그레이드 로그 확인:
    - `20251221_0024 -> 20251221_0025` (Vault 2.0 scaffold)
    - `20251221_0025 -> 20251221_0026` (Vault Phase 1 user columns)

---

## 남은 이슈/다음 작업 후보
- (선택) 팀 배틀에서 “의도한 팀만 보이게” 하려면 기존 팀 데이터 정리(비활성화) 정책을 확정해야 함.
- (선택) GuidePage 콘텐츠가 잦게 바뀐다면, 운영 배포 플로우에서 `frontend` 빌드 캐시 정책/CI 캐시 정책을 한 번 더 점검 필요.
- (선택) 티켓 0 패널 운영을 위해 `admin/ui-config` 화면에서 일일 문구 교체 루틴을 운영에 반영.
- (다음) Vault Phase 1 후속: `vault_locked_expires_at` 기반 24h 상태머신(locked→available→expired) “행동 변경” 적용 전, 백필/운영 데이터 점검 및 모니터링 포인트 확정.
- (다음) 프론트 호환: status 응답은 계속 `vault_balance`(mirror=locked)로 제공하되, Phase 1 UI에서 locked/available 분리 노출 시 API 스키마 확장 필요.

---

## 오늘 결론
- Team Battle: Figma UI 플로우로 복구하면서도 실제 “미스터리 팀 배정”이 동작하도록 연결 완료.
- GuidePage: 배포 후 텍스트가 안 바뀌는 문제는 SPA shell 캐시가 핵심이었고, `index.html` 캐시를 끄는 방식으로 안정화.
- Vault Phase 1: locked 단일 기준 전환(서비스 책임 재배치 포함) 및 신규 컬럼 마이그레이션까지 적용 완료.
- 도커: 전체 재빌드 + `alembic upgrade head`로 스키마/이미지 정합성 확보.
