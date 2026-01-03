# 진행 체크리스트: 어드민 회원 식별/필드 표준화 개편

기준 문서: [admin_user_identity_crud_refactor_spec_20260103.md](admin_user_identity_crud_refactor_spec_20260103.md)

작성일: 2026-01-03

> 사용법
> - 각 항목은 “완료 기준(Definition of Done)”을 충족하면 체크
> - PR/커밋/테스트 로그 등 증빙 링크를 함께 기록

---

## A. 정책/표준 확정(설계 고정)

- [x] A1. 본사 고유 닉네임 source-of-truth = `user.nickname` 확정(문서 반영)
  - 완료 기준: 기준 문서에 “결정 사항”으로 명시됨
  - 증빙: `docs/admin/admin_user_identity_crud_refactor_spec_20260103.md`

- [x] A2. 중복 매칭(닉네임/텔레유저네임 등) 발생 시 항상 409 차단 정책 확정
  - 완료 기준: Resolver 규칙/에러 코드 정책이 문서에 명시됨
  - 증빙: `docs/admin/admin_user_identity_crud_refactor_spec_20260103.md`

---

## B. 백엔드 공통 Resolver/API 계약

- [x] B1. `AdminUserSummary` 스키마 정의(공통 응답 모델)
  - 포함 필드: `tg_id`, `tg_username`, `real_name`, `phone_number`, `nickname` (+ id/external_id/tags/memo)
  - 완료 기준: `app/schemas/*`에 모델 추가 및 타입/응답 일관성 확인
  - 증빙: `app/schemas/admin_user_summary.py`

- [x] B2. tg_id 산출 규칙 구현(단일 함수)
  - 우선순위: `user.telegram_id` → `admin_profile.telegram_id` parse → `external_id`에서 `tg_{id}_...` parse
  - 완료 기준: 단위 테스트로 3케이스 모두 통과
  - 증빙: `app/services/admin_user_identity_service.py`, `tests/test_admin_user_resolve.py`

- [x] B3. Resolver 구현(식별자 → user_id)
  - 지원 입력: `user_id`, `tg_id`, `@username/username`, `nickname`, `external_id`, `tg_{id}_{suffix}`
  - 완료 기준: 모호성 409 / 미존재 404 / 정상 200
  - 증빙: `app/services/admin_user_identity_service.py`, `tests/test_admin_user_resolve.py`

- [x] B4. `GET /admin/api/users/resolve?identifier=...` 추가
  - 완료 기준: API 테스트 통과 + Swagger 확인
  - 증빙: `tests/test_admin_user_resolve.py`

---

## C. 사용자-연관 모듈 적용(백엔드)

> 목표: “user를 받는 CRUD는 모두 `user_identifier`를 지원하고, 응답에 user summary를 포함”

- [x] C1. 회원관리(`/admin/api/users`)
  - [x] C1-1. list/search 응답에 user summary 표준 적용
  - [x] C1-2. update/create에서 `telegram_id`, `telegram_username`, `admin_profile(real_name/phone_number)` 정합성 유지
  - 완료 기준: 기존 기능 회귀 없음 + 검색(q) 정상
  - 증빙: `python -m pytest -q` (119 passed)

- [x] C2. 외부랭킹(`/admin/api/external-ranking`)
  - [x] C2-1. identifier 기반 CRUD가 409 정책과 일치(중복이면 항상 409)
  - [x] C2-2. 가능하면 응답에 user summary 포함
  - 완료 기준: API 테스트 통과
  - 증빙: `python -m pytest -q` (119 passed)

- [x] C3. 게임 토큰(`/admin/api/game-tokens`)
  - [x] C3-1. 지급/회수/조정 요청에 `user_identifier` 지원
  - [x] C3-2. 로그/조회 응답에 user summary 포함
  - 완료 기준: API 테스트 1~2개 추가 및 통과
  - 증빙: `tests/test_admin_user_resolve.py`, `python -m pytest -q` (119 passed)

- [x] C4. 인벤토리/티켓(`/admin/api/inventory`)
  - [x] C4-1. 사용자 대상 작업에 `user_identifier` 지원
  - [x] C4-2. 조회 응답에 user summary 포함
  - 완료 기준: API 테스트 통과
  - 증빙: `tests/test_admin_user_resolve.py`, `python -m pytest -q` (119 passed)

- [x] C5. 미션(`/admin/api/user-missions`)
  - [x] C5-1. 사용자 선택/수정 흐름에 `user_identifier` 지원
  - 완료 기준: API 테스트 통과
  - 증빙: `python -m pytest -q` (119 passed)

- [x] C6. Vault 운영(`/admin/api/vault*`)
  - [x] C6-1. 사용자 대상 작업에 `user_identifier` 지원
  - 완료 기준: API 테스트 통과
  - 증빙: `python -m pytest -q` (119 passed)

- [x] C7. CRM/세그먼트(`/admin/api/crm`, `/admin/api/segments`)
  - [x] C7-1. 대상 사용자 표시/선택에 user summary 적용
  - 완료 기준: 회귀 테스트 통과
  - 증빙: `tests/test_admin_segments_identifier.py`, `python -m pytest -q` (119 passed)

- [x] C8. 팀배틀(`/admin/api/team-battle`)
  - [x] C8-1. 리더보드/멤버 목록에서 user summary 표시(가능 범위)
  - 완료 기준: 응답/프론트 표시 확인
  - 증빙: `tests/test_team_battle_api.py`, `python -m pytest -q` (119 passed)

---

## D. 프론트 공통 컴포넌트/UX 표준

- [x] D1. 공통 UserSummary 타입 정의(프론트)
  - 완료 기준: `src/admin` 전역에서 재사용
  - 증빙: `npm run build` (2026-01-03)

- [x] D2. 공통 “식별자 입력 → Resolve → 확정” UI 컴포넌트 추가
  - 요구: 모호성(409) 발생 시 후보 선택 대신 “재입력 유도”(정책상 차단)
  - 완료 기준: 최소 1개 페이지에 적용 후 재사용 가능 상태
  - 증빙: `npm run build` (2026-01-03)

- [x] D3. 표준 컬럼 표시 규칙 적용
  - 컬럼: `TG ID / Username`, `실명/연락처`, `닉네임`
  - 완료 기준: 사용자 관련 테이블/리스트에서 동일한 표시 패턴
  - 증빙: `npm run build` (2026-01-03), 적용 현황 리스트 참조

  적용 현황(프론트)
  - [x] UserSegments: 사용자 테이블 D3 컬럼 적용(PII는 API 부재로 `-`)
  - [x] TeamBattle: contributors 테이블 D3 컬럼 적용(PII는 `-`)
  - [x] UserAdmin: TG username 표기 규칙 정리(`@` 중복 방지, 없으면 `-`)
  - [x] GameTokenLogs: 지갑/플레이로그/원장/요약 테이블 D3 컬럼 적용
  - [x] ExternalRanking: 입력 테이블 D3 컬럼 적용(Identifier 입력 + resolve 결과를 D3 3컬럼으로 분리)

- [x] D4. 적용 우선순위 페이지 3개 완료
  - 대상: 외부랭킹, 토큰지급, 인벤토리(또는 티켓)
  - 완료 기준: 각 페이지에서 identifier 입력으로 동일한 user 확정 후 CRUD 동작
  - 증빙: `npm run build` (2026-01-03)

- [x] D5. Admin production build 통과
  - 완료 기준: `npm run build` 성공
  - 증빙: `npm run build` (2026-01-03)

---

## E. 데이터 정합성(마이그레이션/백필)

- [x] E1. backfill 스크립트 작성
  - 내용: `external_id=tg_{id}_...`인데 `user.telegram_id` NULL이면 채우기
  - 완료 기준: dry-run/실행 모드 제공 + 로깅
  - 증빙: `scripts/backfill_set_telegram_id_from_external_id.py`

- [x] E2. 운영 적용 계획(시간대/롤백)
  - 완료 기준: 실행 명령/소요/리스크/롤백 문서화
  - 증빙: `docs/admin/admin_user_identity_backfill_plan_20260103.md`

---

## F. 테스트/품질/모니터링

- [x] F1. Resolver 단위 테스트 세트 완비
  - 케이스: 숫자 우선순위, tg_ 파싱, @username case-insensitive, nickname 중복=409
  - 완료 기준: `pytest` 통과
  - 증빙: `tests/test_admin_user_resolve.py`, `python -m pytest -q` (119 passed)

- [x] F2. 모듈별 API 회귀 테스트(대표 3~5개)
  - 완료 기준: `pytest` 전체 통과
  - 증빙: `python -m pytest -q` (119 passed)

- [x] F3. 모니터링 지표 정의
  - 409(AMBIGUOUS_IDENTIFIER) 빈도, 404(RESOLVE_NOT_FOUND) 빈도
  - 완료 기준: 로그/대시보드/알림 중 최소 1개 연결
  - 증빙: `docs/admin/admin_user_identity_monitoring_20260103.md`

---

## G. 릴리즈/운영 체크

- [x] G1. 단계적 롤아웃(백엔드 → 프론트)
  - 완료 기준: 기존 `user_id` 기반 요청이 계속 동작(하위 호환)
  - 증빙: `docs/admin/admin_user_identity_rollout_plan_20260103.md`

- [x] G2. 운영자 가이드 업데이트
  - 완료 기준: 어드민 가이드에 “식별자 입력 규칙/중복 시 409 처리” 반영
  - 증빙: `docs/admin/admin_user_guide.md`

---

## 진행 기록(선택)

- 착수일:
- 목표 완료일:
- 담당자:
- 관련 PR 목록:
- 장애/이슈 기록:

### 진행 메모 (2026-01-03)
- 우선순위 3페이지(외부랭킹/토큰/인벤토리) identifier 기반 UX 적용
- 외부랭킹: 저장 전 resolve 프리뷰(409/404 포함)로 검증 후 저장
- 세그먼트(UserSegments): identifier 검색 + resolve 프리뷰 적용
- 팀배틀: 강제 팀 배정 + 팀 생성(리더 선택) identifier→resolve 프리뷰 적용
- 빌드/테스트: `pytest -q` 통과, `npm run build` 통과

### 진행 메모 (2026-01-03 추가)
- D3 표준 컬럼( `TG ID / Username`, `실명/연락처`, `닉네임` )을 GameTokenLogs/ExternalRanking 포함 주요 화면에 확산 적용
- 프론트 빌드 재검증: `npm run build` 통과(청크 경고만)
- 백엔드 응답 표준화(C2-2/C3-2/C4-2): `pytest -q` 통과

### 진행 메모 (2026-01-03 추가 2)
- 회원관리(C1) / 미션(C5) / Vault(C6) 식별자 지원 확장 + 회귀 테스트 재검증: `python -m pytest -q` (119 passed)
- 데이터 백필(E1) 스크립트 추가: `scripts/backfill_set_telegram_id_from_external_id.py` (dry-run 기본)

### 진행 메모 (2026-01-03 추가 3)
- 전역 예외 핸들러 응답에서 `detail` 하위호환 복구(테스트 기대 충족) + 회귀 테스트 재검증: `python -m pytest -q` (119 passed)
