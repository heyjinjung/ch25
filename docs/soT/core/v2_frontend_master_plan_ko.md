문서 타입: 계획서 (Master Plan)
버전: v2.2 (Glassmorphism & Magic UI Phase)
작성일: 2026-01-24
작성자: Antigravity Agent
대상: 프론트엔드 개발자, 디자이너
상태: 🚧 Redesign In Progress

# V2 User Frontend Master Plan (Glassmorphism & Magic UI)

## 1. 목적 (Purpose)
**"미래지향적이며 깊이감 있는 몰입형 모바일 경험 구축"**
기존의 평면적인 디자인을 넘어, **Glassmorphism(유리 질감)**과 **Neumorphism(부드러운 깊이감)**을 결합하여 현대적이고 고급스러운 UI를 제공한다.
여기에 **Magic UI**의 역동적인 마이크로 인터랙션을 더해 사용자가 "살아있는 앱"을 만지는 듯한 경험을 선사한다.

## 2. 디자인 핵심 3대장 (Design Pillars)

### 2.1 Glassmorphism & Neumorphism (질감과 깊이)
- **Glassmorphism**: 배경이 은은하게 비치는 반투명(Blur) 레이어를 사용하여 공간감 형성. (Card, Modal, Bottom Sheet)
- **Neumorphism**: 부드러운 그림자와 하이라이트를 통해 요소가 화면에서 튀어나오거나 들어간 듯한 촉각적 깊이감 제공. (Button, Toggle)
- **Dark Mode Default**: 기본적으로 **Soft Obsidian(#121214)** 배경을 사용하여 눈의 피로를 줄이고 고급스러움 강조.

### 2.2 Magic UI & Micro-interactions (생동감)
- **Reaction**: 버튼 클릭 시 잔물결(Ripple), 튀는 하트 등 즉각적인 피드백 제공.
- **Motion**: 페이지 전환, 리스트 로딩 시 `BentoGrid`, `AnimatedList` 등을 활용한 부드러운 모션.
- **Live Data**: 숫자가 변할 때 `NumberTicker`로 도르륵 굴러가는 효과 등 "살아있는 데이터" 표현.

### 2.3 Thumb-Friendly Layout (엄지손가락 친화)
- **Bottom Navigation**: 주요 탭(홈, 게임, 인벤토리)을 하단에 배치.
- **Reachability**: 중요한 CTA(Call To Action) 버튼을 화면 하단 1/3 영역에 집중 배치.
- **Gestures**: 스와이프 제스처를 통한 뒤로가기, 탭 전환 지원.

---

## 3. 상세 디자인 가이드 (Design Guidelines)

### 3.1 Color Palette (Dark & Neon Glass)
| Token | Hex / Value | 설명 |
| :--- | :--- | :--- |
| **Background** | `#121214` | Deep Dark (Soft Obsidian) |
| **Glass Surface** | `rgba(255, 255, 255, 0.05)` | **Backdrop Blur 20px** 적용 필수 |
| **Glass Border** | `rgba(255, 255, 255, 0.1)` | 1px 은은한 경계선 |
| **Primary** | `#FF4D4D` (Neon Red) | 핵심 액션 (Start Game, Buy) |
| **Secondary** | `#D2FD9C` (Lime) | 성공, 획득, 강조 |
| **Shadow** | `0 8px 32px 0 rgba(0, 0, 0, 0.37)` | 깊은 그림자 (Glass Effect) |

### 3.2 Typography (San-serif Modern)
- **Font**: `Pretendard` or `Inter` (System Font Fallback)
- **Hierarchy**:
  - **Heading**: Bold, 24px+ (Title)
  - **Body**: Medium, 16px (Content)
  - **Caption**: Regular, 13px (Subtext) - Low Contrast

### 3.3 Components Strategy (Magic UI)
| 컴포넌트 | 적용 구간 | Magic UI / Tailwind 효과 |
| :--- | :--- | :--- |
| **게임 카드** | 게임 로비 | `BentoGrid`, `ShineBorder` (카드 테두리 빛남) |
| **알림/공지** | 홈/헤더 | `Marquee` (흐르는 텍스트), `AnimatedList` |
| **재화창** | 상단 바 | `NumberTicker` (재화 변동 애니메이션) |
| **메인 버튼** | CTA | `PulsatingDot` (주목도 향상), `Ripple` (클릭 효과) |
| **로딩** | 전체 | `Skeleton` + `Shimmer` 효과 |

---

## 4. 모바일 UI 체크리스트 (QA Guidelines)

### 4.1 사용성 (Usability)
- [ ] **Thumb Zone**: 모든 주요 버튼이 하단 40% 영역 내에 있는가?
- [ ] **Touch Target**: 터치 영역이 최소 44x44px 이상인가?
- [ ] **Feedback**: 터치 시 즉각적인 시각/햅틱 피드백이 있는가?

### 4.2 시각적 완성도 (Visual)
- [ ] **Consistency**: 유리 질감(Blur)과 그림자(Shadow) 강도가 일관적인가?
- [ ] **Contrast**: 텍스트와 유리 배경 간의 명도 대비가 충분한가? (가독성)
- [ ] **Spacing**: 요소 간 여백이 충분하여 답답하지 않은가? (8px Grid)

### 4.3 성능 (Performance)
- [ ] **Blur Cost**: `backdrop-filter` 사용 시 저사양 기기 렉 방지 처리 확인.
- [ ] **Image**: 고해상도 에셋 최적화 (WebP/Avif).

---

## 5. 구현 로드맵 (Roadmap)

1.  **Foundation**: `tailwind.config.js`에 Glass/Neon 플러그인 및 색상 추가.
2.  **Layout**: `Layout.tsx`에 Glassmorphism GNB/BottomTab 적용.
3.  **Home (Lobby)**: `BentoGrid`를 활용한 게임 선택 화면 구현.
4.  **Game UI**: 각 게임별(Roulette, Dice, Lottery) 몰입형 전용 UI 구현.
5.  **Micro-polish**: 클릭 리액션, 페이지 전환 모션, 숫자 카운팅 추가.
