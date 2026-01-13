# 운영 관리 레이아웃 디자인 가이드라인 (ISFJ Edition)

## 👤 타겟 페르소나 분석 (ISFJ 관리자)

* **성향**: 조용하고 차분한 환경에서 규칙대로 업무를 수행하길 원함. 예기치 않은 변경이나 모호한 상태를 싫어함.
* **Pain Point**: "이 버튼을 누르면 바로 지급되나요?", "지금 시즌이 끝난 건가요?" 와 같은 상태의 불확실성.
* **Design Goal**: **"Rule-Based, Safe, Transparent"** (규칙 기반, 안전함, 투명함).

---

## 1. 핵심 디자인 코드: "Safety Zone & Status Bar"

### A. 설정 통제실 (Control Room Header)

ISFJ 관리자는 전체 상황을 먼저 파악하고 세부 업무에 들어가길 원합니다.

* **Status Bar**: 페이지 최상단에 `h-10 bg-indigo-500/10 border-b border-indigo-500/20` 형태의 얇은 바 배치.
  * 내용: "현재 시즌: **Season 5** (D-12) | 활성 미션: **6개** | 오늘의 티켓 지급: **1,200개**"
  * 효과: 페이지 진입 순간 "현재 상황"을 브리핑받는 느낌.

### B. 입력 폼의 "안전 구역 (Safety Zone)"

값을 변경하거나 재화를 지급하는 행위는 관리자에게 큰 스트레스입니다.

* **배경 분리**: 입력 폼 영역은 `bg-[#1e1e24]` (살짝 보랏빛/푸른빛이 도는 짙은 회색)으로 배경을 달리하여 "여기는 작업 공간입니다"라는 신호를 줍니다.
* **폼 레이아웃**:
  * 라벨: `text-zinc-400 text-sm mb-2` (명확한 지시).
  * 입력창: `bg-zinc-900 border border-white/10 rounded-lg p-3`.
  * 설명문: 입력창 하단에 "유저 ID를 입력하세요." 같은 **Help Text**를 반드시 제공.

---

## 2. 운영 관리 페이지 상세 가이드

### 🎫 티켓/토큰 관리 (Ticket Management)

**"지급과 회수의 명확한 구분."**

1. **Split View (화면 분할)**
    * **좌측 (Action)**: 지급/회수 폼.
    * **우측 (Monitor)**: 실시간 로그 & 통계.
    * *이유*: 지급 버튼을 누르고 -> 우측에서 로그가 올라오는 것을 눈으로 확인해야 안심하는 성향.

2. **버튼 안전장치**
    * [지급] 버튼은 `bg-emerald-600` (긍정), [회수] 버튼은 `bg-rose-600` (주의).
    * 버튼 클릭 시 **"ooo님에게 100 티켓을 지급하시겠습니까?"** 라는 최종 확인 모달 필수.

### 🛍️ 상점 & 미션 (Shop & Missions)

**"복잡한 규칙을 시각적 언어로."**

1. **복합 데이터 셀 (Composite Cell)**
    * 텍스트로 `Diamond 100`이라 쓰지 않고, `💎 + 100` 아이콘 결합형 UI 사용.
    * 관리자가 글자를 읽는 스트레스를 줄이고 직관적으로 인식하게 함.

2. **스마트 뱃지**
    * `Daily` (매일), `Weekly` (매주) 뱃지를 **Outlined Style**로 적용하여, 시선의 흐름을 방해하지 않으면서 정보 제공.

### 📅 시즌 패스 (Season Pass)

**"시간의 흐름을 시각화."**

1. **게이지 바 (Time Gauge)**
    * 시즌 기간을 텍스트 날짜(`2026-01-01 ~ 2026-01-31`)로만 보여주지 말고, 진행률 바(Progress Bar)를 통해 "얼마나 지났는지" 시각적으로 보여줌.
    * 관리자가 "아직 여유 있네" 또는 "곧 마감이네"를 직관적으로 판단.

### 🔥 스트릭 보상 (Streak Rewards)

**"연속성의 시각화."**

1. **카드형 타임라인**
    * Day 1 ~ Day 7 설정을 가크로 나열된 **카드 타임라인**으로 변경.
    * 각 카드 안에 보상 아이콘을 크게 배치하여 "1일차엔 코인, 2일차엔 티켓" 흐름을 한눈에 파악.

2. **컨트롤 패널 축소**
    * 거대했던 '골든아워' 버튼을 상단 우측의 **토글 스위치**로 변경하여 위압감 제거.

### 💬 메시지 & 설문 (Communication)

**"보내기 전 확실한 확인."**

1. **Preview First (선 확인, 후 전송)**
    * 메시지 작성 시 우측에 **휴대폰 목업(Mockup)** 이미지를 띄우고, 실제 유저 화면처럼 타이핑되는 내용이 보이게 함.
    * "내 메시지가 이렇게 보이는구나" 확인 후 안심하고 전송.

---

## 3. 구현 체크리스트 (Operations Check)

* [ ] 중요 액션(지급/삭제) 전에는 반드시 **확인 모달**이 뜨는가?
* [ ] 현재 페이지의 상태(진행 중/종료)를 알려주는 **Status Bar**가 있는가?
* [ ] 입력 폼 주변은 **Safety Zone** 배경색으로 구분되어 있는가?
* [ ] 중요 액션(지급/삭제) 전에는 반드시 **확인 모달**이 뜨는가?
* [ ] 현재 페이지의 상태(진행 중/종료)를 알려주는 **Status Bar**가 있는가?
* [ ] 입력 폼 주변은 **Safety Zone** 배경색으로 구분되어 있는가?
* [ ] 텍스트 대신 **아이콘**을 활용해 인지 부하를 줄였는가?

---

## 4. 2차 리팩토링 계획 (Secondary Refactoring Plan)

사용자 피드백("폰트 크기가 불규칙함", "여백 낭비 심함") 및 **스크린샷 분석 결과**를 바탕으로, 운영 페이지의 레이아웃 밀도와 타이포그래피를 정밀 보정합니다.

### A. Global Typography & Spacing (규격화)

* **배경**: 현재 `text-3xl`, `text-lg`, `text-[10px]` 등이 혼재되어 시각적 리듬이 깨짐.
* **표준 폰트 스케일 (Typography Scale)**:
  * **Page Title**: `text-2xl font-bold tracking-tight text-white` (페이지 대제목).
  * **Section Title**: `text-lg font-bold text-white mb-3` (섹션 중제목).
  * **Body Text**: `text-sm text-zinc-300 leading-relaxed`.
  * **Table Header**: `text-xs font-semibold text-zinc-500 uppercase tracking-wider` (기존보다 선명하게).
  * **Table Cell**: `text-sm text-zinc-100` (숫자는 `font-mono tracking-tight`).
  * **Badge/Label**: `text-[11px] font-bold uppercase tracking-wide`.

### B. 페이지별 개선 상세 (Specifics)

#### 1. 🎫 티켓/토큰 관리 (Ticket Manager)

* **현황 진단**: 테이블 행 간격이 넓어 정보 밀도가 낮고, 상단 탭 버튼이 작아 클릭이 어려움.
* **개선안**:
  * **Compact Table Row**: 테이블 행 높이를 `h-12`로 줄이고, `py-2` 패딩 적용 (스크린샷의 넓은 여백 제거).
  * **Visual Numbers**: 변동 내역(+1, -1)에 색상(`text-emerald-400`, `text-rose-400`)과 `font-mono`를 적용하여 가독성 강화.
  * **Tab Button 확대**: 상단 탭(지급/회수/로그)을 `h-12` 높이의 꽉 찬 탭으로 변경하여 터치 타겟 확보.

#### 2. ⚡ 미션 관리 (Mission Admin) & **모달(Modal)**

* **현황 진단 (스크린샷)**:
  * 모달의 입력 필드 라벨(`text-blue-500`?)과 배경색이 부조화.
  * 입력창 사이의 간격(`space-y`)이 너무 넓어 시선이 분산됨.
* **개선안**:
  * **Modal Density**: 입력 그룹 간 여백을 `gap-4`로 축소 (기존 `gap-6`~`gap-8` 추정).
  * **Input Style Normalization**:
    * 라벨: `text-xs font-medium text-zinc-400 mb-1.5` (색상 통일).
    * 인풋: `bg-zinc-900/50 border border-zinc-700/50 rounded-lg h-10 text-sm focus:border-indigo-500`.
  * **Field Grouping**: 연관된 필드(예: 시작일/종료일, 타겟/수치)는 `Grid cols-2`로 배치하여 수직 공간 절약.

#### 3. 📅 시즌 패스 (Season Pass)

* **현황 진단 (스크린샷)**:
  * 테이블이 텅 비어 보임("횡한 느낌"). ID 컬럼의 폰트가 지나치게 작음.
  * 시즌 기간, 레벨 등 핵심 정보의 가독성이 떨어짐.
* **개선안**:
  * **Table Content Fitting**: 컬럼 너비를 데이터 길이에 맞춰 조정(ID 컬럼 축소, 기간 컬럼 확대).
  * **Empty State Styling**: 데이터가 적을 때도 테이블 형태가 무너지지 않도록 `min-w` 및 균등 분할(`w-full`) 적용.
  * **Status Badge**: '진행중', '종료' 상태를 명확한 뱃지(Dot Indicator + Text)로 표현.
