# 2026-01-02 개발 로그: 웰컴(NEW_USER) 모달 정책 B 전환 + 인증 꼬임(로그인 페이지 노출) 완화

## 배경(왜 했나)
- “신규회원 전용 웰컴 모달 이벤트”가 실제로는 자주 **팝업이 뜨지 않음**.
- 원인 축(실제 코드 기준):
  1) 백엔드 `/api/new-user/status`가 Telegram 미연동/24h window 만료/입금 이력 등에 따라 `eligible=false`로 떨어질 수 있음
  2) 프론트 `NewUserWelcomeModal`이 `eligible=false`면 `return null`로 **렌더 자체를 차단**
  3) `/api/auth/token` 로그인 경로에서 `first_login_at`이 세팅되지 않아, 신규 window 계산이 `created_at`에 묶여 **의도치 않게 만료되는 케이스**가 존재

또한 사용자 요구사항이 “신규 회원만”에서 아래로 확정됨:
- **정책 B**: 전 유저에게도 열기
- **4개 미션 완료 전까지 계속 뜨게**(영구 숨김/다시 보지 않기 제거)
- 텔레그램 온리 정책 전환 이후 **인증 꼬임으로 /login 화면이 노출되는 현상**이 있으면 방지

---

## 이번 변경(무엇을 했나)

### 1) Auth: 첫 로그인 시 `first_login_at` 보장
- 변경 파일: `app/api/routes/auth.py`
- `/api/auth/token`에서 첫 로그인으로 판단되는 경우(`first_login_at is None and last_login_at is None`)에 `first_login_at`을 세팅.
- 효과: “신규 유저 24h window”의 기준을 `created_at`이 아니라 **실제 첫 로그인 시점**으로 안정화.

### 2) Backend: `/api/new-user/status` 대상자 필터(eligible gating) 제거
- 변경 파일: `app/api/routes/new_user_onboarding.py`
- 기존에는 Telegram 미연동/만료/입금이력 등으로 `eligible=false`가 되어 프론트가 모달을 숨길 수 있었음.
- 정책 B 반영으로 `eligible=True`를 고정하여 **전 유저에게 status/미션을 제공**.
  - 단, `existing_member_by_external_deposit` 및 `reason=EXTERNAL_DEPOSIT_HISTORY` 등 관측 정보는 유지.

### 3) Frontend: 웰컴 모달은 “4개 미션 완료”로만 숨김
- 변경 파일: `src/components/modal/NewUserWelcomeModal.tsx`
- `eligible=false`일 때 숨기던 로직 제거.
- 요구사항 반영: **첫 4개 미션을 모두 완료할 때까지 모달을 유지**
  - `requiredMissions = missions.slice(0, 4)` 기준으로 모두 완료 시 `return null`.
- “계속 뜨게” 정책과 충돌하는 영구 숨김 기능 제거(아래 훅 변경 포함).
- 운영 안정성:
  - status refetch 중 모달이 사라지지 않도록 `useRef`로 마지막 데이터를 유지
  - 데이터 로딩 중엔 로딩 셸을 보여주고, NEW_USER 미션이 0개면 “미션 준비중” 상태를 노출

### 4) Frontend: “다시 보지 않기/영구 숨김” 제거 및 항상 노출
- 변경 파일: `src/hooks/useNewUserWelcome.ts`
- localStorage 기반 숨김 로직 제거.
- Landing/Home 진입 시 타이머 후 모달을 띄우되, **완료 판정은 모달 내부에서 처리**하도록 단순화.

### 5) Routing/Auth Guard: 운영에서 /login으로 새는 경로 최소화
- 변경 파일: `src/components/routing/RequireAuth.tsx`
- `allowNonTelegramLogin`을 `import.meta.env.DEV`로 제한하여 **운영에서는 Telegram initData 없는 경우 /login으로 리다이렉트하지 않도록** 완화.
- 과거 `/new-user/welcome` 리다이렉트는 제거(이제 랜딩에서 모달로 처리).

---

## 테스트/검증
- `pytest -q`: **91 passed**
- 업데이트된 시나리오 테스트(대표):
  - `tests/test_auth_token.py`: 토큰 발급 후 `first_login_at` 세팅 검증
  - `tests/test_tma_onboarding_linking_scenario.py`: deposit 이력이 있어도 `/api/new-user/status`는 `eligible=True` 기대

---

## 남은 확인(운영/실기기)
- Telegram initData가 없는 접근(외부 브라우저/임베드 실패 등)에서 “/login 페이지가 뜨는 현상”이 재현되는지 확인
- 운영에서 NEW_USER 미션이 실제로 4개 존재하고, 정렬/순서가 기대와 일치하는지 확인
  - 현재 완료 판정은 `missions.slice(0, 4)`(리스트 순서 기반)으로 동작
