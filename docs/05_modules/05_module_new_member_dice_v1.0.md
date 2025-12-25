# 신규회원 전용 주사위 게임(판정용) — 기술/디자인 문서

- 문서 타입: 기능(프론트 + 백엔드 + 운영)
- 버전: v1.2
- 작성일: 2025-12-25
- 대상: 운영/백엔드/프론트

## 0. 목적 요약(구현 기준)
신규회원 대상 단일 판정용 주사위 게임. 운영자가 eligibility에 등록한 유저만 1회 플레이 가능하며, 기본 승률은 0%(항상 패배)로 설정되어 있다. 패배 시 Vault 잠금 잔액을 최소 10,000으로 보정해 “임시 금고” 메시지를 보여준다.
-- 메인(홈) 링크 없이 전용 라우트로만 접근.
-- 로그인은 기존 RequireAuth/세션을 그대로 사용.
-- UI는 기존 주사위 애니메이션(주사위 1개씩)을 재사용.
-- WIN 시 메시지: “축하합니다! 에어드랍 이벤트 당첨 🎁” (실제 기본 승률 0%라 노출되지 않음)
-- LOSE 시 메시지: “잭팟은 아쉽게 놓쳤지만, 신규 정착 지원금이 임시 금고에 안전하게 보관되었습니다.”
-- win_link는 상수 `https://ccc-010.com`.

## 1. 결론: 구현된 목적
- 기존 토큰 소비/보상 Dice 게임과 완전히 분리된 “신규회원 판정용” 단일 게임이다.
- 운영자가 eligibility에 올린 유저만 접근/플레이할 수 있으며, 기본 정책은 패배(0% 승률) + Vault 잠금 잔액 보정으로 온보딩 메시지를 전달하는 것이다.

## 2. 설계 요약(구현 결과)
- 토큰/티켓을 소모하지 않는 전용 API.
- USER_WIN_RATE는 0.0으로 설정되어 기본적으로 패배만 발생한다(필요 시 상수 수정으로 승률 조정 가능).
- 1회 제한은 DB unique(NewMemberDiceLog.user_id)로 강제한다.

## 3. UX/디자인 스펙(밝은 크리스마스 톤)
### 3.1 페이지 성격
- 기존 다크톤 게임 페이지 대비 **더 밝고** “크리스마스 느낌”을 강화
- 단, 기존 디자인 시스템(현재 Tailwind 기반 토큰/클래스) 범위 내에서 구현

### 3.2 화면 구성(최소)
1) 상단 안내 배너
- 타이틀 예: “신규회원 이벤트 판정”
- 안내(필수 의미): “확정 아님 · 판정 필요” / “무료 1회”

2) 가운데 주사위 영역
- 기존 애니메이션 컴포넌트 재사용
- 좌: “유저”, 우: “딜러”
- 각 1개 주사위

3) CTA 버튼
- 상태:
  - 기본: “🎲 판정 시작(1회)”
  - 진행중: “굴리는 중...” (버튼 disabled)

4) 결과 영역
- WIN: “선착순 이벤트 당첨”
- WIN CTA: 링크 버튼 “이벤트 확인하기” → https://ccc-010.com
  - LOSE: “잭팟은 아쉽게 놓쳤지만, 신규 정착 지원금이 임시 금고에 안전하게 보관되었습니다.”
- (선택) 하단에 “운영 확인 후 안내됩니다” 같은 보조 문구는 가능하나, 최소 요구는 위 2문구가 핵심

### 3.3 페이지 접근(메인 연결 없음)
- 라우트만 등록하고 홈/메인 카드에서는 링크를 만들지 않는다.
- 예시 경로: `/new-member/dice`

## 4. 기능 요구사항(프론트)
- 로그인 가드: 기존 `RequireAuth`를 그대로 사용(미로그인 시 로그인 페이지로)
- 자격(eligible) 판정: 서버 응답 기준(운영자 등록된 유저만 진입/플레이 허용)
- 1회 제한:
  - 서버에서 “이미 플레이함”을 반환하면 버튼 비활성 + 결과 재표시
- 상태:
  - `isRolling` (애니메이션/로딩)
  - `userRoll`, `dealerRoll`
  - `outcome` (WIN/LOSE)
  - `message` (출구 멘트)
  - `winLink` (응답에 항상 포함, CTA 노출 여부는 정책에 맞춰 제어)

## 5. 기능 요구사항(백엔드, 구현 기준)
### 5.1 API 설계
- `GET /api/new-member-dice/status`
  - 응답: `eligible`, `already_played`, `played_at?`, `last_outcome?`, `last_user_dice?`, `last_dealer_dice?`, `win_link`
- `POST /api/new-member-dice/play`
  - 서버가 자격 확인 → 1회 제한 확인 → 주사위 결과 생성 및 저장 후 반환
  - 응답 예:
    ```json
    {
      "result": "OK",
      "game": {
        "user_dice": [2],
        "dealer_dice": [6],
        "outcome": "LOSE"
      },
      "message": "잭팟은 아쉽게 놓쳤지만, 신규 정착 지원금이 임시 금고에 안전하게 보관되었습니다.",
      "win_link": "https://ccc-010.com"
    }
    ```

#### 5.1.1 자격(eligible) 판정 규칙 — 구현
- `new_member_dice_eligibility` row가 있고 is_eligible=true, revoked_at is null, expires_at이 now보다 미래일 때만 eligible=true.
- 없거나 비활성/만료/회수된 경우: 403 `NEW_MEMBER_DICE_NOT_ELIGIBLE`.
- 이미 플레이 로그가 있으면: 400 `NEW_MEMBER_DICE_ALREADY_PLAYED`.

### 5.2 승률/주사위 생성 규칙(구현)
- USER_WIN_RATE=0.0으로 기본 패배. 필요 시 상수 수정으로 승률 조정 가능.
- WIN: dealer 1~(user-1), user 2~6로 강제(동점 없음), 메시지 "축하합니다! 에어드랍 이벤트 당첨 🎁" 반환.
- LOSE: user 1~(dealer-1), dealer 2~6로 강제, 메시지 "잭팟은 아쉽게 놓쳤지만...임시 금고" 반환.

### 5.3 1회 제한(무료 1회)
- `user_id` 기준으로 1회만 허용. NewMemberDiceLog.user_id UNIQUE로 DB에서 강제.
- 재호출 시 400 `NEW_MEMBER_DICE_ALREADY_PLAYED`.

### 5.4 데이터 저장(감사/운영 대응)
- `new_member_dice_log`: user_id UNIQUE, campaign_key(optional), user_roll, dealer_roll, outcome, win_link, created_at.
- `new_member_dice_eligibility`: user_id UNIQUE, is_eligible, campaign_key(optional), expires_at(optional), revoked_at(optional), created_by_admin_user_id(optional).
- 로그/자격은 Alembic 마이그레이션 `20251216_0003_new_member_dice_tables`/`0022_merge...`로 추가되어 있다.

### 5.5 Vault 연동(패배 시 잠금 보정)
- LOSE 시 User.vault_locked_balance를 최소 10,000으로 보정하고, VaultService._ensure_locked_expiry + legacy mirror sync를 호출한다.
- delta가 추가될 때 Vault2Service.accrue_locked로 회계 이중 기록을 남기며, 실패해도 게임 흐름은 계속된다.

## 6. 운영 시나리오(권장)
- 운영자가 eligibility에 대상자 등록 후 `/new-member/dice` 링크 제공.
- 사용자는 로그인 후 1회 플레이(실패 시 Vault 잠금 안내 메시지 확인).
- 운영자는 로그에서 outcome/캠페인키를 확인해 후속 온보딩을 진행.

## 7. 보안/악용 방지(최소)
- 결과는 서버에서 생성하며 USER_WIN_RATE 상수로 제어한다.
- 1회 제한은 DB UNIQUE로 강제.
- eligibility 만료/회수(expires_at, revoked_at) 확인.
- 요청 빈도 제한(라우터 throttling 또는 WAF) 권장.

## 8. 구현 체크리스트(개발)
- 프론트: 주사위 1개 UI 재사용, status/play 훅, eligible/already_played 상태 처리, 결과 메시지/roll 표시, win_link CTA.
- 백엔드: eligibility 관리(Admin 라우터 포함), Vault 잠금 보정 로직, USER_WIN_RATE 조정 가능 여부 테스트, 1회 제한/자격 예외 테스트.

## 9. 오픈 질문(결정 필요)
1) “신규회원” 자격은 어떻게 판정할까?
- 결정: C) 운영자가 대상자만 “eligible”로 등록

2) 승리(WIN) 시 “이벤트 연결”은 어디로?
- 결정: https://ccc-010.com

3) 결과 문구는 정확히 고정 문구인가, 약간의 보조 문구를 허용하는가?
- 최소 요구는 고정 2문구만 준수
