# 신규회원 유입 퍼널 개선 심화 체크리스트 (Technical Development Guide)

작성일: 2025-12-18
문서 버전: v1.1 (상세 구현 가이드 포함)

## 0. 개발 환경 및 사전 준비
- [ ] **목표 확인**: 홈 온보딩 모달(1회), 티켓 부족 시 대체 CTA(금고 유도), 모바일 터치 최적화, 어드민 퍼널 모니터링.
- [ ] **비목표 확인**: 복잡한 튜토리얼, 실시간 웹소켓, 디자인 시스템 도입.
- [ ] **테스트 계정 규칙**: `external_id`가 `test_`로 시작하거나 `qa_`로 시작하는 계정은 퍼널 집계에서 제외 (하드코딩 또는 Config 처리).

---

## 1. Backend API 개발 (Python/FastAPI)

### 1.1 스키마 정의 (`app/schemas/activity.py`)
- [ ] **ActivityEventType Enum 확장**:
  ```python
  class ActivityEventType(str, Enum):
      # ... 기존 항목 ...
      ONBOARDING_SHOWN = "ONBOARDING_SHOWN"
      ONBOARDING_CTA_START_ROULETTE = "ONBOARDING_CTA_START_ROULETTE"
      ONBOARDING_CTA_VAULT_HELP = "ONBOARDING_CTA_VAULT_HELP"
      ONBOARDING_DISMISSED = "ONBOARDING_DISMISSED"
      HOME_NO_TICKET_CTA_VAULT_CLICKED = "HOME_NO_TICKET_CTA_VAULT_CLICKED"
  ```
- [ ] **UserActivitySummaryResponse 스키마 추가**:
  ```python
  class UserActivitySummaryResponse(BaseModel):
      user_id: int
      has_any_play: bool
      roulette_plays: int
      dice_plays: int
      lottery_plays: int
      last_play_at: datetime | None
      updated_at: datetime
  ```

### 1.2 사용자 활동 요약 API 구현 (`app/api/routes/activity.py`)
- [ ] **Endpoint**: `GET /api/activity/me`
- [ ] **Logic**:
  - `get_current_user_id` 의존성 주입으로 `user_id` 획득.
  - DB `user_activity` 테이블 조회.
  - 레코드가 없으면 기본값(0/False) 반환.
  - `has_any_play` 계산: `(roulette_plays + dice_plays + lottery_plays) > 0`.
- [ ] **Response**: `UserActivitySummaryResponse` 모델 반환.

### 1.3 어드민 퍼널 분석 API 구현 (`app/api/routes/admin.py` 또는 신규 파일)
- [ ] **Endpoint**: `GET /admin/api/analytics/new-member-funnel`
- [ ] **Parameters**: `window: str = "7d"` (Query Param).
- [ ] **Logic**:
  - `window` 파라미터 파싱 (예: `timedelta(days=7)`).
  - **Step 1 (Signup)**: `User` 테이블에서 `created_at >= now - window` 인 카운트 (테스트 계정 제외).
  - **Step 2 (First Login)**: 위 Cohort 중 `last_login_at`이 존재하는 카운트.
  - **Step 3 (First Play)**: 위 Cohort 중 `user_activity.last_play_at`이 존재하는 카운트.
  - (Optional) **Step 4 (Onboarding)**: `user_activity_event` 테이블에서 `ONBOARDING_SHOWN` 이벤트 카운트 (Distinct User).
- [ ] **Optimization**: 복잡한 쿼리는 Raw SQL 또는 SQLAlchemy 최적화 사용 고려.

---

## 2. Frontend 개발 (React/TypeScript)

### 2.1 API 연동 (`src/api/activityApi.ts`)
- [ ] **Interface 정의**: `UserActivitySummary` (Backend 스키마와 일치).
- [ ] **Function**: `getUserActivitySummary()` -> `GET /api/activity/me`.
- [ ] **React Query Hook**: `useUserActivitySummary()` (staleTime: 5분, retry: 1).

### 2.2 온보딩 모달 컴포넌트 (`src/components/onboarding/OnboardingModal.tsx`)
- [ ] **Props**: `isOpen`, `onClose`, `onCtaStart`, `onCtaVault`.
- [ ] **UI 구성**:
  - **Header**: "첫 게임 시작하기" (이모지 포함).
  - **Body**: "티켓이 있으면 바로 시작!", "없으면 금고 확인!".
  - **Footer (Buttons)**:
    - Primary: "룰렛 한 판 돌리기" (Green/Emerald).
    - Secondary: "티켓 얻는 방법" (Ghost/Outline).
- [ ] **Mobile Style**: `w-full`, `max-w-sm`, `mx-4`, 버튼 높이 `min-h-[48px]`.

### 2.3 홈 화면 로직 개선 (`src/pages/HomePage.tsx`)
- [ ] **State Management**:
  - `const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);`
  - `localStorage` 키: `onboarding_v1_seen`.
- [ ] **Effect (노출 조건)**:
  - 데이터 로드 완료(`!isLoading`) 후 체크.
  - `!hasSeenOnboarding` AND `!activityData.has_any_play` 이면 `setIsOnboardingOpen(true)`.
- [ ] **Event Tracking**: 모달 오픈 시 `ONBOARDING_SHOWN` 이벤트 전송 (`/api/activity/record`).

### 2.4 게임 카드 UX 개선 (`src/pages/HomePage.tsx` - `GameCard`)
- [ ] **Props 확장**: `onNoTicketClick?: () => void`.
- [ ] **Button Logic**:
  - `if (tokenBalance <= 0)`:
    - Text: "금고에서 티켓 얻기"
    - Style: `bg-slate-700` (Disabled 느낌이 아닌 Actionable한 색상).
    - OnClick: `onNoTicketClick` 호출.
  - `else`: 기존 "바로 시작하기" 로직 유지.
- [ ] **Scroll Logic**:
  - `HomePage`에 `vaultSectionRef` 생성.
  - `onNoTicketClick` 핸들러에서 `vaultSectionRef.current?.scrollIntoView({ behavior: 'smooth' })` 실행.
  - 금고 배너가 닫혀있다면 자동으로 열어주는 로직 추가 (State `isVaultOpen` 제어).

### 2.5 모바일 최적화 (Global/Common)
- [ ] **Touch Targets**: 모든 주요 버튼(CTA)에 `min-h-[44px]` 또는 `py-3` 클래스 적용 확인.
- [ ] **Spacing**: 모바일(`md:hidden`)에서 카드 간격(`gap-4`) 및 패딩(`p-4`) 적절성 검토.
- [ ] **Text**: 긴 텍스트에 `break-keep` 또는 `truncate` 적용하여 레이아웃 깨짐 방지.

---

## 3. Admin Dashboard 개발 (`src/pages/admin/AdminDashboardPage.tsx`)

### 3.1 퍼널 차트 컴포넌트 (`src/components/admin/FunnelChart.tsx`)
- [ ] **UI**: 간단한 가로 막대 그래프 (CSS/Tailwind 활용).
- [ ] **Data Display**:
  - 단계명 (가입 -> 로그인 -> 플레이).
  - 절대 수치 (명).
  - 전환율 (이전 단계 대비 %).
- [ ] **Polling**: `useQuery` 옵션 `refetchInterval: 30000` (30초).

---

## 4. QA 및 검증 시나리오

### 4.1 신규 유저 시나리오
- [ ] **Case 1**: 신규 가입 후 첫 홈 진입 -> **온보딩 모달 노출됨**.
- [ ] **Case 2**: 모달에서 "룰렛 시작" 클릭 -> **룰렛 페이지 이동** & **이벤트 로그 전송**.
- [ ] **Case 3**: 모달 닫기 후 재진입 -> **모달 노출 안 됨** (`localStorage` 확인).

### 4.2 티켓 부족 시나리오
- [ ] **Case 1**: 티켓 0개 상태 -> 게임 카드 버튼이 "금고에서 티켓 얻기"로 변경됨.
- [ ] **Case 2**: 버튼 클릭 -> **화면이 금고 배너로 스크롤됨** & **배너가 열림**.

### 4.3 데이터 검증
- [ ] **API**: `/api/activity/me`가 정확한 `has_any_play` 값을 반환하는가?
- [ ] **Admin**: 대시보드에서 신규 가입자 수가 실시간(30초)으로 갱신되는가?
- [ ] **Exclusion**: `test_user`로 가입 시 퍼널 카운트에서 제외되는가?

---

## 5. 배포 및 롤백 계획
- [ ] **DB Migration**: 없음 (기존 테이블 활용).
- [ ] **Feature Flag**: 필요 시 프론트엔드에서 `ENABLE_ONBOARDING = true/false` 상수로 제어.
- [ ] **Monitoring**: 배포 직후 Sentry/로그에서 `GET /api/activity/me` 에러율 모니터링.
