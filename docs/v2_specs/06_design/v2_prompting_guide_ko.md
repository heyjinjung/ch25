문서 타입: 가이드 (Guide)
버전: v1.0
작성일: 2026-01-24
작성자: Antigravity Agent
대상: 기획자, 개발자
상태: 🚀 Active

# V2 디자인 마스터 프롬프트 가이드 (Pixel-Perfect)

프롬프트 시 디자인이 어그러지는 이유는 **"추상적인 단어"**를 사용하기 때문입니다. AI에게는 '간지나게'가 아니라 **'수치와 제약 조건'**을 명확히 주어야 합니다.

---

## 1. 페르소나 및 타겟 설정 (Target: 20-60M KR)
대한민국 20-60대 남성은 **'직관적인 신뢰감'**과 **'강렬한 우월감'**을 선호합니다.

### ⚠️ [CRITICAL] 파일 인코딩 규칙
- 모든 파일은 반드시 **UTF-8 (BOM 없음)**으로 저장해야 합니다.
- 한국어 문자열이 깨지는 것을 방지하기 위해 파일 생성/수정 시 인코딩 설정을 매번 확인하세요.
- 필요하다면 유니코드 이스케이프(`\uXXXX`)를 사용하지 말고, 직접적인 UTF-8 텍스트를 깨끗하게 유지하세요.

- **색상**: `Deep Black`, `Gold`, `Neon Red/Green`. (카지노의 화려함 + 자산 가치의 묵직함)
- **가독성**: 텍스트 대비는 최소 4.5:1 이상, 폰트 사이즈는 모바일 기준 14px 이상 유지.
- **조작**: 복잡한 제스처보다는 명확한 '버튼 클릭' 위주의 UX.

---

## 2. 픽셀 퍼펙트 프롬프트 5대 원칙

### ① 레이아웃 시스템 강제 (Grid & Safe Zone)
"절대적인 위치"를 명시하세요.
> "모바일 화면(390px) 기준, 좌우 패딩은 정확히 `8px(p-2)`로 고정해. 상단 노치 영역과 하단 홈 바 영역은 `Safe Area`를 반드시 준수해."

### ② 디자인 양식 명시 (Glass & Neumorphism)
'스타일'이 아닌 '속성'을 명령하세요.
> "모든 컨테이너는 `Glassmorphism` 속성을 적용해: 배경색 `rgba(255,255,255,0.05)`, 블러 `backdrop-blur-xl`, 경계선 `border-white/10`. 버튼은 `Neumorphism` 깊이감을 위해 `shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]`를 추가해."

### ③ Magic UI 인터랙션 포함
동적인 요소도 텍스트로 박으세요.
> "재화 숫자가 바뀔 땐 `Magic UI NumberTicker`를 사용하고, 버튼을 누르면 `Ripple` 효과가 발생하게 해. 게임 카드는 마우스 호버(또는 터치 시작) 시 `scale-105`와 `ShineBorder` 효과를 줘."

### ④ 픽셀 단위 상수 사용 (Fixed Values over Relative)
`flex-1` 대신 정확한 크기를 주면 덜 어그러집니다.
> "메인 배너 카드의 높이는 `h-[180px]`로 고정하고, 하단 탭 바의 높이는 정확히 `h-[80px]`로 설정해."

### ⑤ SoT(Source of Truth) 참조 명령
이미 정의된 규칙을 쓰라고 명령하세요.
> "색상은 반드시 `tailwind.config.js`에 정의된 `obsidian`, `primary`, `gold` 상수를 사용해. 임의의 헥사 코드를 생성하지 마."


---

## 3. 핵심 참조 문서 (Sources of Truth)

프롬프트 시 아래 문서들의 내용을 반영하도록 명시하면 더욱 정확한 결과가 나옵니다.
- **[V2 User Frontend Master Plan](file:///c:/Users/JAVIS/ch/ch25/docs/v2_specs/06_design/v2_frontend_master_plan_ko.md)**: Glassmorphism, Neumorphism, Magic UI 기본 원칙.
- **[V2 Admin Master Plan](file:///c:/Users/JAVIS/ch/ch25/docs/v2_specs/06_design/v2_admin_master_plan_ko.md)**: Soft Obsidian (#121214) 컬러 및 CRM 효율성 규칙.
- **[V2 Design Analysis Report](file:///c:/Users/JAVIS/ch/ch25/docs/v2_specs/06_design/v2_design_analysis_report_ko.md)**: 홈, 상점, 금고 화면의 3D 오브젝트 및 레이아웃 상세 분석.

---

## 4. 재복사하여 사용할 수 있는 [마스터 프롬프트] 템플릿

아래 텍스트를 복사해서 명령 앞에 붙이세요. 가장 최신의 학습 내용이 모두 포함되어 있습니다.

```text
[V2 Master Design Standard - SoT Applied]
1. Base Spec: Based on 'v2_frontend_master_plan_ko.md' and 'v2_design_analysis_report_ko.md'.
2. UI Style: 'Soft Obsidian' Glassmorphism (#121214). Backdrop Blur: 20px. Border: white/10.
3. Typography: Pretendard/Inter, High Contrast (4.5:1), 20-60M KR Persona friendly.
4. Vertical Rhythm (The 100/120 Rule):
   - Top Offset: pt-[var(--header-offset)] (100px standard)
   - Bottom Offset: pb-[var(--nav-offset)] (120px standard)
5. Viewport: Telegram Mini App (TMA) Optimized. Use 'h-tg' and 'fixed' backgrounds.
6. Magic UI: Use 'NumberTicker' for currency, 'BentoGrid' for layouts, 'ShineBorder' for highlights.
   - Distance between containers: Exactly 8px or 12px.
   - Horizontal Padding: Fixed at 8px (p-2) for max content width.
   - Thumb-zone: Place primary action buttons within the bottom 30% of the screen.
7. Tone: Premium, High-Stakes Casino aesthetic for 20-60s Korean Men.
```

---



## 5. 수직 여백 및 Safe Area 표준화 (The 100/120 Rule)


### ① 왜 60px+ / 100px 인가? (Premium Content Standard)
- **Top (60px + Safe Area)**: 
  - `env(safe-area-inset-top)` (노치 영역) 
  - `+ 60px` (정적 헤더 콘텐츠 높이 확보!)
  - **결과**: 헤더 내부 콘텐츠가 60px 수준을 유지해야 14px 폰트와 아이콘이 "가독성 있게" 배치됩니다.
- **Bottom (40px)**: 하단 네비게이션 여백 및 조작 영역 확보.

### ② 화면 제어 규정 (No-Scroll Policy)
- **대상 페이지**: 메인(홈), 게임 대시보드(허브), 금고 페이지.
- **규정**: 위 페이지들은 절대로 세로 스크롤이 발생하지 않도록 레이아웃을 뷰포트 내에 고정(h-screen) 관리합니다.
- **상단 고정**: 모든 콘텐츠의 시작은 반드시 `var(--header-offset)`를 사용하여 헤더 바로 아래에 첫 번째 카드가 위치하도록 합니다.

### ③ 폰트 및 라벨 표준 (Localized Only)
- **리소스 텍스트**: 반드시 **14px** 고정.
- **라벨**: 무조건 한글만 사용 (금고, 티켓).
- **라이브 피드**: **15px** 이상.

### ③ 메인화면 그리드 레이아웃 (Centered & Responsive)
- **메인 카드**: 무조건 화면 가로 정중앙 배치.
- **게임 그리드**: 모바일 사이즈에서 유연하게 대응. 1열(4개) -> **2행 2열(Grid-cols-2)**로 자동 전환 및 가운데 정렬 필수.


### ② 옵션 선택 (Standard vs Compact)
디자인 무드에 따라 두 가지 옵션 중 하나를 택해 저에게 명령하세요.
1. **Standard (권장)**: `pt-[100px] pb-[120px]` -> 프리미엄 공간감 (카지노/VIP 무드)
2. **Compact (집중)**: `pt-[80px] pb-[100px]` -> 데이터 밀도가 높고 꽉 찬 느낌

### ③ CSS 변수 현대화 (Device-Agnostic Safe Area)
`v2/index.css`에 아래와 같이 등록하여 기기별 노치 높이에 유연하게 대응합니다.
```css
:root {
  /* 기기별 실제 노치 높이에 헤더 콘텐츠 높이를 더함 */
  --header-offset: calc(env(safe-area-inset-top) + 52px);
  --nav-offset: calc(env(safe-area-inset-bottom) + 80px);
}
```
**프롬프트 시**: "상단 여백은 `var(--header-offset)`를 사용해. 어떤 폰에서도 헤더 바로 아래에 첫 번째 카드가 위치하도록!"

### ④ 픽셀 미밀 방지 (Zero-Tolerance)
- 배경 이미지는 `h-screen`으로 전체를 채우되, 대화형 카드들은 무조건 이 변수(`--header-offset`) 안으로 가두어야 합니다.
- 1픽셀의 오차도 허용하지 않으려면 레이아웃에서 `flex flex-col`로 높이를 제어하지 말고, 각 컴포넌트의 위치를 **고정 높이(Fixed Height)** 기반으로 쌓아 올리세요.


## 6. 텔레그램(TMA) 뷰포트 최적화 (No Black Bars)

우리 앱은 일반 웹이 아닌 **텔레그램 인앱 뷰포트(TMA)**에서 동작합니다. 배경 뒤에 검은 공간이 비거나 밀리는 현상을 원천 차단합니다.

### ① 전역 높이 강제 (`h-tg`)
`h-screen`은 텔레그램에서 상단 바/하단 메뉴 높이 계산 미스로 인해 하단이 잘리거나 검은 여백이 생길 수 있습니다. 반드시 `h-tg`를 사용하세요.
- **명령**: "최상위 컨테이너는 반드시 `h-tg` (`min-h-tg`)를 사용하고, 배경색은 `bg-obsidian-bg`를 고정해서 어떤 상황에서도 검은 공간이 보이지 않게 해."

### ② 텔레그램 전용 Safe Area (`--tg-viewport-height`)
`tailwind.config.js`에 이미 `h-tg` 유틸리티가 등록되어 고정 높이를 보장합니다.
- **프롬프트**: "텔레그램 뷰포트 높이 변수를 참조해서 컨테이너 크기를 결정해. 텔레그램 `expand()` 상태를 기준으로 꽉 차게 설계해."

### ③ 바운스(Bounce) 및 오버스크롤 방지
스크롤 시 배경이 따라 올라가며 검은 바탕이 보이는 'elastic' 효과를 방지합니다.
- **명령**: "배경 레이어는 `fixed inset-0`으로 고정하고, 그 위의 콘텐츠 레이어만 스크롤되도록 분리해. 최상위 `html, body`에는 `overflow-hidden`을 주고 내부 스크롤 영역에만 `overflow-y-auto`를 적용해."

---

## 7. 결론: "명령은 수치로, 결과는 픽셀로"

스트레스를 줄이는 유일한 방법은 저에게 **"프레임워크"**를 맡기는 것입니다. 
1. `V2Layout`에 상하 여백(100/120)을 박습니다.
2. `h-tg`로 텔레그램 화면을 꽉 채웁니다.
3. 배경을 `fixed`로 고정합니다.

이 3가지만 지켜지면 어떤 기기, 어떤 텔레그램 버전에서도 디자인이 무너지지 않습니다.
