문서 타입: 분석 보고서 (Analysis Report)
버전: v1.0
작성일: 2026-01-24
작성자: Antigravity Agent
대상: 디자인/개발팀
상태: ✅ Completed

[최종 검토일: 2026-01-26]
[정책 최신화 필요 여부: 🟢] 🟢 [정합] Vault 화면 UX(자산 고정 표시/출금 CTA 강조)는 Strict Vault Policy의 “출금 조건 기반 버튼 활성”과 방향 일치.

# V2 Design Analysis Report: Main Home & Game Dashboard

## 1. 개요 (Overview)
사용자가 제공한 **Main Home** 및 **Game Dashboard** 레퍼런스 이미지를 분석하여, V2 프론트엔드 구축을 위한 디자인 가이드라인을 도출한다.
본 분석은 **Glassmorphism**, **Neumorphism**, **Magic UI** 원칙에 기반한다.

## 2. 시각적 스타일 (Visual Style)

### 2.1 Color & Atmosphere
- **Background**: 완전한 Black(#000)이 아닌, 깊이감 있는 **Deep Dark (#121214)** 베이스에 은은한 그라데이션이 깔려있어 공간감을 형성함.
- **Glassmorphism**: 
  - 상단 헤더, 배너, 게임 카드 컨테이너에 **Backdrop Blur**가 적용된 반투명 유리 질감 사용.
  - 경계선(Border)은 `White/10` 정도로 아주 얇게 처리하여 세련미 강조.
- **Accent**: 
  - **Neon Green (#D2FD9C)**: 활성 상태(Online, Tab) 및 강조 텍스트에 사용.
  - **Neon Red/Blue**: 게임 썸네일 등 오브젝트에 채도 높은 3D 아이콘 사용으로 시선 집중.

### 2.2 Typography
- **Headings**: 산세리프(San-serif) 볼드체로 명확한 계층 구조. (예: "NEW UPDATE 2026 FEB")
- **Readability**: 어두운 배경 위에서 White(#FFF)와 Light Gray(#E4E4E7)를 적절히 섞어 눈의 피로 최소화.

## 3. 구조 및 레이아웃 (Structure & Layout)

### 3.1 GNB (Header)
- **Compact Layout**: 좌측 프로필/레벨, 우측 연결 상태(Online) 배지 배치.
- **Status Bar**: 재화(Vault, Ticket) 정보가 상단에 고정되어 어디서든 자산 확인 가능. (Glass Panel 적용)


### 3.4 Vault Screen (금고 화면)
- **Central Focus**: 중앙에 금고 레벨업 상태를 보여주는 **3D Object (Vault)** 배치.
- **Progress Bar**: 현재 금고 레벨 진행도를 직관적으로 보여주는 **Neon Gradient Bar**.
- **Actions**: "출금하기" 버튼이 가장 크게 강조되어 있으며, 그 위에 "CC Casino", "출금안내 조건" 보조 버튼 배치.
- **Visual Feedback**: 출금 가능 상태일 때 버튼에 **Pulsating Glow** 효과 예상.

### 3.5 Shop Screen (상점 화면)
- **Compact Tabs**: 상단에 '상점' / '인벤토리' 탭을 배치하여 빠른 전환 유도.
- **Hero Banner**: "실속 혜택! 지금 바로 GET" 배너로 구매 욕구 자극. (캐릭터 활용)
- **Product Grid**:
  - **Card Design**: 자물쇠 열쇠 아이콘과 함께 상품명, 별점(Rating), 가격(Price) 표시.
  - **Gold/Diamond Keys**: 상품 등급에 따라 열쇠 색상(Gold, Silver) 차별화.
  - **Quick Buy**: 터치 시 즉시 구매 모달 또는 액션 시트로 연결되는 직관적 구조.

## 4. 컴포넌트 분석 (Component Breakdown)

### 4.1 Game Cards
- **Scale**: 1:1 비율에 가까운 라운드 스퀘어 카드.
- **Effect**: 
  - 평상시: Glassmorphism (반투명)
  - 호버/터치시: **Inner Glow** 또는 **Border Shine** 효과로 상호작용 피드백 제공.
- **Object**: 3D 렌더링 된 아이콘(주사위, 왕관, 당구공 등)을 중앙 배치하여 몰입감 증대.

### 4.2 Status Badges
- **Online Badge**: Green Dot + "ONLINE" 텍스트. (`PulsatingDot` 적용 적합)
- **New/Hot Badge**: 카드 우상단에 작게 붙어 시각적 알림 제공.

### 4.3 Vault Progress
- **Level Objects**: LV.1 -> LV.5 -> VIP 단계별로 금고 이미지가 화려해짐.
- **Gradient Bar**: Neon Cyan to Transparent 그라데이션으로 진행률 표시.

## 5. Magic UI 적용 제안 (Implementation Strategy)

| 영역 | 적용 기술 (Magic UI/GSAP) | 효과 |
| :--- | :--- | :--- |
| **메인 배너** | `ShineBorder`, `FadeIn` | 배너 테두리가 빛나며 등장하여 주목도 상승. |
| **재화 패널** | `NumberTicker` | 숫자가 실시간으로 굴러가며 변경되어 생동감 부여. |
| **게임 그리드** | `BentoGrid`, `HoverEffect` | 카드 터치 시 미세한 Scale Up 및 Glow 효과. |
| **알림 바** | `Marquee` | 공지사항 텍스트가 흐르며 공간 효율성 확보. |
| **하단 탭** | `Dock` (Mac Style) | 터치 시 아이콘이 살짝 튀어오르는 모션. |
| **금고 오브젝트** | `3D Tilt` | 휴대폰 기울기에 따라 금고 이미지가 살짝 움직이는 효과. |
| **상점 탭** | `AnimatedTabs` | 탭 전환 시 슬라이딩 인디케이터 적용. |


## 6. App Header 개선 제안 (Header Improvements)
사용자 요청에 따라 **앱 헤더(GNB)** 의 사용성과 미학을 극대화하기 위한 개선점을 도출한다.

### 6.1 구조적 개선 (Structure)
- **Unified Glass Layer**: 현재 분리된 '상단 상태바(Profile)'와 '재화바(Vault/Ticket)'를 하나의 **통합된 Glass Header**로 합쳐 수직 공간을 절약하고 미려함을 더한다.
- **Scroll-driven Effect**: 스크롤 위치에 따라 헤더의 투명도와 블러(Blur) 강도가 동적으로 변하도록 처리. (Top: 투명 -> Scroll: Deep Blur)

### 6.2 기능적 개선 (Function)
- **Interactive Ticker**: 정적인 재화 텍스트 대신 `NumberTicker`를 적용, 재화 획득/소모 시 숫자가 도르륵 굴러가는 시각적 만족감 제공.
- **Quick Charge**: 재화 우측에 작은 `+` 버튼(Neumorphic)을 배치하여 상점/환전소로 즉시 연결.
- **Smart Notification**: 우측 상단에 '알림 종(Bell)' 아이콘 추가. 읽지 않은 알림이 있을 때 **Magic UI Shake** 효과로 주의를 끈다.

### 6.3 시각적 디테일 (Micro-details)
- **Profile Glow**: 유저 레벨(VIP 등급)에 따라 프로필 사진 주변에 은은한 **Neon Ring** 효과 적용.
- **Status Pulse**: 'ONLINE' 배지에 `PulsatingDot` 애니메이션을 적용하여 시스템이 살아있음을 강조.

## 7. 결론 (Conclusion)
제공된 디자인은 **"심플하지만 깊이 있는(Deep & Clean)"** V2의 방향성을 완벽하게 보여준다.
`Glassmorphism`으로 전체 톤을 잡고, `Magic UI`로 생동감을 불어넣는 방식으로 구현을 진행한다.
특히 **개선된 앱 헤더**와 **하단 네비게이션**을 전역 레이아웃(`Layout.tsx`)으로 공통화하는 것이 개발의 첫 단계가 되어야 한다.
![alt text](image.png)