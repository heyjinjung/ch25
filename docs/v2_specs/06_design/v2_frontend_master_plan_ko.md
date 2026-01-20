문서 타입: 계획서 (Master Plan)
버전: v2.0
작성일: 2026-01-20
작성자: Antigravity Agent
대상: 프론트엔드 개발자, 디자이너
상태: SoT

# V2 Frontend Master Plan (V2 프론트엔드 마스터 플랜)

## 1. 목적 (Purpose)
[AI_BASE_GUIDE](../00_sot_meta/AI_BASE_GUIDE_2026_v1.0.md)에 의거하여, **Magic UI 및 GSAP**를 활용한 프리미엄 UX/UI 개발 프로세스를 확립한다. V1의 낙후된 UX 레거시를 분석하여 제거하고, 최신 웹 트렌드(Clean Code, Micro-interactions)를 반영한 "Web-First" 환경을 구축한다.

## 2. 범위 (Scope)
- **대상 (Target)**: `src/v2/pages/*`, `src/v2/components/*`
- **제외 (Out of Scope)**: `src/pages/*` (V1 레거시 수정 금지), 텔레그램 SDK 직접 연동 (Phase 6 이전까지 Mock 사용)
- **V1 자산 활용**: **룰렛 휠/세그먼트 SVG**는 V1 디자인을 그대로 유지 (SVG 특이성으로 인한 재구현 방지)

## 3. 용어 정의 (Definitions)
- **Magic UI/GSAP Workflow**: 별도의 디자인 툴 없이, 코드로 직접 프리미엄 효과(Effect)를 구현하고 조립하는 'Code-First' 방식.
- **Web-First**: 텔레그램 환경에 종속되지 않고, 일반 웹 브라우저(Chrome Mobile View)에서 우선적으로 개발 및 검증하는 전략.
- **Micro-interaction**: 버튼 클릭, 스크롤, 호버 시 발생하는 미세하고 자연스러운 사용자 피드백 애니메이션.
- **Liquid Glass**: 텔레그램 배경화면이 은은하게 비치는 반투명 레이어 스타일.

---

## 4. 핵심 철학 (Core Philosophy: Golden Project)
**"모든 클릭이 기대감이 되게 하라 (Make Every Click an Anticipation)"**
V2 프론트엔드는 단순한 UI가 아니라, [Golden System Definition](../07_golden/golden_v2_system_definition_ko.md)의 "개입(Intervention)"을 시각화하는 **리텐션 엔진**이다.

### 4.1 Telegram Native (텔레그램 네이티브)
- **Liquid Glass**: 텔레그램 배경화면이 은은하게 비치는 `backdrop-filter: blur(20px)` + 반투명 레이어 적극 활용. (단색 배경 지양)
- **Perfect Viewport**: 스크롤 바운스 방지, `100vh` 대신 `window.innerHeight` 사용, `Overscroll-behavior: none` 필수 적용.
- **Haptic First**: 모든 터치 인터랙션에 미세한 햅틱 피드백 연동 (WebMock에서는 소리로 대체).

### 4.2 Gamification (게이미피케이션)
- **Visual Feedback**: 재화 획득/소모 시 화려한 파티클 및 카운트업(Count-up) 효과 (도파민 자극).
- **Streak & Level**: 접속/플레이 연속성을 "놓치면 아까운" 시각적 자산으로 표현.
- **Event Hub**: 산발적인 팝업을 제거하고, "이벤트 모음 페이지"로 통합하여 유저가 스스로 탐험하게 유도.

### 4.3 Golden Intervention (골든 개입)
- **Crisis Radar**: 유저의 위기(연패, 올인)를 감지하여 "구원자(Saver)" 컨셉의 모달/연출 노출.
- **Golden Time**: 유저별 골든 타임(접속 피크)에 맞춘 동적 배너/테마 변경.

---

## 5. 핵심 디자인 철학: "Cosmic Neon & Flow"
**(Reference: Premium Mobile Game UI Patterns)**

### 5.1 Color Palette (Cosmic Neon)
텔레그램 다크 모드와 조화롭고, 게임의 화려함을 살리는 **Neon Dark** 테마를 적용한다.
| Token | Hex / Value | 사용처 | 느낌 |
| :--- | :--- | :--- | :--- |
| **Background** | `rgba(0, 0, 0, 0.85)` | 전체 배경 (투명도) | 텔레그램 배경 비침 (Liquid Glass) |
| **Surface** | `rgba(30, 30, 40, 0.7)` | 카드/컨테이너 | 글래스모피즘 레이어 |
| **Border** | `rgba(255, 255, 255, 0.1)` | 경계선 | 미세한 빛 반사 효과 |
| **Primary (CTA)** | `#30FF75` (Neon Green) | 핵심 액션 (Play, Confirm) | 텔레그램 액센트 컬러 계열 |
| **Secondary** | `#D2FD9C` (Luminous Lime) | 보조 액션, 강조 | CC Brand 컬러 |
| **Gold** | `#FFD700` → `#FFA500` Gradient | 프리미엄/VIP 요소 | 고급스러움, 희귀함 |
| **Text Main** | `#FFFFFF` (White) | 주요 텍스트 | 어두운 배경 대비 가독성 |
| **Text Muted** | `#A0A0A0` (Gray-400) | 부가 정보 | 데이터 레이블, 설명 문구 |
| **Danger** | `#FF453A` (iOS Red) | 경고/손실 | 위험 신호, 베팅 손실 |
| **Win** | `#30FF75` (Neon Green) | 당첨/획득 | 승리, 보상 획득 |

### 5.2 Button & Action Design
"게임의 흥분"을 전달하면서도 명확한 피드백을 제공하는 인터랙션 설계.

- **Hierarchy (계층)**:
    - **Primary**: `bg-gradient-to-r from-[#30FF75] to-[#00D4AA] text-black` (플레이, 구매, 수령)
    - **Secondary**: `bg-white/10 backdrop-blur text-white hover:bg-white/20` (취소, 닫기)
    - **Ghost**: `hover:bg-white/5 text-zinc-400` (더보기, 정보)
    - **Gold/Premium**: `bg-gradient-to-r from-[#FFD700] to-[#FFA500] text-black` (VIP, 프리미엄)
    - **Danger**: `bg-red-500/20 text-red-400 border-red-500/30` (초기화, 삭제)
- **Interaction (반응)**:
    - **Active Scale**: 버튼 클릭 시 `scale(0.95)`로 눌리는 물리적 느낌 제공.
    - **Glow Effect**: Primary 버튼에 `box-shadow: 0 0 20px rgba(48, 255, 117, 0.3)` 적용.
    - **Loading State**: 로딩 중 `Opacity 0.7` + `Spinner` + 버튼 텍스트 유지.
    - **Haptic (Mobile)**: 게임 플레이, 보상 수령 시 햅틱 피드백 연동.
- **Shape**:
    - **Radius**: `rounded-xl` (12px) - 모바일 친화적 부드러운 느낌.
    - **Height**: `h-12` (48px) - 터치 영역 충분히 확보.
    - **Min Width**: `min-w-[120px]` - 주요 버튼 최소 너비.

### 5.3 Card & Surface Design
- **Glassmorphism**: `backdrop-filter: blur(20px)` + `bg-white/5` + `border border-white/10`
- **Hover Glow**: 카드 호버 시 `box-shadow: 0 0 30px rgba(48, 255, 117, 0.1)` 적용
- **Gradient Border**: 프리미엄 카드에 `border-image: linear-gradient(...)` 적용
- **Shine Effect**: 희귀 아이템/VIP 카드에 빛이 흐르는 애니메이션 (Magic UI Shine Border)

---

## 6. 기술 스택 및 전략 (Tech Stack & Strategy)

### 6.1 Core Stack
- **Core**: React + Vite + Tailwind CSS
- **Motion (Dopamine)**: **GSAP** (Coin Shower, Jackpot Effect), **Framer Motion** (Page Transition), **Confetti** (Reward)
- **Components**: **Magic UI** (Trend Effects), **Shadcn/UI** (Base)
- **State**: **React Query** (Server State), **Zustand** (Client State)
- **Icons**: **Lucide React** (Consistent Icon Set)

### 6.2 Direction (개발 방향)
- **Clean Code**: 불필요한 `useEffect` 제거, 선언적 UI.
- **Premium Feel**: 정적인 화면에 생동감(Micro-interaction) 부여.
- **Retention First**: 모든 화면 전환과 로딩에 "기대감"을 심는 연출 사용.
- **Layout Thrashing 방지**: `transform`, `opacity` 속성 위주 사용 (60fps 보장).

### 6.3 V1/V2 격리 전략 (Isolation Strategy)
- **목적**: V1 컴포넌트의 우발적 사용으로 인한 의존성 오염 및 스타일 충돌 방지.
- **정책**: `src/v2/**` 디렉토리 내에서는 `src/components`, `src/hooks`, `src/lib` 등 V1 경로의 Import를 엄격히 금지.
- **예외**: 룰렛 휠/세그먼트 SVG 컴포넌트는 V1에서 복사하여 V2로 이식 (디자인 유지)
- **구현**: `eslint.config.js`에 `no-restricted-imports` 규칙 적용.
    ```javascript
    // eslint.config.js
    {
      files: ["src/v2/**/*.{ts,tsx}"],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [{
              group: ['@/components/*', '@/hooks/*', '@/lib/*', '@/utils/*'],
              message: 'V2 must not import from V1 paths.'
            }]
          }
        ]
      }
    }
    ```

### 6.4 V1 자산 활용 전략 (V1 Asset Reuse)

#### 6.4.1 룰렛 휠/세그먼트 SVG (Roulette Wheel - MUST PRESERVE)
**SVG 특이성으로 인해 V1 디자인을 그대로 유지해야 하는 핵심 컴포넌트**

| V1 파일 | V2 이식 경로 | 역할 |
| :--- | :--- | :--- |
| `src/components/game/RouletteWheel.tsx` | `src/v2/components/game/RouletteWheel.tsx` | 룰렛 휠 SVG + 스핀 애니메이션 |
| `src/components/game/RouletteFrame.tsx` | `src/v2/components/game/RouletteFrame.tsx` | 장식용 외곽 프레임 SVG |

**V1 룰렛 구현 사양 (유지해야 할 핵심 요소)**:
- **SVG ViewBox**: RouletteWheel `0 0 200 200`, RouletteFrame `0 0 861 843`
- **세그먼트 생성**: `polarToCartesian` + `describeArc` 함수로 SVG Path 생성
- **컬러 그라디언트**: 8가지 교대 그라디언트 (purple, orange, teal, yellow, red, blue, pink, gray)
- **스핀 애니메이션**: CSS `transform: rotate()` + `transition` + `cubic-bezier(0.15, 0, 0.15, 1)`
- **포인터**: 상단 녹색(#30FF75) 삼각형 SVG
- **중앙 허브**: 동심원 장식 + 맥박 효과 녹색 코어

**V2 개선 사항 (디자인 변경 없이 추가)**:
- React Query 연동 (세그먼트 데이터 페칭)
- 당첨 시 Confetti 오버레이 추가
- 햅틱 피드백 연동
- 사운드 이펙트 연동

---

## 7. 개발 워크플로우 (Development Workflow)

**전체 흐름**: 분석(Analyze) → 개선설계(Design) → 구현(Implement) → 검증(Verify)

```mermaid
graph TD
    subgraph Analysis [V1 Audit]
        A1[V1 Page Analysis] -->|Identify Bad UX| A2[UX Improvement Plan]
    end

    subgraph Implementation [Magic UI + GSAP]
        A2 -->|Select Components| I1[Magic UI / GSAP Setup]
        I1 -->|Refactor| I2[Clean Code Implementation (src/v2)]
    end

    subgraph Logic [Integration]
        I2 -->|Bind Data| L1[Smart Page (Hooks)]
        L1 -->|Mock Auth| L2[DevLogin Verification]
    end

    subgraph QA [Premium Check]
        L2 -->|Motion Check| V1[Animation Performance (60fps)]
        V1 -->|Approval| V2[Ship]
    end
```

---

## 8. Magic UI Component Mapping (Detail Strategy)

### 8.1 Core Components (Retention Engine)
| 컴포넌트 | 적용 위치 | 한글 명칭 | 효과/의도 |
| :--- | :--- | :--- | :--- |
| **Particles** | `LoginPage`, `LoadingScreen` | **배경 입자** | 은은하게 떠다니는 입자로 "살아있는 앱" 느낌 전달. |
| **Number Ticker** | `AssetPanel` (Lobby/Vault) | **롤링 숫자** | 자산 증가/감소 시 숫자가 롤링되며 변화. |
| **Shine Border** | `GoldenCard`, `VIPBadge` | **빛나는 테두리** | 희귀 아이템이나 VIP 카드 테두리에 빛이 흐르는 효과. |
| **Confetti** | `RewardModal`, `LevelUp`, `RouletteWin` | **축하 파티클** | 보상 획득 순간 화면 전체에 빵파레. |
| **Blur In** | `Modal Text`, `PageTitle` | **블러 등장** | 텍스트가 블러에서 선명해지며 등장. |

### 8.2 Interactive Layouts
| 컴포넌트 | 적용 위치 | 한글 명칭 | 효과/의도 |
| :--- | :--- | :--- | :--- |
| **Bento Grid** | `Lobby (Game Menu)` | **벤토 그리드** | 불규칙하지만 조화로운 그리드로 게임 메뉴 배치. |
| **Marquee** | `Lobby (Win Feed)` | **흐르는 피드** | 실시간 당첨자/고액 배팅 내역이 하단에 흐름. |
| **Animated List** | `NotificationFeed`, `MissionList` | **애니메이션 목록** | 아이템이 자연스럽게 추가/제거되는 효과. |
| **Dock** | `BottomNavigation` | **하단 메뉴바** | 주요 메뉴를 아이폰 독 스타일로 배치. |

### 8.3 Golden Interventions
| 컴포넌트 | 적용 위치 | 한글 명칭 | 효과/의도 |
| :--- | :--- | :--- | :--- |
| **Magic Card** | `CrisisRadarWidget` | **매직 카드** | 터치 리액티브한 조명 효과로 "특별한 제안" 강조. |
| **Pulsating Dot** | `StatusIndicator` | **맥박 점** | 위기/기회 상태 점멸 표시. |
| **Ripple Effect** | `TouchFeedback` | **물결 효과** | 터치 지점에서 퍼지는 시각적 피드백. |

### 8.4 Game Specific
| 컴포넌트 | 적용 위치 | 한글 명칭 | 효과/의도 |
| :--- | :--- | :--- | :--- |
| **Coin Shower** (GSAP) | `BigWinModal` | **코인 샤워** | 대박 당첨 시 코인이 쏟아지는 효과. |
| **3D Dice** (GSAP) | `DicePage` | **3D 주사위** | 주사위 굴림 3D 애니메이션. |
| **Scratch Reveal** | `LotteryPage` | **긁기 효과** | 복권 긁기 인터랙션. |
| **Wheel Spin** (CSS) | `RoulettePage` | **휠 스핀** | V1 SVG 룰렛 휠 회전 (유지). |

---

## 9. 화면 리스트 및 이행 전략 (Screen List)

### 9.1 Core Platform (우선순위: Critical)
| 화면명 | V1 파일 (참조용) | V2 파일 경로 | 설명 | 주요 컴포넌트 |
| :--- | :--- | :--- | :--- | :--- |
| **Login / Entry** | `LoginPage.tsx` | `src/v2/pages/auth/LoginPage.tsx` | DevLogin 폼 + 텔레그램 연동 | `Particles`, `BlurIn` |
| **Lobby (Home)** | `HomePage.tsx` | `src/v2/pages/home/HomePage.tsx` | 메인 메뉴 + 위너 피드 + 자산 패널 | `BentoGrid`, `Marquee`, `NumberTicker` |
| **Inventory** | `InventoryPage.tsx` | `src/v2/pages/inventory/InventoryPage.tsx` | 아이템 리스트 + 탭(보유/사용) | `AnimatedList`, `3DCard` |
| **Shop (Exchange)** | `ShopPage.tsx` | `src/v2/pages/shop/ShopPage.tsx` | 상품 구매 + 교환소 | `MagicCard`, `ShineBorder` |
| **Vault (Wallet)** | `VaultPage.tsx` | `src/v2/pages/vault/VaultPage.tsx` | 자산 조회 + 입출금 | `NumberTicker`, `Tabs` |

**세부 기능 명세 (Core Platform)**:

| 화면명 | 세부 기능 | UI 요소 |
| :--- | :--- | :--- |
| **LoginPage** | 1. DevLogin 폼 (ID/PW) <br> 2. 텔레그램 자동 로그인 (Mock) <br> 3. 배경 파티클 효과 | `Input`, `Button(Primary)`, `Particles` |
| **HomePage** | 1. 자산 패널 (금고/티켓 잔액) <br> 2. 게임 메뉴 그리드 (룰렛/주사위/복권) <br> 3. 실시간 위너 피드 <br> 4. 이벤트 배너 슬라이더 | `BentoGrid`, `Marquee`, `NumberTicker`, `Carousel` |
| **InventoryPage** | 1. 탭 구조 (보유/사용 이력) <br> 2. 아이템 카드 리스트 <br> 3. 아이템 상세 모달 <br> 4. 사용하기 버튼 | `Tabs`, `Card`, `Dialog`, `AnimatedList` |
| **ShopPage** | 1. 상품 카테고리 필터 <br> 2. 상품 카드 그리드 <br> 3. 구매 확인 모달 (원자적 트랜잭션) <br> 4. 잔액 부족 시 안내 | `Tabs`, `MagicCard`, `AlertDialog`, `NumberTicker` |
| **VaultPage** | 1. 현재 잔액 (롤링 애니메이션) <br> 2. 3단 탭 (현황/입금/출금) <br> 3. 출금 조건 체크리스트 <br> 4. 입출금 내역 타임라인 | `NumberTicker`, `Tabs`, `Timeline`, `Badge` |

### 9.2 Game Rooms (우선순위: Critical)
| 화면명 | V1 파일 | V2 파일 경로 | 설명 | 주요 컴포넌트 |
| :--- | :--- | :--- | :--- | :--- |
| **Roulette** | `RoulettePage.tsx` | `src/v2/pages/game/RoulettePage.tsx` | **V1 SVG 휠 유지** + 당첨 효과 | `RouletteWheel(V1)`, `Confetti` |
| **Dice** | `DicePage.tsx` | `src/v2/pages/game/DicePage.tsx` | 3D 주사위 + 베팅 패널 | `GSAP 3D Dice`, `ShakeEffect` |
| **Lottery** | `LotteryPage.tsx` | `src/v2/pages/game/LotteryPage.tsx` | 복권 긁기 + 회차별 결과 | `ScratchReveal`, `Tabs` |

**세부 기능 명세 (Game Rooms)**:

| 화면명 | 세부 기능 | UI 요소 | V1 자산 활용 |
| :--- | :--- | :--- | :--- |
| **RoulettePage** | 1. 티켓 선택 UI <br> 2. 세그먼트 보상 표시 <br> 3. 스핀 버튼 + 햅틱 <br> 4. 당첨 결과 모달 + Confetti <br> 5. 결과 히스토리 | `RouletteWheel`, `RouletteFrame`, `Button`, `Dialog`, `Confetti` | **RouletteWheel.tsx** (SVG 휠 전체), **RouletteFrame.tsx** (장식 프레임) 그대로 이식 |
| **DicePage** | 1. 베팅 금액 입력 <br> 2. 배율 선택 (x2~x10) <br> 3. 3D 주사위 굴림 <br> 4. 결과 연출 (Win/Lose) | `3DDice(GSAP)`, `Slider`, `NumberInput`, `ResultBanner` | - |
| **LotteryPage** | 1. 회차 선택 드롭다운 <br> 2. 내 번호 리스트 <br> 3. 긁기 애니메이션 <br> 4. 당첨 확인 강조 UI | `ScratchCard`, `Select`, `Table`, `Badge(Win)` | - |

### 9.3 Events & Engagement (우선순위: High)
| 화면명 | V1 파일 | V2 파일 경로 | 설명 | 주요 컴포넌트 |
| :--- | :--- | :--- | :--- | :--- |
| **Welcome** | `NewUserWelcomePage.tsx` | `src/v2/pages/event/WelcomePage.tsx` | 신규 유저 온보딩 | `BlurIn`, `Stepper` |
| **Season Pass** | `SeasonPassPage.tsx` | `src/v2/pages/event/SeasonPassPage.tsx` | 시즌 패스 + 보상 트랙 | `ShineBorder`, `ProgressBar` |
| **Missions** | `MissionPage.tsx` | `src/v2/pages/event/MissionPage.tsx` | 미션 목록 + 일괄 수령 | `AnimatedList`, `Button(ClaimAll)` |
| **Attendance** | `AttendancePage.tsx` | `src/v2/pages/event/AttendancePage.tsx` | 출석 체크 + 스트릭 | `Calendar`, `StreakIndicator` |

**세부 기능 명세 (Events & Engagement)**:

| 화면명 | 세부 기능 | UI 요소 |
| :--- | :--- | :--- |
| **WelcomePage** | 1. 단계별 온보딩 (3-5단계) <br> 2. 초기 보상 수령 <br> 3. 튜토리얼 스킵 옵션 | `Stepper`, `BlurIn`, `Confetti`, `Button` |
| **SeasonPassPage** | 1. 무료/프리미엄 트랙 분리 <br> 2. 현재 티어 표시 <br> 3. 보상 수령 상태 시각화 <br> 4. 프리미엄 구매 CTA | `ProgressBar`, `Badge`, `Card`, `ShineBorder` |
| **MissionPage** | 1. 카테고리 탭 (일일/주간/특별) <br> 2. 미션 카드 리스트 <br> 3. 진행률 표시 <br> 4. 일괄 수령 버튼 | `Tabs`, `AnimatedList`, `Progress`, `Button` |
| **AttendancePage** | 1. 7일 캘린더 뷰 <br> 2. 오늘 출석 버튼 <br> 3. 연속 출석 스트릭 표시 <br> 4. 스트릭 보상 미리보기 | `Calendar`, `Badge`, `StreakFire`, `Button` |

### 9.4 Golden Intervention (New Feature)
| 화면명 | V1 파일 | V2 파일 경로 | 설명 | 주요 컴포넌트 |
| :--- | :--- | :--- | :--- | :--- |
| **Crisis Radar** | (New) | `src/v2/components/golden/CrisisRadarWidget.tsx` | 위기 감지 위젯 | `PulsatingDot`, `MagicCard` |
| **Bailout Modal** | `BailoutModal.tsx` | `src/v2/components/golden/BailoutIntervention.tsx` | 구제 제안 모달 | `MagicCard`, `BlurIn` |
| **Streak Care** | (New) | `src/v2/components/golden/StreakRecovery.tsx` | 스트릭 복구 연출 | `HeartbeatAnimation`, `Confetti` |
| **Golden Time Banner** | (New) | `src/v2/components/golden/GoldenTimeBanner.tsx` | 골든 타임 알림 | `ShineBorder`, `Timer` |

---

## 10. 프론트엔드 전용 컴포넌트 목록 (Frontend-Specific Components)

### 10.1 공통 UI 컴포넌트 (Common UI)
| 컴포넌트 | 경로 | 용도 | 상태 |
| :--- | :--- | :--- | :--- |
| **GlassCard** | `src/v2/components/ui/GlassCard.tsx` | 글래스모피즘 카드 | [ ] |
| **NumberTicker** | `src/v2/components/ui/NumberTicker.tsx` | 롤링 숫자 표시 | [ ] |
| **HapticButton** | `src/v2/components/ui/HapticButton.tsx` | 햅틱 피드백 버튼 | [ ] |
| **BottomSheet** | `src/v2/components/ui/BottomSheet.tsx` | 하단 시트 모달 | [ ] |
| **TabBar** | `src/v2/components/ui/TabBar.tsx` | 하단 탭 네비게이션 | [ ] |
| **AssetPanel** | `src/v2/components/ui/AssetPanel.tsx` | 자산 표시 패널 (금고/티켓) | [ ] |
| **LoadingOverlay** | `src/v2/components/ui/LoadingOverlay.tsx` | 전역 로딩 오버레이 | [ ] |
| **ResultBanner** | `src/v2/components/ui/ResultBanner.tsx` | 게임 결과 배너 (Win/Lose) | [ ] |

### 10.2 게임 컴포넌트 (Game Components)
| 컴포넌트 | 경로 | 용도 | 상태 |
| :--- | :--- | :--- | :--- |
| **RouletteWheel** | `src/v2/components/game/RouletteWheel.tsx` | 룰렛 휠 SVG (V1 이식) | [ ] |
| **RouletteFrame** | `src/v2/components/game/RouletteFrame.tsx` | 룰렛 프레임 SVG (V1 이식) | [ ] |
| **DiceCube** | `src/v2/components/game/DiceCube.tsx` | 3D 주사위 (GSAP) | [ ] |
| **ScratchCard** | `src/v2/components/game/ScratchCard.tsx` | 복권 긁기 캔버스 | [ ] |
| **TicketSelector** | `src/v2/components/game/TicketSelector.tsx` | 티켓 종류 선택 UI | [ ] |
| **BetInput** | `src/v2/components/game/BetInput.tsx` | 베팅 금액 입력 | [ ] |
| **WinnerFeed** | `src/v2/components/game/WinnerFeed.tsx` | 실시간 당첨자 마키 | [ ] |

### 10.3 효과 컴포넌트 (Effect Components)
| 컴포넌트 | 경로 | 용도 | 상태 |
| :--- | :--- | :--- | :--- |
| **ConfettiOverlay** | `src/v2/components/effects/ConfettiOverlay.tsx` | 축하 파티클 | [ ] |
| **CoinShower** | `src/v2/components/effects/CoinShower.tsx` | 코인 쏟아짐 (GSAP) | [ ] |
| **ParticleBackground** | `src/v2/components/effects/ParticleBackground.tsx` | 배경 입자 효과 | [ ] |
| **RippleTouch** | `src/v2/components/effects/RippleTouch.tsx` | 터치 물결 효과 | [ ] |
| **GlowPulse** | `src/v2/components/effects/GlowPulse.tsx` | 맥박 빛 효과 | [ ] |

### 10.4 골든 컴포넌트 (Golden Components)
| 컴포넌트 | 경로 | 용도 | 상태 |
| :--- | :--- | :--- | :--- |
| **CrisisRadarWidget** | `src/v2/components/golden/CrisisRadarWidget.tsx` | 위기 감지 위젯 | [ ] |
| **BailoutIntervention** | `src/v2/components/golden/BailoutIntervention.tsx` | 구제 모달 | [ ] |
| **StreakRecovery** | `src/v2/components/golden/StreakRecovery.tsx` | 스트릭 복구 연출 | [ ] |
| **GoldenTimeBanner** | `src/v2/components/golden/GoldenTimeBanner.tsx` | 골든 타임 배너 | [ ] |
| **InterventionToast** | `src/v2/components/golden/InterventionToast.tsx` | 개입 알림 토스트 | [ ] |

---

## 11. 연동 설계 (Integration Design)

### 11.1 API 매핑 (API Mapping)
| 페이지 | 주요 Hook | 엔드포인트 | 역할 |
| :--- | :--- | :--- | :--- |
| **HomePage** | `useFeed` | `GET /api/v2/feed/public` | 실시간 위너 피드 |
| **VaultPage** | `useVaultStatus` | `GET /api/v2/vault/status` | 금고 잔액/출금조건 |
| **VaultPage** | `useWithdraw` | `POST /api/v2/vault/withdraw` | 출금 요청 |
| **ShopPage** | `useShopProducts` | `GET /api/v2/shop/products` | 상품 목록 |
| **ShopPage** | `usePurchase` | `POST /api/v2/shop/purchase` | 상품 구매 |
| **InventoryPage** | `useInventory` | `GET /api/v2/inventory` | 보유 아이템 |
| **RoulettePage** | `useRouletteSegments` | `GET /api/v2/game/roulette/segments` | 룰렛 세그먼트 |
| **RoulettePage** | `useRouletteSpin` | `POST /api/v2/game/roulette/spin` | 룰렛 스핀 |
| **DicePage** | `useDiceRoll` | `POST /api/v2/game/dice/roll` | 주사위 굴림 |
| **LotteryPage** | `useLotteryDraw` | `GET /api/v2/game/lottery/draw/{round}` | 회차별 결과 |
| **MissionPage** | `useMissions` | `GET /api/v2/missions` | 미션 목록 |
| **MissionPage** | `useClaimMission` | `POST /api/v2/missions/{id}/claim` | 미션 보상 수령 |

### 11.2 상태 관리 (Store State)
- **서버 상태 (React Query)**: `queryKey` 표준
    - `['vault', 'status']`: 금고 현황
    - `['shop', 'products']`: 상품 목록
    - `['inventory']`: 인벤토리
    - `['feed', 'public']`: 위너 피드 (5s polling)
    - `['game', 'roulette', 'segments']`: 룰렛 세그먼트
    - `['missions']`: 미션 목록
- **클라이언트 상태 (Zustand)**: `useAppStore`
    - `auth`: { token, user_id, telegram_id }
    - `ui`: { activeModal, toasts, isLoading }
    - `golden`: { intervention_state, crisis_level }
    - `game`: { currentTicket, lastResult }

### 11.3 인증 및 세션 (Auth & Session)
- **DevLogin**: 개발 환경에서 ID/PW로 토큰 발급
- **Telegram Auth**: 텔레그램 initData 검증 (Phase 6 이후)
- **Token 관리**: `src/v2/api/client.ts`에서 `Authorization: Bearer` 헤더 주입
- **401 처리**: 토큰 만료 시 자동 로그아웃 + 재로그인 유도

### 11.4 에러 핸들링 (Error Handling)
- **에러 코드 매핑**:
    - `BENEFITS_SUSPENDED`: 혜택 정지 → 안내 모달
    - `DEPOSIT_REQUIRED`: 입금 필요 → 입금 유도 모달
    - `VAULT_LIMIT_EXCEEDED`: 출금 한도 초과 → 경고 토스트
    - `INSUFFICIENT_BALANCE`: 잔액 부족 → 잔액 부족 안내
    - `TICKET_NOT_FOUND`: 티켓 없음 → 상점 유도
- **재시도 정책**:
    - `GET`: 1회 자동 재시도 (네트워크 오류 시)
    - `POST`: 사용자 재시도 (버튼 표시)
- **UX 처리**: 스켈레톤, 로딩 스피너, 에러 토스트

### 11.5 라우팅 (Routing)
- `src/v2/router/V2Routes.tsx`
    - `/v2/*` 경로 하위에 모든 유저 라우트 배치
    - 보호된 라우트(`ProtectedRoute`)로 감싸 비로그인 접근 차단
- **딥링크 지원**:
    - `/v2/game/roulette`, `/v2/game/dice`, `/v2/game/lottery`
    - `/v2/vault`, `/v2/shop`, `/v2/inventory`
    - `/v2/missions`, `/v2/attendance`

### 11.6 캐시 정책 (Cache Policy)
- **Stale Time**:
    - **금고/상점**: 10s (자주 변동)
    - **인벤토리**: 30s (중간 빈도)
    - **미션/설정**: 1분 (덜 변동)
    - **피드**: refetchInterval 5s (실시간)
- **Window Focus**: 포커스 시 자동 재요청

### 11.7 실시간 데이터 (Real-time)
- **Polling**: 위너 피드 (5초), 금고 잔액 (10초)
- **WebSocket**: (추후 도입) 골든 개입 실시간 알림

### 11.8 성능 최적화 (Performance)
- **Lazy Loading**: `React.lazy`로 페이지 단위 코드 분할
- **Image Optimization**: 아이콘/이미지 WebP 변환, Lazy Load
- **Animation Throttle**: 저사양 기기 감지 시 애니메이션 간소화
- **Debounce**: 검색어 입력 시 300ms 지연

---

## 12. 검증 체크리스트 (Verification Checklist)

### 12.1 디자인 검증
- [ ] **Color**: 배경이 완전 검정이 아닌 **투명/Liquid Glass**인가?
- [ ] **Glassmorphism**: 카드에 `backdrop-filter: blur` 적용되었는가?
- [ ] **Button Hierarchy**: Primary/Secondary/Ghost 구분이 명확한가?
- [ ] **Touch Target**: 버튼 최소 48px (h-12) 높이 확보했는가?

### 12.2 모션 검증
- [ ] **60fps**: 파티클/애니메이션이 저사양에서도 끊기지 않는가?
- [ ] **Magic UI**: 주요 화면에 최소 1개 이상 Magic UI 컴포넌트 사용했는가?
- [ ] **Overkill Check**: 과도한 효과로 정보 전달을 방해하지 않는가?
- [ ] **Haptic**: 게임 플레이, 보상 수령 시 햅틱 피드백이 작동하는가?

### 12.3 기능 검증
- [ ] **Roulette SVG**: V1 룰렛 휠/세그먼트 디자인이 그대로 유지되는가?
- [ ] **Confetti**: 당첨 시 축하 효과가 정상 표시되는가?
- [ ] **NumberTicker**: 자산 변동 시 롤링 애니메이션이 작동하는가?
- [ ] **Error Handling**: 에러 코드별 적절한 UI 피드백이 표시되는가?

### 12.4 호환성 검증
- [ ] **Mock Auth**: 텔레그램 없이 Chrome 브라우저에서 정상 렌더링되는가?
- [ ] **Console Clean**: 렌더링 시 콘솔 에러(Key prop 등) 없는가?
- [ ] **Responsiveness**: 다양한 모바일 뷰포트에서 레이아웃 깨짐 없는가?
- [ ] **Telegram Viewport**: `window.innerHeight` 기반 높이 계산이 정확한가?

### 12.5 V1 자산 검증 (룰렛 전용)
- [ ] **SVG ViewBox**: RouletteWheel `0 0 200 200` 유지되는가?
- [ ] **Segment Colors**: 8가지 그라디언트 컬러 그대로 적용되는가?
- [ ] **Spin Animation**: `cubic-bezier(0.15, 0, 0.15, 1)` 이징 유지되는가?
- [ ] **Pointer**: 상단 녹색(#30FF75) 삼각형 포인터 유지되는가?
- [ ] **Center Hub**: 동심원 + 맥박 효과 녹색 코어 유지되는가?

---

## 13. 구현 순서도 (Implementation Roadmap)

### Step 1: Foundation (환경 설정)
- [ ] **Library Install**: `gsap`, `framer-motion`, `lucide-react`, `clsx`, `tailwind-merge`, `canvas-confetti` 설치
    - **Command**: `npm install gsap framer-motion lucide-react clsx tailwind-merge canvas-confetti`
- [ ] **Tailwind Config**: 텔레그램 Viewport 유틸리티, 글래스모피즘 클래스 추가
    - **파일**: `tailwind.config.js`
    - **추가**: `backdrop-blur-xl`, `bg-surface`, `text-primary` 등 커스텀 클래스
- [ ] **Global CSS**: Liquid Glass, Glow Effect 클래스 정의
    - **파일**: `src/v2/styles/globals.css`
- [ ] **API Client**: Axios 인스턴스 + 인터셉터 설정
    - **파일**: `src/v2/api/client.ts`

### Step 2: Core Components (Visual System)
- [ ] **2-1. Magic UI Base 이식**
    - [ ] `Particles` → `src/v2/components/ui/ParticleBackground.tsx`
    - [ ] `NumberTicker` → `src/v2/components/ui/NumberTicker.tsx`
    - [ ] `ShineBorder` → `src/v2/components/ui/ShineBorder.tsx`
    - [ ] `BentoGrid` → `src/v2/components/ui/BentoGrid.tsx`
    - [ ] `Marquee` → `src/v2/components/ui/Marquee.tsx`
- [ ] **2-2. Common UI 구현**
    - [ ] `GlassCard` (Glassmorphism)
    - [ ] `HapticButton` (터치 피드백)
    - [ ] `BottomSheet` (모바일 모달)
    - [ ] `TabBar` (하단 네비게이션)
    - [ ] `AssetPanel` (자산 표시)
    - [ ] `LoadingOverlay` (전역 로딩)
- [ ] **2-3. Effect Components**
    - [ ] `ConfettiOverlay` (canvas-confetti 래퍼)
    - [ ] `CoinShower` (GSAP 코인 효과)
    - [ ] `RippleTouch` (터치 피드백)

### Step 3: V1 Asset Migration (룰렛)
- [ ] **3-1. 룰렛 컴포넌트 이식** ⚠️ **디자인 변경 금지**
    - [ ] `RouletteWheel.tsx` 복사 → `src/v2/components/game/RouletteWheel.tsx`
        - SVG 구조, 컬러, 애니메이션 100% 유지
        - Props 타입만 V2 스키마에 맞게 조정
    - [ ] `RouletteFrame.tsx` 복사 → `src/v2/components/game/RouletteFrame.tsx`
        - 장식 프레임 SVG 그대로 유지
    - [ ] 헬퍼 함수 (`polarToCartesian`, `describeArc`) 포함 이식
- [ ] **3-2. 룰렛 페이지 구현**
    - [ ] `RoulettePage.tsx` → `src/v2/pages/game/RoulettePage.tsx`
        - V1 룰렛 휠 컴포넌트 사용
        - React Query 연동 (`useRouletteSegments`, `useRouletteSpin`)
        - 당첨 시 `ConfettiOverlay` 추가
        - 햅틱/사운드 피드백 연동

### Step 4: Core Pages (Retention Engine)
- [ ] **4-1. VaultPage**
    - **UI**: `NumberTicker`(잔액), `Tabs`(현황/입금/출금), `Timeline`(내역)
    - **Hook**: `useVaultStatus`, `useWithdraw`
    - **Features**: 출금 조건 체크리스트, 잔액 롤링 애니메이션
- [ ] **4-2. ShopPage**
    - **UI**: `MagicCard`(상품), `Tabs`(카테고리), `AlertDialog`(구매 확인)
    - **Hook**: `useShopProducts`, `usePurchase`
    - **Features**: 원자적 트랜잭션 모달, 잔액 부족 안내
- [ ] **4-3. HomePage (Lobby)**
    - **UI**: `BentoGrid`(메뉴), `Marquee`(위너 피드), `AssetPanel`(자산)
    - **Hook**: `useFeed`, `useUserStatus`
    - **Features**: 실시간 위너 피드, 이벤트 배너 슬라이더
- [ ] **4-4. InventoryPage**
    - **UI**: `Tabs`(보유/사용), `AnimatedList`(아이템), `Dialog`(상세)
    - **Hook**: `useInventory`
    - **Features**: 3D 카드 효과, 아이템 사용 플로우

### Step 5: Other Game Pages
- [ ] **5-1. DicePage**
    - **UI**: `DiceCube`(GSAP 3D), `Slider`(배율), `NumberInput`(베팅)
    - **Hook**: `useDiceRoll`
    - **Features**: 3D 주사위 굴림, Win/Lose 결과 배너
- [ ] **5-2. LotteryPage**
    - **UI**: `ScratchCard`(긁기), `Select`(회차), `Table`(번호)
    - **Hook**: `useLotteryDraw`, `useMyNumbers`
    - **Features**: 긁기 애니메이션, 당첨 확인 강조

### Step 6: Events & Engagement
- [ ] **6-1. MissionPage**
    - **UI**: `Tabs`(일일/주간/특별), `AnimatedList`, `Progress`
    - **Hook**: `useMissions`, `useClaimMission`
    - **Features**: 일괄 수령 버튼, 진행률 표시
- [ ] **6-2. AttendancePage**
    - **UI**: `Calendar`, `Badge`, `StreakIndicator`
    - **Hook**: `useAttendance`, `useCheckIn`
    - **Features**: 스트릭 표시, 보상 미리보기
- [ ] **6-3. SeasonPassPage**
    - **UI**: `ProgressBar`, `ShineBorder`, `Card`
    - **Hook**: `useSeasonPass`
    - **Features**: 무료/프리미엄 트랙, 보상 수령 상태
- [ ] **6-4. WelcomePage**
    - **UI**: `Stepper`, `BlurIn`, `Confetti`
    - **Hook**: `useOnboarding`
    - **Features**: 단계별 온보딩, 초기 보상

### Step 7: Golden Integration
- [ ] **7-1. CrisisRadarWidget**
    - **UI**: `PulsatingDot`, `MagicCard`
    - **Hook**: `useGoldenIntervention`
    - **Features**: 위기 감지 시 맥박 효과 표시
- [ ] **7-2. BailoutIntervention**
    - **UI**: `MagicCard`, `BlurIn`, `Button`
    - **Features**: 구제 제안 모달, 감성적 호소
- [ ] **7-3. StreakRecovery**
    - **UI**: `HeartbeatAnimation`, `Confetti`
    - **Features**: 스트릭 복구 연출, 심폐소생 효과
- [ ] **7-4. GoldenTimeBanner**
    - **UI**: `ShineBorder`, `Timer`
    - **Features**: 골든 타임 카운트다운, 특별 혜택 안내

### Step 8: Final Polish
- [ ] **Performance Audit**: Lighthouse 점수 90+ 확보
- [ ] **Animation Throttle**: 저사양 기기 대응
- [ ] **Accessibility**: 키보드 네비게이션, 스크린 리더 지원
- [ ] **Error Boundary**: 전역 에러 처리 컴포넌트

---

## 14. 변경 이력
- v2.0 (2026-01-20, Antigravity Agent): 어드민 마스터 플랜 구조에 맞춰 전면 확장
    - 디자인 철학 (Color Palette, Button Design) 섹션 추가
    - V1 자산 활용 전략 (룰렛 휠 SVG 유지) 명시
    - 화면별 세부 기능 명세 추가
    - 프론트엔드 전용 컴포넌트 목록 추가
    - 연동 설계 (API/State/Auth/Error) 섹션 추가
    - 검증 체크리스트 세분화
    - 구현 순서도 상세화 (UI/Hook/Features 명시)
- v1.4 (2026-01-19, Antigravity Agent): 구현 순서도(Roadmap) 추가
- v1.3 (2026-01-19, Antigravity Agent): Magic UI 디테일 매핑 추가
- v1.2 (2026-01-19, Antigravity Agent): Magic UI 전환 및 Golden Project/Gamification 전략 추가
- v1.0 (2026-01-19, Antigravity Agent): Artifact 기반으로 공식 문서화
