# 신규회원 유입 퍼널 개선 + 분석 대시보드 상세 설계서

작성일: 2025-12-17

## 0. 요약
본 문서는 **홈(Home) 온보딩 강화(간단 튜토리얼/가이드)**, **티켓 부족 시 금고(충전) 유도 UX 개선**, **모바일 터치/레이아웃 최적화**, **어드민 퍼널 대시보드(실시간 모니터링)**를 구현하기 위한 상세 기술 설계서입니다.

핵심은 “신규 유저가 로그인 후 무엇을 해야 하는지 즉시 이해”하고, “티켓이 없어서 막히는 구간을 자연스럽게 금고/충전 안내로 전환”하며, “운영자가 퍼널을 수치로 상시 확인”할 수 있게 하는 것입니다.

---

## 1. 배경 / 문제 정의
### 1.1 관측된 문제
- 온보딩 부족: 로그인 직후 홈에서 게임 카드만 보이며, 초보자는 다음 액션(첫 플레이/티켓 확보)을 이해하기 어렵습니다.
- 티켓 장벽: 게임 카드가 티켓이 없으면 비활성화되고, 문의(사람) 프로세스에 의존하는 흐름이 발생합니다.
- 모바일 최적화 부족: 버튼 터치 영역/텍스트 밀도가 데스크톱 중심으로 보일 수 있어 이탈 요인이 됩니다.
- 퍼널 모니터링 부재: 신규 유입/전환을 운영이 실시간으로 확인할 수 있는 대시보드/API가 없습니다.

### 1.2 데이터 해석 주의
로컬 DB/테스트 데이터는 운영과 달라 퍼널 수치(예: 첫 플레이)가 왜곡될 수 있습니다. 본 설계는 **운영 데이터/계측 기반으로 판단**하도록, 서버 측 집계 API 및 이벤트 계측을 포함합니다.

---

## 2. 목표 / 비목표
### 2.1 목표(Goals)
1) 홈 온보딩 모달로 “첫 액션”을 안내한다.
2) 티켓이 없을 때에도 막히지 않고, 금고(충전) 안내로 자연스럽게 이동한다.
3) 모바일에서 버튼 터치/레이아웃이 안정적이다.
4) 어드민에서 신규 퍼널을 실시간(폴링)으로 확인한다.
5) 퍼널의 ‘매력/귀찮음’을 최소한의 이벤트 계측으로 정량화한다.

### 2.2 비목표(Non-goals)
- 신규 UI 프레임워크/디자인 시스템 도입
- 다단계 튜토리얼/복잡한 온보딩 플로우(여러 페이지/진행도)
- 실시간 스트리밍(웹소켓) 기반 대시보드
- 대규모 세그먼트 필터/리포트 빌더(현 단계에서는 고정 윈도우 중심)

---

## 3. 현행 구조(레퍼런스)
- 홈 화면: `src/pages/HomePage.tsx`
- 모달 컴포넌트: `src/components/common/Modal.tsx`
- 활동 수집(POST): `app/api/routes/activity.py` (`/api/activity/record`)
- 활동 이벤트 타입: `app/schemas/activity.py` (`ActivityEventType`)
- 활동 집계 테이블: `app/models/user_activity.py`
- 이벤트 로그 테이블: `app/models/user_activity_event.py` (idempotency)

---

## 4. UX 상세 요구사항

## 4.1 홈 온보딩 모달(간단 튜토리얼)
### 4.1.1 노출 조건
- 홈 진입 시 평가
- 다음 조건을 모두 만족하면 1회 노출
  - (A) `localStorage` 플래그 `onboarding_v1_seen`이 없음
  - (B) 서버 기준 `has_any_play === false` (룰렛/주사위/복권 중 1회도 플레이 이력 없음)

### 4.1.2 모달 내용(최소)
- 제목: “첫 게임 시작하기”
- 본문:
  - “티켓이 있으면 바로 시작”
  - “티켓이 없으면 금고에서 티켓 받는 방법 확인”
  - 추천 액션: “룰렛 1판부터”

### 4.1.3 CTA
- Primary: “룰렛으로 시작” → `/roulette` 이동
- Secondary: “티켓 얻는 방법 보기” → 홈 상단 금고 배너로 스크롤 + 배너 상세(Open) 토글
- Dismiss: 닫기(X) → `onboarding_v1_seen=true` 저장

### 4.1.4 이벤트 계측(권장)
- `ONBOARDING_SHOWN`
- `ONBOARDING_CTA_START_ROULETTE`
- `ONBOARDING_CTA_VAULT_HELP`
- `ONBOARDING_DISMISSED`


## 4.2 티켓 획득 안내 강화(게임 카드 UX)
### 4.2.1 요구사항
- 기존: 티켓이 없으면 “바로 시작하기” 버튼 disabled + 문의 문구
- 변경: 티켓이 없을 때도 사용자가 다음 행동을 할 수 있도록 **대체 CTA 제공**

### 4.2.2 동작 정의
- 티켓이 있을 때(`tokenBalance > 0`): 기존 “바로 시작하기” 유지
- 티켓이 없을 때(`tokenBalance <= 0`):
  - 버튼 라벨: “금고에서 티켓 얻기”
  - 동작(우선순위):
    1) 금고 배너가 표시 중이면 해당 영역으로 스크롤 + “자세히 보기” 자동 오픈
    2) 금고 배너가 표시되지 않으면 홈의 금고/충전 안내 섹션으로 스크롤(또는 안내 텍스트 노출)

### 4.2.3 이벤트 계측(권장)
- `HOME_NO_TICKET_CTA_VAULT_CLICKED`


## 4.3 모바일 최적화
### 4.3.1 원칙
- 터치 타겟 최소 높이(권장): 44px 이상
- 좁은 화면에서 텍스트 과밀 방지(줄바꿈/트렁케이트)
- 버튼/카드 간격은 모바일 기준으로 더 넉넉하게

### 4.3.2 적용 범위
- Home 게임 카드 버튼
- 홈 상단 CTA 버튼
- 온보딩 모달 내 CTA 버튼

---

## 5. 데이터/분석 설계(퍼널 정의)

## 5.1 퍼널 정의(기본)
분석은 “신규 가입 cohort” 기준으로 집계합니다.
- Cohort: `user.created_at`이 분석 윈도우에 포함

기본 단계(Phase 1):
1) 가입: `user.created_at in window`
2) 첫 로그인: `user.last_login_at is not null` AND (cohort)
3) 첫 플레이: `user_activity.last_play_at is not null` AND (cohort)

확장 단계(Phase 2, 이벤트 기반):
4) 온보딩 노출: `ONBOARDING_SHOWN`
5) 온보딩 CTA 클릭: `ONBOARDING_CTA_*`
6) 티켓 없음 → 금고 CTA 클릭: `HOME_NO_TICKET_CTA_VAULT_CLICKED`

> 주의: “티켓 지급/획득”을 정확히 퍼널로 넣으려면, 티켓을 나타내는 서버 데이터(예: token grant logs)와 연계가 필요합니다. 본 설계는 우선 UX/계측으로 ‘막힘’을 측정합니다.


## 5.2 테스트/운영 데이터 분리(권장)
운영 퍼널을 왜곡하는 테스트 계정을 제외하기 위한 규칙을 둡니다.
- 1차(간단): `external_id` 패턴 기반 제외(예: `test_`, `qa_` 등)
- 2차(고도화): `user.is_test` 같은 명시 플래그 컬럼 도입

> 운영에서 쓰는 테스트 계정 규칙이 확정되면, API에 반영합니다.

---

## 6. API 상세 설계

## 6.1 사용자 활동 요약 API(신규)
### Endpoint
- `GET /api/activity/me`

### 인증
- 기존 사용자 인증(현재 `/api/activity/record`가 `get_current_user_id`를 사용)

### 응답 스키마(예시)
```json
{
  "user_id": 123,
  "has_any_play": false,
  "roulette_plays": 0,
  "dice_plays": 0,
  "lottery_plays": 0,
  "last_play_at": null,
  "updated_at": "2025-12-17T00:00:00Z"
}
```

### 서버 구현 개요
- `user_activity` 레코드가 없으면 0/false로 반환
- `has_any_play = (roulette_plays + dice_plays + lottery_plays) > 0`


## 6.2 어드민 퍼널 분석 API(신규)
### Endpoint
- `GET /admin/api/analytics/new-member-funnel?window=7d`

### 인증/권한
- 어드민 인증/인가 정책 준수(기존 admin api 방식과 동일)

### 파라미터
- `window`: `24h` | `7d` | `30d` (초기에는 `7d`만 허용해도 됨)

### 응답 스키마(예시)
```json
{
  "window": "7d",
  "as_of": "2025-12-17T00:00:00Z",
  "steps": [
    {"key": "signup", "label": "가입", "count": 100, "rate_from_prev": 1.0},
    {"key": "first_login", "label": "첫 로그인", "count": 70, "rate_from_prev": 0.7},
    {"key": "first_play", "label": "첫 플레이", "count": 40, "rate_from_prev": 0.571}
  ],
  "exclusions": {
    "excluded_test_users": true,
    "rule": "external_id startswith test_"
  }
}
```

### 집계 방식
- SQLAlchemy로 기간 내 cohort 사용자 집계
- 제외 규칙 적용(설정값 기반)

---

## 7. 이벤트/스키마 변경 설계

## 7.1 ActivityEventType 확장
- 파일: `app/schemas/activity.py`
- 추가 enum:
  - `ONBOARDING_SHOWN`
  - `ONBOARDING_CTA_START_ROULETTE`
  - `ONBOARDING_CTA_VAULT_HELP`
  - `ONBOARDING_DISMISSED`
  - `HOME_NO_TICKET_CTA_VAULT_CLICKED`

## 7.2 저장 방식
- `POST /api/activity/record`를 통해 이벤트를 저장
- 중복 방지 필요 시 프론트에서 `event_id(UUID)`를 제공

---

## 8. 프론트엔드 구현 설계

## 8.1 홈 온보딩 모달
- 파일: `src/pages/HomePage.tsx`
- 추가 상태:
  - `isOnboardingOpen`
  - `hasSeenOnboarding` (`localStorage`)
- 데이터:
  - React Query로 `/api/activity/me` 조회

## 8.2 게임 카드 CTA 변경
- 파일: `src/pages/HomePage.tsx` (GameCard 컴포넌트)
- `tokenBalance <= 0`일 때:
  - disabled 대신 “금고에서 티켓 얻기” 버튼 렌더
  - 클릭 시 금고 배너로 스크롤(및 open 토글)

## 8.3 모바일 터치 개선
- 버튼 클래스에 `py`/`min-h` 조정
- 텍스트 줄바꿈/트렁케이트 적용

---

## 9. 어드민 UI 구현 설계

## 9.1 위치
- 기존 `AdminDashboardPage`에 섹션 추가(새 페이지 최소화)

## 9.2 표현
- 외부 차트 라이브러리 없이:
  - 단계별 숫자
  - 최대값 대비 가로 막대(비율)
- React Query `refetchInterval: 30_000`

---

## 10. DB 마이그레이션(필요 시)
- `GET /api/activity/me`는 기존 `user_activity`만으로 가능(마이그레이션 불필요)
- 이벤트 타입 확장도 DB 스키마 변경은 불필요(문자열 저장)
- 테스트 계정 플래그(`user.is_test`)를 도입할 경우:
  - Alembic migration 추가 필요

---

## 11. 보안/운영 고려사항
- 어드민 analytics API는 반드시 인증/권한 검사를 통과해야 함
- 운영 환경에서 DB 덤프/비밀번호 하드코딩은 위험(별도 보안 정리 필요)
- 이벤트 계측은 개인정보를 수집하지 않도록 제한(외부 ID 등 포함 금지)

---

## 12. 릴리즈 계획
### Phase 1 (UX 개선)
- `/api/activity/me` + 홈 온보딩 모달
- 티켓 없음 CTA(금고 안내)
- 모바일 터치/레이아웃 개선

### Phase 2 (분석/대시보드)
- `/admin/api/analytics/new-member-funnel`
- AdminDashboard 퍼널 카드
- 테스트 계정 제외 규칙 적용

---

## 13. 검증/성공 지표(KPI)
- 신규 cohort 기준:
  - 모달 노출 대비 CTA 클릭률
  - 티켓 없음 상태에서 금고 CTA 클릭률
  - 첫 플레이 전환율(가입 → 첫 플레이)
  - 1일/7일 재방문 및 재플레이(가능 시)

---

## 14. 오픈 질문(확정 필요)
1) 테스트 계정 제외 규칙: `external_id` 접두사/패턴이 무엇인지?
2) 분석 윈도우 기본값: `24h` vs `7d` 중 무엇을 기본으로 할지?
3) ‘티켓 획득’의 정의: 금고 해금/티켓 지급 로그가 서버에 어떤 형태로 남는지?
