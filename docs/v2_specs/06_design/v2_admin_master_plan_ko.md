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
- **우선순위**: **Mobile View (아이폰/갤럭시)** 최적화 → PC 화면 확장

## 3. 핵심 디자인 철학: "Soft Obsidian & Order"
- **테마 (Theme)**: 눈이 편안한 `Warm Gray` 다크 모드 (`#121214`). 완전 블랙(#000) 금지.
- **레이아웃 (Layout)**: 4px 그리드 시스템에 맞춘 **칼 같은 정렬**.
- **언어 (Language)**: 개발 용어 지양, **'일상적인 한글'** 사용 (예: ValidationError -> 입력 확인 필요).

## 4. 개선 전략 (CRM & Mobile First)
### 4.1 기술 스택
- **프레임워크**: React + Vite
- **UI 라이브러리**: **Shadcn/UI** (기본 디자인), **Tanstack Table** (데이터 표)
- **레이아웃 구조**:
    - **Mobile**: 하단 메뉴바 (**Dock**) + 바텀 시트 (Bottom Sheet)
    - **PC**: 좌측 사이드바 + 우측 서랍 (Drawer)

### 4.2 핵심 기능
| 영역 | 개선 방향 | 비고 |
| :--- | :--- | :--- |
| **대시보드** | **한 줄 요약**: 복잡한 그래프 대신, "지금 중요한 것"만 한 문장으로 표시. | 가독성 4.5:1 유지 |
| **유저 관리** | **360도 뷰**: 유저 클릭 시 [정보+금고+로그]가 한 화면(서랍/시트)에 통합 표시. | 모달 팝업 지양 |
| **금고 관리** | **안전 장치**: 터치 실수를 막기 위한 **'밀어서 승인(Slide)'** 및 큼직한 버튼 적용. | Emerald/Gold 컬러 |
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

### 6.1 관제 (Monitoring)
| 화면명 | 파일 경로 (예정) | 설명 |
| :--- | :--- | :--- |
| **종합 대시보드** | `src/v2/admin/pages/dashboard/OpsDashboard.tsx` | 골든 레이더, 실시간 매출, 시스템 상태 요약 |
| **시스템 상태** | `src/v2/admin/pages/system/HealthPage.tsx` | 서버/DB 상태 신호등 표시 |

### 6.2 유저 및 CRM
| 화면명 | 파일 경로 (예정) | 설명 |
| :--- | :--- | :--- |
| **유저 목록** | `src/v2/admin/pages/users/UserListPage.tsx` | 강력한 검색/필터가 있는 유저 테이블 |
| **유저 상세 (통합)** | `src/v2/admin/components/users/UserDetailDrawer.tsx` | (중요) 유저의 모든 정보를 보는 통합 뷰 |

### 6.3 경제 및 운영
| 화면명 | 파일 경로 (예정) | 설명 |
| :--- | :--- | :--- |
| **금고 제어** | `src/v2/admin/pages/economy/VaultControlPage.tsx` | 입출금 요청 승인/반려 (슬라이드 방식) |
| **상점 관리** | `src/v2/admin/pages/economy/ShopManagerPage.tsx` | 상품 진열 및 재고 관리 |

## 7. 검증 체크리스트 (Self-Check)
- [ ] **디자인**: 배경색이 완전 검정(#000)이 아닌 **Soft Obsidian(#121214)**인가?
- [ ] **모바일**: 폰에서 하단 메뉴바(Dock)와 바텀 시트가 겹치지 않는가?
- [ ] **용어**: 'Validation Error' 대신 '입력을 확인해주세요' 처럼 **쉬운 한글**을 썼는가?
- [ ] **안전**: 금고 잔액 수정 시 '변경 사유'를 입력하지 않으면 버튼이 잠기는가?
- [ ] **성능**: 유저 목록 1,000개를 불러올 때 버벅임이 없는가?

## 9. 구현 순서도 (Implementation Roadmap)

### Step 1: Foundation (환경 설정)
- [ ] **Theme Setup**: Soft Obsidian(`bg-[#121214]`) 테마 및 Typography(Pretendard) 적용
- [ ] **Layout Shell**: Mobile Dock(하단 메뉴) + Desktop Sidebar 반응형 구조 구현
- [ ] **Common UI**: `Shadcn/UI` 설치 및 커스텀(Rounded-2xl, Warm Gray)

### Step 2: Ops Dashboard (Monitoring)
- [ ] **Bento Layout**: KPI 카드 배치 및 그리드 정렬(4px Rule)
- [ ] **Golden Radar**: 상태 신호등(Pulsating Dot) 위젯 구현
- [ ] **Log Feed**: 실시간 로그용 `Animated List` 적용

### Step 3: User CRM (Action)
- [ ] **User Table**: Tanstack Table 기반 검색/필터/페이지네이션
- [ ] **Detail Drawer**: 하단 시트(Mobile) / 우측 서랍(PC) 통합 뷰 구현
- [ ] **History Tab**: 게임/금고/상담 이력 탭 뷰 구성

### Step 4: Economy Ops (Control)
- [ ] **Vault Control**: 밀어서 승인(Slide to Approve) 버튼 구현
- [ ] **Shop Manager**: 상품 CRUD 및 재고 관리 폼 (Mobile-friendly)

### Step 5: Safety & Polish
- [ ] **Audit Check**: 변경 사유(Reason) 강제 입력 로직 검증
- [ ] **Korean Patch**: 'Validation Error' 등 영문 메시지 전체 한글화

## 10. 변경 이력
- v1.3 (2026-01-19, Antigravity Agent): 구현 순서도(Roadmap) 추가
- v1.2 (2026-01-19, Antigravity Agent): 디자인 가이드(Soft Obsidian) 반영 및 용어 한글화
- v1.1 (2026-01-19, Antigravity Agent): Magic UI Ops 적용 전략 추가
- v1.0 (2026-01-19, Antigravity Agent): Artifact 기반으로 공식 문서화
