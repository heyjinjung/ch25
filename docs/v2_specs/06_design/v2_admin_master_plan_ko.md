문서 타입: 계획서 (Master Plan)
버전: v1.2
작성일: 2026-01-19
작성자: Antigravity Agent
대상: 어드민 개발자, 운영팀
상태: SoT

# V2 Admin Master Plan (운영자 중심 CRM 관제 시스템)

## 1. 목적 (Purpose)
현재의 파편화된 어드민을 전면 개편하여, **"운영자가 데이터를 보고 즉시 행동(Intervention)할 수 있는 CRM 중심의 관제탑"**을 구축한다. 
특히 **모바일(폰) 환경**을 최우선으로 고려하며, [Admin Dashboard Layout Design](../design/admin_dashboard_layout_design.md)의 "Soft Obsidian(차분함)" 테마를 적용하여 운영 피로도를 낮춘다.

## 2. 범위 (Scope)
- **대상**: `src/v2/admin/*` (신규 어드민)
- **제외**: `src/admin/*` (구버전 - 유지보수만 진행)
- **우선순위**: **Mobile View (아이폰/갤럭시)** = PC 화면 확장 / pc에서 작업하는 시간이 많지만
모바일 환경에서 접근/제어가 안됐음..

참고디자인 링크 : https://mobbin.com/sites/sections/2a5e8d2d-b16a-4f4d-9523-6a8b1f673dc9?utm_source=copy_link&utm_medium=link&utm_campaign=section_sharing
https://mobbin.com/sites/sections/a613e82c-cf1b-401f-b457-739b49ff775a?utm_source=copy_link&utm_medium=link&utm_campaign=section_sharing

## 3. 핵심 디자인 철학: "Soft Obsidian & Order"
**(Reference: Mobbin Premium Dark UI Patterns)**

### 3.1 Color Palette (Soft Obsidian)
눈의 피로를 최소화하고 데이터 가독성을 높이는 **Warm Dark** 테마를 적용한다.
| Token | Hex / Value | 사용처 | 느낌 |
| :--- | :--- | :--- | :--- |
| **Background** | `#121214` (Zinc-950) | 전체 배경 | 완전한 블랙(#000)보다 깊이감 있고 부드러움 |
| **Surface** | `#18181B` (Zinc-900) | 카드/컨테이너 | 배경과 미세하게 구분되는 레이어 |
| **Border** | `rgba(255, 255, 255, 0.08)` | 경계선 | 1px의 아주 얇고 투명한 선 (Hairline) |
| **Primary** | `#D2FD9C` (Luminous Lime) | 핵심 액션 (Submit) | 어두운 배경에서 가장 명시적인 주목도 (CC Brand) |
| **Text Main** | `#E4E4E7` (Zinc-200) | 주요 텍스트 | #ZZZ(White) 대신 사용하여 눈부심 방지 |
| **Text Muted** | `#A1A1AA` (Zinc-400) | 부가 정보 | 데이터 레이블, 설명 문구 |
| **Destructive** | `#FF453A` (iOS Red) | 삭제/반려/차단 | 명확한 경고 및 위험 신호 |

### 3.2 Button & Action Design
"데이터를 다루는 도구"로서의 명확한 피드백과 실수를 방지하는 인터랙션을 제공한다.

- **Hierarchy (계층)**:
    - **Primary**: `bg-[#D2FD9C] text-black hover:opacity-90` (저장, 승인, 완료)
    - **Secondary**: `bg-white/10 text-white hover:bg-white/20` (취소, 닫기, 필터)
    - **Ghost**: `hover:bg-white/5 text-zinc-400` (더보기, 아이콘 버튼)
    - **Destructive**: `bg-red-500/10 text-red-500 border-red-500/20` (삭제, 차단)
- **Interaction (반응)**:
    - **Active Scale**: 버튼 클릭 시 `scale(0.98)`로 눌리는 물리적 느낌 제공.
    - **Loading State**: 로딩 중 `Opacity 0.7` + `Spinner` + `Cursor-not-allowed`.
    - **Haptic (Mobile)**: 중요 액션(승인/반려) 시 햅틱 피드백 연동(Web Vibration API).
- **Shape**:
    - **Radius**: `rounded-lg` (8px) - 너무 둥글지 않은 단단한 느낌 (Order).
    - **Height**: `h-10` (40px) - 터치하기 충분한 영역 확보.

## 4. 개선 전략 (CRM & Mobile First)
### 4.1 기술 스택
- **프레임워크**: React + Vite
- **UI 라이브러리**: **Shadcn/UI** (기본 디자인), **Tanstack Table** (데이터 표)
- **모션/애니메이션**: `Framer Motion` (페이지 전환, 모달 등장), `Magic UI` (대시보드 효과)
- **레이아웃 구조**:
    - **Mobile**: 하단 메뉴바 (**Dock**) + 바텀 시트 (Bottom Sheet)
    - **PC**: 좌측 사이드바 + 우측 서랍 (Drawer)


### 4.2 핵심 기능
| 영역 | 개선 방향 | 비고 |
| :--- | :--- | :--- |
| **대시보드** | **한 줄 요약**: 복잡한 그래프 대신, "지금 중요한 것"만 한 문장으로 표시. | 가독성 4.5:1 유지 |
| **유저 관리** | **360도 뷰**: 유저 클릭 시 [정보+금고+로그]가 한 화면(서랍/시트)에 통합 표시. | 모달 팝업이되 라우팅|
| **금고 관리** | **안전 장치**: 터치 실수를 막기 위한 **'밀어서 승인 버튼 적용. | Emerald/Gold 컬러 |
| **설정 관리** | **쉬운 입력**: 모바일에서도 입력하기 편한 숫자 패드/토글 스위치 제공. | JSON 직접 수정 금지 |

## 5. UI 컴포넌트 매핑 (Magic UI 활용)
운영자의 업무 효율을 높이기 위해 적절한 인터랙션을 사용하되, **과하지 않게(Minimal)** 적용한다.

### 5.1 관제 및 모니터링 (Monitoring)
| 컴포넌트 | 적용 위치 | 한글 명칭 | 효과/의도 |
| :--- | :--- | :--- | :--- |
| **Bento Grid** | 대시보드 | **카드형 배치** | 매출, 접속자 등 핵심 지표를 깔끔한 카드(격자) 형태로 정리. |
| **Pulsating Dot** | 골든 레이더 | **상태 신호등** | 위기(빨강)/기회(초록) 유저 카드에 작게 깜빡이는 점 표시. (집중 유도) |
| **Animated List** | 로그 피드 | **실시간 목록** | 게임 로그가 쌓일 때 눈이 어지럽지 않게 부드럽게 추가됨. |

### 5.2 CRM 및 조작 (Action)
| 컴포넌트 | 적용 위치 | 한글 명칭 | 효과/의도 |
| :--- | :--- | :--- | :--- |
| **Dock** | 하단 메뉴 | **하단 메뉴바** | (모바일) 자주 쓰는 메뉴(유저, 금고, 로그)를 아이폰 하단처럼 배치. |
| **Number Ticker** | 매출 카드 | **롤링 숫자** | 실시간 매출 변동 시 숫자가 도로록 굴러가며 바뀜. (생동감) |
| **Interactive Icon** | 버튼류 | **반응형 아이콘** | 승인/반려 버튼을 누르면 살짝 눌리는 느낌(애니메이션) 제공. |

## 6. 화면 리스트 (Screen List)

## 6. 화면 리스트 (Screen List) - 2026.01.19 Revised

### 6.1 운영 대시보드 (Ops Dashboard) - golden 폴더내용 정립 후 작업예정
| 화면명 | 파일 경로 (예정) | 설명 |
| :--- | :--- | :--- |
| **마케팅 센터** | `src/v2/admin/pages/dashboard/MarketingCenterPage.tsx` | 주요 KPI 및 마케팅 성과 지표 |
| **운영 로그** | `src/v2/admin/pages/dashboard/OpsLogPage.tsx` | 운영 로그 조회 및 **CSV 업로드** |
| **종합 대시보드** | `src/v2/admin/pages/dashboard/OpsDashboard.tsx` | 골든 레이더, 실시간 매출, 시스템 상태 요약 |
| **시스템 상태** | `src/v2/admin/pages/system/HealthPage.tsx` | 서버/DB 상태 신호등 표시 |

### 6.2 관리 및 운영 (Management & Ops)
| 화면명 | 파일 경로 (예정) | 설명 |
| :--- | :--- | :--- |
| **회원 관리** | `src/v2/admin/pages/users/UserListPage.tsx` | 유저 검색/필터/상세(Drawer) 진입 |
### 상세 유저 및 CRM (User & CRM)
| 화면명 | 파일 경로 (예정) | 설명 | 상세 기능 (Features) |
| :--- | :--- | :--- | :--- |
| **유저 목록** | `src/v2/admin/pages/users/UserListPage.tsx` | 검색/필터 테이블 | **SoT 검색**: 닉네임, CC_id, telegram_id, telegram_username <br> **필터**: 상태(Active/Warning/Inactive/Suspended), 레벨 범위, 가입일 |
| **유저 상세 (통합)** | `src/v2/admin/components/users/UserDetailDrawer.tsx` | **360도 통합 뷰** | 1. **기본 정보**: 프로필, 가입일, 레벨xp,  최근 접속, 기기 정보 <br> 2. **지갑(Wallet)**: **티켓(Ticket)** 및 티켓 보유량 조회/수정/티켓로그확인/각티켓이용 보상품내역 확인되어야함 (**핵심**) <br> 3. **금고(Vault)**: 현재 잔액, 누적 출금, 입금내역 확인 (**입금은 외부 CC 연동**) / 강제잔액수정 <br> 4. **인벤토리(Item)**: 기프티콘 및 모든 보상 밸류 (지갑 폐기 여부 확인 중) <br> 5. **활동 로그**: 게임 플레이(Ticket Use) 및 입출금 이력 타임라인 <br> 6. **상담/메모**: 운영자 메모(Memo) + 7. 유저세그먼트 
+8. 수정가능기능  = 9 미션관리기능 (유저가 수행한 미션확인/어드민에서 미션수행처리보상관리)
| **CC 입금** | `src/v2/admin/pages/economy/CCDepositPage.tsx` | 외부 CC 입금 내역 관리자가 수동 확인/처리 | 입금시각 kst 기준 / 입금횟수 / 메모 / 관리편집기능 
| **금고 통합 관리** | `src/v2/admin/pages/economy/VaultControlPage.tsx` | 전체 금고 현황, 출금상황/승인,반려/ 강제잔액 조정 | 그리고 강제잔액조정시 +면 입금 / -면 출금 처리되야함 / 리스크 유저 식별  / 오입금/사고 처리용 <br> 3. **개인 금고 조회**: 특정 유저의 금고 상세 내역(History) 및 현재 상태 조회 |
| **티켓/인벤 관리** | `src/v2/admin/pages/economy/TicketInventoryPage.tsx` | 유저별 티켓/아이템 지급 및 회수 **기능**: 아이템 지급/회수, 사용 로그 조회 - 이때 유저별 티켓이용보상 내역 확인되어야함 즉 게임보상내역 로그 !  | 유저별 티켓/아이템 지급 및 회수 **기능**: 아이템 지급/회수, 사용 로그 조회 - 이때 유저별 티켓이용보상 내역 확인되어야함 즉 게임보상내역 로그 !  
| **미션 관리** | `src/v2/admin/pages/game/MissionManagerPage.tsx` | **SoT 미션 분류 설정** | 1. **카테고리**: `DAILY`(일일), `WEEKLY`(주간), `NEW_USER`(신규), `SPECIAL_EVENT` <br> 2. **보상 매핑**: 카테고리별 허용 보상(티켓/포인트/번들) 자동 필터링 적용 <br> 3. **스트릭 관리**: 연속 출석 보상 테이블(Day 1~7) 및 보상 반복 주기 설정 |
| **레벨 관리** | `src/v2/admin/pages/game/LevelConfigPage.tsx` | **XP 및 보상 테이블** | 1. **XP 테이블**: 레벨 1~20 구간별 필요 경험치 설정 <br> 2. **레벨업 보상**: 각 레벨 도달 시 지급할 티켓/포인트 매핑 (`v2_level_reward_table`) <br> 3. **적립률**: CC 입금액 대비 XP 적립 비율(Current: 10만/20XP) 설정 |
| **상점 관리** | `src/v2/admin/pages/economy/ShopManagerPage.tsx` | **상품 라이브 제어** | 1. **상품 CRUD**: SKU, 이름, 가격(`VAULT`), 지급품(`TICKET`/`ITEM`), 수량 설정 <br> 2. **진열/제한**: 노출 여부(ON/OFF), 일일 구매 제한(Daily Limit) 설정 <br> 3. **교환소**: `Fragment` <-> `Ticket` 변환 비율 및 재료 관리 |
| **유저 세그먼트** | `src/v2/admin/pages/users/UserSegmentPage.tsx` | 고객 등급 분류 및 세그먼트 타겟팅 |
| **설문조사** | `src/v2/admin/pages/marketing/SurveyPage.tsx` | 설문 생성 및 결과 분석 |

### 6.3 설정 및 시스템 (Settings & System)
| 화면명 | 파일 경로 (예정) | 설명 |
| :--- | :--- | :--- |
| **메시지 발송** | `src/v2/admin/pages/marketing/MessageSenderPage.tsx` | 전체/타겟 유저 대상 Push/쪽지 발송 |
| **팀 배틀** | `src/v2/admin/pages/game/TeamBattleConfigPage.tsx` | 팀 배틀 시즌/매치 설정 |
| **룰렛 설정** | `src/v2/admin/pages/game/RouletteConfigPage.tsx` | 룰렛 확률 및 보상 배율 설정 |
| **주사위 설정** | `src/v2/admin/pages/game/DiceConfigPage.tsx` | 주사위 게임 설정 |
| **복권 설정** | `src/v2/admin/pages/game/LotteryConfigPage.tsx` | 복권 회차/당첨번호 관리 |
| **모달 노출 제어** | `src/v2/admin/pages/system/ModalControlPage.tsx` | 긴급 공지/이벤트 모달 전역 제어 |

## 7. 검증 체크리스트 (Self-Check)
- [ ] **디자인**: 배경색이 완전 검정(#000)이 아닌 **Soft Obsidian(#121214)**인가?
- [ ] **모바일**: 폰에서 하단 메뉴바(Dock)와 바텀 시트가 겹치지 않는가?
- [ ] **용어**: 'Validation Error' 대신 '입력을 확인해주세요' 처럼 **쉬운 한글**을 썼는가?
- [ ] **안전**: 금고 잔액 수정 시 '변경 사유'를 입력하지 않으면 버튼이 잠기는가?
- [ ] **성능**: 유저 목록 1,000개를 불러올 때 버벅임이 없는가?

### 7.1 🎨 레퍼런스 분석: Visitors UI (Next.js Visitors)
*User provided reference image (Visitors Dashboard 2x2 Grid)*
- **Card Style**:
    - **Deep Surface**: `#1C1C1E` (매우 어두운 회색) 배경.
    - **Color Coding**: 각 기능별 고유 컬러를 **아이콘 배경(Circle)**과 **텍스트**에 매칭.
        - `Analytics`: **Purple** (분석/통계)
        - `Realtime`: **Blue** (실시간/라이브)
        - `Performance`: **Orange** (성능/서버상태)
        - `Profiles`: **Green** (유저/프로필)
- **Typography**:
    - **Feature Title**: White, Bold, San-serif.
    - **Description**: Muted Grey, 13px, 읽기 편한 대비.
- **적용점 (To-Do)**:
    - **대시보드 Quick Action**: 단순 텍스트 버튼 대신, 위 레퍼런스처럼 **[아이콘+타이틀+설명]**이 있는 2x2 큰 카드 형태로 제작하여 주목도 향상.



## 8. 와이어프레임 분석 및 반영 (Wireframe Analysis & Learning)
*User provided 5 Wireframes (2026-01-19). The following specs are adopted:*
C:\Users\JAVIS\ch\ch25\.kombai\resources\admin-wireframe-1-user-management.html
C:\Users\JAVIS\ch\ch25\.kombai\resources\admin-wireframe-2-vault-control.html
C:\Users\JAVIS\ch\ch25\.kombai\resources\admin-wireframe-3-ops-dashboard.html
C:\Users\JAVIS\ch\ch25\.kombai\resources\admin-wireframe-4-mission-manager.html
C:\Users\JAVIS\ch\ch25\.kombai\resources\admin-wireframe-5-shop-manager.html

### 8.1 👥 회원 관리 (`admin-wireframe-1`)
- **Compact Table**: 모바일 대응을 위해 행 높이 최소화, 핵심 컬럼(ID, 닉네임, 상태Badge, 레벨, 금고, 접속)만 노출.
- **360 Drawer**: 우측 오버레이 방식. 탭 네비게이션(기본/지갑/금고/인벤/로그/메모) 도입 **확정**.
- **Search Spec**: `닉네임, CC_id, telegram_id, telegram_username` 4가지 키워드 플레이스홀더 명시.

### 8.2 💰 금고 제어 (`admin-wireframe-2`)
- **Slide-to-Approve**: 터치 실수를 원천 차단하는 '밀어서 승인' 인터랙션 적용 (**Essential**).
- **Risk Indicator**: 리스크 유저(Red Dot/Background) 시각적 강조 및 '승인 잠금(Lock)' 처리.
- **Tab Layout**: `출금승인` / `강제조정` / `CC입금` / `리스크` 4단 탭 구조.

### 8.3 📊 종합 대시보드 (`admin-wireframe-3`)
- **Bento Grid**: 4px Gird 기반 카드 배치. (매출, 접속자, 시스템상태, 골든레이더).
- **Interactive Widgets**:
    - `NumberTicker`: 실시간 매출 롤링 효과.
    - `PulsatingDot`: 골든 레이더(위기/기회) 상태 점멸.
- **Quick Actions**: 자주 쓰는 기능(CSV업로드, 메시지, 모달제어) 바로가기 버튼 배치.

### 8.4 🎯 미션 관리 (`admin-wireframe-4`)
- **Streak Table**: Day 1~7 보상 테이블을 **직접 수정(Input)** 가능한 형태로 구현. Day 7(Major) 강조.
- **Reward Mapping**: 보상 타입(`TICKET`/`POINT`/`BUNDLE`) 선택 시 수량 입력 UX.

### 8.5 🛒 상점 관리 (`admin-wireframe-5`)
- **Live Product Grid**: 카드형 리스트. **ON/OFF 토글**로 즉시 진열 제어.
- **Exchange Editor**: 조각(Fragment) -> 티켓(Ticket) 교환 비율을 테이블에서 직접 수정.




## 9. 구현 순서도 (Implementation Roadmap)

### Step 1: Foundation (환경 설정)
- [x] **Theme Setup**: Soft Obsidian(`bg-[#121214]`) 테마 및 Typography(Pretendard) 적용
- [x] **Layout Shell**: Mobile Dock(하단 메뉴) + Desktop Sidebar 반응형 구조 구현
- [x] **Common UI**: `Shadcn/UI` 설치 및 커스텀(Rounded-2xl, Warm Gray)

### Step 2: Ops Dashboard (운영 대시보드)
- [ ] **Marketing Center**: KPI 카드 및 매출 차트
    - **UI**: `BentoGrid`(Magic UI), `AreaChart`(Recharts), `NumberTicker`(Magic UI)
- [ ] **Ops Log**: CSV 업로드 기능 및 로그 뷰어
    - **UI**: `Input`(File), `ScrollArea`, `Table`(Logs), `Badge`(Status)
- [ ] **Real-time**: 실시간 매출 및 위기 감지 위젯
    - **UI**: `PulsatingDot`(Magic UI), `Card`(Glass Effect), `Sparkles`(Animation)

### Step 3: Management & Ops (관리 및 운영)
- [ ] **3-1. User CRM (회원 관리)**
    - [ ] `UserListPage`: 검색 및 상태 필터
        - **UI**: `Tanstack Table`, `Command`(Search), `Popover`(Filter), `Badge`(Active/Black)
    - [ ] `UserDetailDrawer`: 6-Section 통합 뷰
        - **UI**: `Sheet`(Right Side), `Tabs`(Sections), `Avatar`, `Timeline`(Custom)
    - [ ] `WalletEditor`: 티켓 강제 수정
        - **UI**: `Dialog`(Alert), `Input`(Number), `Form`(Validation)
- [ ] **3-2. Economy Ops (경제 관리)**
    - [ ] `VaultControlPage`: 출금 승인/반려
        - **UI**: `Slider`(Swipe to Approve), `AlertDialog`(Reject), `Progress`(Limit)
    - [ ] `CCDepositPage`: 입금 수동 승인
        - **UI**: `Table`(Pending List), `Button`(Action), `Textarea`(Memo)
    - [ ] `ShopManagerPage`: 상품 관리
        - **UI**: `Switch`(On/Off), `Card`(Product Item), `Input`(Price)
- [ ] **3-3. Game Ops (게임 운영)**
    - [ ] `MissionManagerPage`: 미션/스트릭 설정
        - **UI**: `Select`(Category), `Calendar`(Schedule), `Accordion`(Reward Table)
    - [ ] `LevelConfigPage`: XP/보상 매핑
        - **UI**: `Table`(Editable), `Input`(XP), `Select`(Reward Type)
- [ ] **3-4. Inventory Ops (인벤토리)**
    - [ ] `TicketInventoryPage`: 지급/회수 로그
        - **UI**: `Data Table`, `DateRangePicker`, `HoverCard`(Item Detail)

### Step 4: Settings & System (설정 및 시스템)
- [ ] **4-1. Marketing Tools**
    - [ ] `MessageSenderPage`: 푸시 발송
        - **UI**: `Textarea`(Message), `Select`(Target), `RadioGroup`(Type)
    - [ ] `SurveyPage`: 설문 관리
        - **UI**: `FormBuilder`(Dynamic), `BarChart`(Result)
- [ ] **4-2. Game Configuration**
    - [ ] `RouletteConfigPage` & `DiceConfigPage`: 확률 설정
        - **UI**: `Slider`(Probability), `Input`(Multiplier), `Chart`(Simulation)
    - [ ] `LotteryConfigPage`: 회차 관리
        - **UI**: `DatePicker`(Draw Date), `InputOTP`(Winning Number)
- [ ] **4-3. System Control**
    - [ ] `ModalControlPage`: 전역 모달 제어
        - **UI**: `Switch`(Global Toggle), `Card`(Modal Preview)
- [ ] **4-4. Final Polish**
    - [ ] **Easy Korean**: 용어 전수 검수
    - [ ] **Audit Link**: `Toast`(Action Feedback) 및 로그 적재 확인

## 10. 변경 이력
- v1.3 (2026-01-19, Antigravity Agent): 구현 순서도(Roadmap) 추가
- v1.2 (2026-01-19, Antigravity Agent): 디자인 가이드(Soft Obsidian) 반영 및 용어 한글화
- v1.1 (2026-01-19, Antigravity Agent): Magic UI Ops 적용 전략 추가
- v1.0 (2026-01-19, Antigravity Agent): Artifact 기반으로 공식 문서화
