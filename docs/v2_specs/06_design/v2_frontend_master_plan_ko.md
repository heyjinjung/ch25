문서 타입: 계획서 (Master Plan)
버전: v1.0
작성일: 2026-01-19
작성자: Antigravity Agent
대상: 프론트엔드 개발자, 디자이너
상태: SoT

# V2 Frontend Master Plan (V2 프론트엔드 마스터 플랜)

## 1. 목적 (Purpose)
[AI_BASE_GUIDE](../00_sot_meta/AI_BASE_GUIDE_2026_v1.0.md)에 의거하여, **Magic UI 및 GSAP**를 활용한 프리미엄 UX/UI 개발 프로세스를 확립한다. V1의 낙후된 UX 레거시를 분석하여 제거하고, 최신 웹 트렌드(Clean Code, Micro-interactions)를 반영한 "Web-First" 환경을 구축한다.

## 2. 범위 (Scope)
- **대상 (Target)**: `src/v2/pages/*`, `src/v2/components/*`
- **제외 (Out of Scope)**: `src/pages/*` (V1 레거시 수정 금지), 텔레그램 SDK 직접 연동 (Phase 6 이전까지 Mock 사용)

## 3. 용어 정의 (Definitions)
- **Magic UI/GSAP Workflow**: 별도의 디자인 툴 없이, 코드로 직접 프리미엄 효과(Effect)를 구현하고 조립하는 'Code-First' 방식.
- **Web-First**: 텔레그램 환경에 종속되지 않고, 일반 웹 브라우저(Chrome Mobile View)에서 우선적으로 개발 및 검증하는 전략.
- **Micro-interaction**: 버튼 클릭, 스크롤, 호버 시 발생하는 미세하고 자연스러운 사용자 피드백 애니메이션.

---

## 4. 핵심 철학 (Core Philosophy: Golden Project)
**"모든 클릭이 기대감이 되게 하라 (Make Every Click an Anticipation)"**
V2 프론트엔드는 단순한 UI가 아니라, [Golden System Definition](../01_core/golden_v2_system_definition_ko.md)의 "개입(Intervention)"을 시각화하는 **리텐션 엔진**이다.

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

## 5. 개발 워크플로우 (Development Workflow)

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

## 6. 기술 스택 및 전략 (Tech Stack & Strategy)
- **Core**: React + Tailwind CSS
- **Motion (Dopamine)**: **GSAP** (Coin Shower, Jackpot Effect), **Confetti** (Reward)
- **Components**: **Magic UI** (Trend Effects), **Shadcn/UI** (Base)
- **Direction**:
    - "Clean Code": 불필요한 `useEffect` 제거, 선언적 UI.
    - "Premium Feel": 정적인 화면에 생동감(Micro-interaction) 부여.
    - "Retention First": 모든 화면 전환과 로딩에 "기대감"을 심는 연출 사용.
    - **"Native Performance"**: `transform`, `opacity` 속성만 사용하여 60fps 유지 (Layout Thrashing 방지).

## 7. Magic UI Component Mapping (Detail Strategy)

### 7.1 Core Components (Retention Engine)
| 컴포넌트 | 적용 위치 | 효과/의도 |
| :--- | :--- | :--- |
| **Particles** | `LoginPage`, `LoadingScreen` | 은은하게 떠다니는 입자로 "살아있는 앱" 느낌 전달 (Not Boring). |
| **Number Ticker** | `AssetPanel` (Lobby/Vault) | 자산 증가/감소 시 숫자가 롤링되며 변화. "돈이 쌓이는" 시각적 쾌감 극대화. |
| **Shine Border** | `GoldenCard`, `VIPBadge` | 희귀 아이템이나 VIP 카드 테두리에 빛이 흐르는 효과 (Premium). |
| **Confetti** | `RewardModal`, `LevelUp` | 보상 획득 순간 화면 전체에 빵파레. (도파민). |

### 7.2 Interactive Layouts
| 컴포넌트 | 적용 위치 | 효과/의도 |
| :--- | :--- | :--- |
| **Bento Grid** | `Lobby (Game Menu)` | 불규칙하지만 조화로운 그리드로 게임 메뉴 배치. 트렌디한 대시보드 느낌. |
| **Marquee** | `Lobby (Win Feed)` | 실시간 당첨자/고액 배팅 내역이 하단에 흐르며 "활발한 카지노" 분위기 조성. |
| **Animated List** | `NotificationFeed` | 알림이 쌓일 때 자연스럽게 리스트가 밀려나는 애니메이션. |

### 7.3 Golden Interventions
| 컴포넌트 | 적용 위치 | 효과/의도 |
| :--- | :--- | :--- |
| **Magic Card** | `CrisisRadarWidget` | 마우스/터치 리액티브한 조명 효과로 "특별한 제안"임을 강조. |
| **Blur In** | `Modal Text` | 텍스트가 블러에서 선명해지며 등장. 감성적인 호소력 증가. |

---

## 8. 화면 리스트 및 이행 전략 (Screen List)

### 8.1 Core Platform (우선순위: High)
| 화면명 | V1 파일 (참조용) | V2 파일 경로 (예정) | 설명 및 전략 |
| :--- | :--- | :--- | :--- |
| **Login / Entry** | `LoginPage.tsx` | `src/v2/pages/auth/LoginPage.tsx` | **Particles** 배경 + DevLogin 폼 |
| **Lobby (Home)** | `HomePage.tsx` | `src/v2/pages/home/HomePage.tsx` | **Bento Grid** 메뉴 + **Marquee** 위너 피드 |
| **Inventory** | `InventoryPage.tsx` | `src/v2/pages/inventory/InventoryPage.tsx` | 3D Card Effect 아이템 리스트/탭구조개선(사용/보유)
| **Shop (Exchange)** | `ShopPage.tsx` | `src/v2/pages/shop/ShopPage.tsx` | **원자적 트랜젝션** + **Magic Card** 상품 리스트 (빛반사 효과) |
| **Vault (Wallet)** | `VaultPage.tsx` | `src/v2/pages/vault/VaultPage.tsx` | **Number Ticker** 자산 + 출금 + 출금조건 + 현재 유저 출금가능상태

### 8.2 Game Rooms (우선순위: High)
| 화면명 | V1 파일 | V2 파일 경로 | 설명 |
| :--- | :--- | :--- | :--- |
| **Roulette** | `RoulettePage.tsx` | `src/v2/pages/game/RoulettePage.tsx` | Canvas 위 **Confetti** (당첨 시) |
| **Dice** | `DicePage.tsx` | `src/v2/pages/game/DicePage.tsx` | GSAP 3D Dice + **Shake** Effect |
| **Lottery** | `LotteryPage.tsx` | `src/v2/pages/game/LotteryPage.tsx` | **Scratch Reveal** (복권 긁기 효과 구현)++회차별 당첨확인 강조|

### 8.3 Events & Engagement (우선순위: Medium)
| 화면명 | V1 파일 | V2 파일 경로 | 설명 |
| :--- | :--- | :--- | :--- |
| **Welcome** | `NewUserWelcomePage.tsx` | `src/v2/pages/event/WelcomePage.tsx` | **Blur In** 텍스트 + 순차 등장 |
| **Season Pass** | `SeasonPassPage.tsx` | `src/v2/pages/event/SeasonPassPage.tsx` | **Shine Border** 프리미엄 패스 강조 +보상 수령 상태 시각화 강화 |
| **Missions** | `MissionPage.tsx` | `src/v2/pages/event/MissionPage.tsx` | **Animated List** 미션 목록 + 일괄 수령(Claim All) UX 추가 |

### 8.4 Golden Intervention (New Feature)
| 화면명 | V1 파일 | V2 파일 경로 | 설명 |
| :--- | :--- | :--- | :--- |
| **Crisis Radar** | (New) | `src/v2/components/golden/CrisisRadarWidget.tsx` | **Pulse** (고동치는 효과) 적용 |
| **Bailout Modal** | `BailoutModal.tsx` | `src/v2/components/golden/BailoutIntervention.tsx` | **Magic Card** 스타일의 구제 제안 |
| **Streak Care** | (New) | `src/v2/components/golden/StreakRecovery.tsx` | 스트릭 깨짐 방지 심폐소생 연출 |

---

## 9. 검증 체크리스트 (Verification Checklist)
**AI_BASE_GUIDE 7. 품질/검증 기준 준수**

- [ ] **Retention Core**: "도파민(화려함)"과 "탐험(숨겨진 요소)"이 반영되었는가?
- [ ] **Motion Performance**: 파티클/애니메이션이 저사양에서도 끊기지 않는가(Optimized GSAP)?
- [ ] **Magic UI Use**: 주요 화면에 최소 1개 이상의 Magic UI 컴포넌트가 적절히 사용되었는가?
- [ ] **Overkill Check**: 너무 과도한 효과로 정보 전달을 방해하지 않는가?
- [ ] **Component Reusability**: 버튼, 인풋 등 공통 요소가 `src/v2/components/common`으로 분리 확인
- [ ] **Mock Auth**: 텔레그램 없이 Chrome 브라우저에서 정상 렌더링 확인
- [ ] **Console Clean**: 렌더링 시 콘솔 에러(Key prop 등) 없음 확인
- [ ] **Responsiveness**: 다양한 모바일 뷰포트에서 레이아웃 깨짐 없음 확인

## 11. 구현 순서도 (Implementation Roadmap)

### Step 1: Foundation (환경 설정)
- [ ] **Library Install**: `gsap`, `framer-motion`, `lucide-react`, `clsx`, `tailwind-merge` 설치
- [ ] **Tailwind Config**: 텔레그램 Viewport(`height: 100vh` -> `window.innerHeight`) 유틸리티 추가
- [ ] **Global CSS**: `backdrop-filter` 및 `liquid-glass` 클래스 정의

### Step 2: Core Components (Visual System)
- [ ] **Magic UI Base**: `Particles`, `BentoGrid`, `NumberTicker` 컴포넌트 이식 및 최적화
- [ ] **Common UI**: `Button` (Haptic), `Card` (Glassmorphism), `Modal` (Blur In)

### Step 3: Core Pages (Retention Engine)
- [ ] **VaultPage**: 자산 롤링(Number Ticker) + 3단 탭(입금/출금/레저) 구현
- [ ] **ShopPage**: 매직 카드 효과(Shine) + 원자적 트랜잭션 모달
- [ ] **HomePage (Lobby)**: 벤토 그리드 메뉴 + 실시간 위너 마키(Marquee)

### Step 4: Game & Engagement
- [ ] **RoulettePage**: 캔버스 오버레이 + 당첨 컨페티 퍼포먼스
- [ ] **DicePage**: 3D 주사위 효과 (GSAP Timeline)
- [ ] **Events**: 출석체크(Streak) 및 미션 일괄 수령 UX

### Step 5: Golden Integration
- [ ] **CrisisRadar**: 위기 감지 시 맥박 효과(Pulse) 위젯 노출
- [ ] **Intervention**: 구제 모달(Bailout), 스트릭 복구(Streak Care)

## 12. 변경 이력
- v1.4 (2026-01-19, Antigravity Agent): 구현 순서도(Roadmap) 추가
- v1.3 (2026-01-19, Antigravity Agent): Magic UI 디테일 매핑 추가
- v1.2 (2026-01-19, Antigravity Agent): Magic UI 전환 및 Golden Project/Gamification 전략 추가
- v1.0 (2026-01-19, Antigravity Agent): Artifact 기반으로 공식 문서화
