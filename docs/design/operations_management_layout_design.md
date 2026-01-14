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


🎨 프론트엔드 UI 설계 (Frontend Design Spec - ISFJ Edition)
docs/design/*.md 가이드라인을 준수하여, "차분하고 예측 가능한(Calm & Predictable)" 운영 환경을 구축합니다.

1. 전역 스타일 규칙 (Global Style Tokens)
배경색 (Deep Calm): #121214 (Soft Obsidian)
컨테이너 (Surface): #18181b (Zinc-900)
텍스트 (Primary): #e4e4e7 (Zinc-200) / (Secondary): #a1a1aa (Zinc-400)
강조색 (Brand): #6366f1 (Indigo-500)
위험/경고 (Danger): #f43f5e (Rose-500) / 성공 (Success): #10b981 (Emerald-500)
그리드: 4px 단위 시스템 (p-6, gap-6, rounded-2xl).
2. 컴포넌트별 상세 디자인
A. 위기 감지 레이더 (Crisis Radar Widget)
위치: 마케팅 대시보드 상단 (기존 카드 영역 대체)

레이아웃: grid grid-cols-4 gap-4.
카드 디자인 (Pulse Card):
Normal: bg-zinc-900/50 border border-white/5 hover:border-indigo-500/50.
High Risk (Scenario 1,9): bg-rose-500/5 border-rose-500/20 + 적색 맥동(Pulse) 애니메이션.
Hidden Gem (Scenario 11): bg-amber-500/5 border-amber-500/20 + 금색 테두리(ring-1 ring-amber-500/30).
콘텐츠:
Title: text-xs font-bold text-zinc-500 uppercase tracking-widest (시나리오명).
Value: text-2xl font-mono font-bold text-zinc-100 (대상자 수).
Action: 마우스 오버 시 "작전 실행 >" 버튼 (text-xs text-indigo-400) 노출.
B. 타겟 리스트 테이블 (Target List Table)
위치: Ops Plan 페이지 > Target List 섹션

헤더: sticky top-0 z-10 bg-[#121214]/90 backdrop-blur. (text-xs text-zinc-500 uppercase).
행(Row): h-14 (56px) 등간격. border-b border-white/5.
시나리오 뱃지: Outlined Style (border border-indigo-500/30 text-indigo-400 bg-indigo-500/5).
인원수: font-mono text-emerald-400 tabular-nums (우측 정렬).
상태 표시: PROCESSED (완료) 상태는 투명도 50% 처리하여 시각적 노이즈 감소.
C. 원클릭 실행 모달 (One-Click Action Modal)
위치: 위기 감지 카드 클릭 시 팝업

배경: bg-black/80 backdrop-blur-sm (집중 모드).
컨테이너: bg-zinc-900 border border-white/10 rounded-2xl w-[600px].
Safety Zone (입력/확인 영역):
모달 하단 액션 영역에 bg-[#1e1e24] 배경을 깔아 "중요한 결정"임을 암시.
미리보기: 상단에는 대상자 Top 5 리스트 표시 (Compact List).
페이로드 설정: 메시지 템플릿 선택 및 보상 금액 확인 (Read-only 권장).
버튼:
[취소]: text-zinc-400 hover:text-white.
[작전 실행]: bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg.
3. 인터랙션 가이드 (Interaction)
Hover: 모든 카드와 리스트 아이템은 hover:bg-white/[0.02] 반응.
Click Feedback: 버튼 클릭 시 즉각적인 Loading Spinner 표시 (버튼 내부).
Toast: 작업 완료 후 우측 하단에 "12명에게 작전이 실행되었습니다." 성공 토스트 노출.


 상세 기술 설계 (Backend Spec)
1. 데이터베이스 스키마 (Database Schema)
ops_target_list (대상자 그룹)
Column	Type	Description
id
Integer (PK)	고유 ID
plan_id	Integer (FK)	ops_plan.id 참조
name
String(100)	화면 표시용 이름 (예: "불운한 뉴비")
source_type	String	SCENARIO, SEGMENT
source_params	JSON	생성 조건 (예: {"scenario_id": 11})
count_snapshot	Integer	생성 시점의 포함 인원 수
is_processed	Boolean	처리 완료 여부
ops_target_member (대상자 개별)
[Update] 결과 추적(Result Check) 컬럼 추가

Column	Type	Description
id
Integer (PK)	고유 ID
target_list_id	Integer (FK)	ops_target_list.id 참조
user_id	Integer (FK)	user.id 참조
status
String	PENDING, SENT, FAILED
data	JSON	개인화 변수 (예: {"loss_amount": 50000})
result_status	String	NONE (미확인), CHECKED (확인됨)
converted_at	DateTime	목표 행동 달성 시각 (NULL이면 미달성)
conversion_value	Integer	전환 가치 (예: 입금액, 판수)
2. 백엔드 로직 (Scenario Query Logic)
(이전과 동일)

3. 결과 추적 및 팔로업 (Result Check & Follow-up)
"보내고 끝"이 아니라 "먹혔는지 확인"하는 피드백 루프를 구축합니다.

자동 추적 (Auto-Tracking):
Trigger: 타겟 리스트 생성 후 24시간 뒤 배치(Batch) 또는 관리자가 수동으로 "결과 확인" 버튼 클릭.
Logic:
Scnenario 1 (뉴비): 지급 후 24시간 내 게임 플레이 횟수 확인.
Scenario 3 (첫충전): 제안 후 24시간 내 입금 발생 여부 확인.
Scenario 11 (외부VIP): 보상 지급 후 로그인 및 게임 참여 확인.
리포팅 (Reporting):
Ops Plan 결과 화면에 "전환율(Conversion Rate)" 표시. (예: "총 12명 중 4명(33%) 복귀 성공")
팔로업 (Follow-up):
효과가 없는 그룹은 "실패(Failed)"로 분류하고, 추후 다른 시나리오(예: 더 강력한 미끼) 대상군으로 재활용.
🎨 프론트엔드 UI 설계 (Frontend Design Spec - ISFJ Edition)
(이전과 동일)


---
20260113_ops_crisis_scenarios_spec.md 스펙에 따라 다음 구현을 마쳤습니다:

✅ 완료 항목
레이어	파일	내용
DB Schema	app/models/ops_target.py	OpsTargetList, OpsTargetMember (Result Check 포함)
Migration	alembic/versions/20260113_1804_...py	테이블 생성 완료
Schemas	app/schemas/ops_target.py	CRUD + CrisisSignals + Import/ResultCheck
Service	app/services/ops_target_service.py	시나리오 감지 (S01, S04, S11) + CRUD
API Router	app/api/admin/routes/admin_ops_target.py	5개 엔드포인트
🔌 새로 추가된 API 엔드포인트
GET /admin/api/ops/dashboard/crisis-signals (위기 레이더)
POST /admin/api/ops/plans/{plan_id}/import-target (시나리오 임포트)
GET /admin/api/ops/target-lists/{id}/members (멤버 조회)
POST /admin/api/ops/target-lists/{id}/check-results (전환 확인)
📋 다음 단계
 프론트엔드: 마케팅 대시보드에 "위기 감지 레이더" 위젯 추가
 프론트엔드: 원클릭 임포트 모달 구현


 1 Crisis Scenarios 구현이 완료되었습니다! 🎉

✅ 백엔드 (완료)
구분	파일
DB	ops_target_list, ops_target_member 테이블 생성
API	GET /dashboard/crisis-signals, POST /import-target 등 5개 엔드포인트
Service	시나리오 1, 4, 11 감지 로직 구현
✅ 프론트엔드 (완료)
구분	파일
컴포넌트	CrisisRadar.tsx - 11개 시나리오 레이더 위젯
API	fetchCrisisSignals, importTargetFromScenario
통합	MarketingDashboardPage.tsx 상단에 레이더 추가
🎨 UI 디자인 (스펙 기반)
HIGH 레벨: 로즈(Rose) 배경 + 맥동(Pulse) 애니메이션
SPECIAL 레벨: 앰버(Amber) 금색 테두리 + 링 효과
호버 시: "작전 실행 →" 버튼 노출
📦 빌드 확인
✅ npm run build 성공 (exit code 0)
마케팅 대시보드(/admin/marketing)에서 위기 감지 레이더를 확인하실 수 있습니다!