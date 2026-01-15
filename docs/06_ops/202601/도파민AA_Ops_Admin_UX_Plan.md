# 🎨 Ops Admin Playbook UI 개선 제안서 (UX Improvement Plan)

**작성일**: 2026-01-16
**관련 문서**: `Ops Playbook Backend Analysis`, `AdminOpsPlanPage.tsx`
**목적**: 운영자가 "개발자 도구"가 아닌 "게임 마스터(GM) 콘솔"처럼 느낄 수 있도록 UI/UX 대개조.

---

## 1. 핵심 개선 방향 (Key Objectives)

1.  **NO MORE RAW DATA**: `item_code`나 `list_id` 같은 개발용 코드 입력을 완전히 제거합니다.
2.  **CONTEXTUAL TEMPLATES**: 고정된 템플릿 선택이 아니라, 상황에 맞는 **'부품(Action Module)'**을 조립하는 방식으로 변경합니다.
3.  **VIVID FEEDBACK**: 실행 결과는 텍스트 로그가 아닌 **'시각적 신호(Badges, Alerts)'**로 확실하게 피드백합니다.

---

## 2. 세부 개선 과제 (Detailed Tasks)

### 2.1. 인풋(Input) 시스템 혁신: "입력하지 말고 선택하게 하라"

운영자가 가장 스트레스를 받는 "오타 공포"를 시스템 레벨에서 차단합니다.

*   **[AS-IS]**:
    *   아이템 지급: `item_type` 텍스트 박스에 `VOUCHER_ROULETTE_1` 직접 입력.
    *   타겟 설정: `target_list_id` 숫자 필드에 `53` 직접 입력.

*   **[TO-BE]**:
    *   **아이템 셀렉터 (Item Selector)**:
        *   검색 가능한 드롭다운 (Searchable Combobox) 제공.
        *   친절한 한글 이름 표시: `VOUCHER_ROULETTE_1` → **"📜 룰렛 1회 이용권"**
        *   카테고리 구분: `재화(Point/Dia)` / `티켓(Ticket)` / `아이템(Item)` 그룹핑.
    *   **타겟 리스트 셀렉터 (Target List Selector)**:
        *   단순 ID 입력 대신, 현재 활성 상태인 리스트 목록을 드롭다운으로 조회.
        *   메타 정보 표시: **"🎯 [Window Shopper] (대상 1,240명)"** 형태로 선택 시 확신 부여.

### 2.2. 상황별 액션 모듈화 (Action Modularization)

단순한 템플릿 복사-붙여넣기가 아닌, 운영자가 의도(Intent)에 따라 액션을 구성할 수 있도록 지원합니다.

*   **기능 확장**: `opsPlaybookCatalog.ts`를 단순 리스트가 아닌 **'액션 라이브러리'**로 확장합니다.
    *   **"유저 전체에게 공지 쏘기"** 모듈
    *   **"특정 그룹에게 보상 주기"** 모듈
    *   **"긴급! 골든아워 발동"** 모듈
*   UI에서 `[+ 액션 추가]` 버튼 클릭 시, 위 모듈 중 하나를 선택하면 미리 세팅된 폼(Form)이 렌더링되도록 변경합니다.

### 2.3. 실행 피드백 혁신 (Visual Feedback & Receipts)

운영자가 가장 불안해하는 "이게 진짜 들어갔나?"를 해소하기 위해, 단순 텍스트 로그가 아닌 **'결과 영수증'**을 발급합니다.

*   **[AS-IS]**: 상태가 `DONE`으로 바뀌고 끝. 결과 확인불가.
*   **[TO-BE]**:
    *   **결과 영수증 (Result Receipt)**: Task 카드 하단에 실행 요약 표시.
        *   아이템 지급: `🎁 총 12,400,000 포인트가 2,450명에게 지급되었습니다.` (초록색 뱃지)
        *   메시지 발송: `📬 텔레그램 DM / 대상: Window Shopper (1,240명) - 1,200건 성공 / 40건 실패`
        *   실패 시: `❌ 실패: 유저 타겟 리스트가 비어있습니다 (Error 404)`
    *   **상황별 맞춤 피드백 (Contextual Feedback)**:
        *   **골든아워**: `[ON]/[OFF]` 스위치 UI 제공 및 "⚡ 현재 2.5배 이벤트 적용 중 (남은 시간: 45분)" 라이브 현황판 표시.
        *   **지급 미리보기**: 실행 전 "이 버튼을 누르면 약 3,000,000원이 풀립니다. 진행하시겠습니까?" 모달로 사고 방지.

### 2.4. 히스토리 및 추적성 강화 (Audit Trail)

"지난주 금요일에 누가 뭘 줬지?"를 바로 찾을 수 있게 합니다.

*   **타임라인 뷰 (Timeline View)**:
    *   단순 리스트가 아닌 시계열 형태로 "09:00 점검 보상 → 13:00 골든아워 ON" 흐름 시각화.
*   **담당자 실명제**:
    *   `Admin ID: 5` 대신 `Ops_Lead (김운영)`님이 실행함 표시.

---

## 3. 실행 계획 (Action Plan)

가장 효과가 크고 시급한 **"프론트엔드 피드백 UI 구현"**부터 시작합니다.

1.  **Backend (`OpsPlanService`)**:
    *   Task 실행 후, 결과 요약(JSON)을 `payload_json["execution_result"]`에 저장.
    *   메시지/DM 액션은 `channel`, `audience`, `target_list_id`를 함께 기록해 결과 영수증에 노출.
    *   예: `{"kind": "MESSAGE_TEMPLATE", "channel": "TELEGRAM_DM", "audience": "TARGET_LIST", "target_list_id": 120, "sent_count": 1200}`
2.  **Frontend (`ExecutionResultView`)**:
    *   위 JSON 데이터를 파싱하여 이쁘게 보여주는 React 컴포넌트를 TaskCard 하단에 부착.

---

## 4. 구현 로드맵 (Implementation Roadmap)

1.  **Phase 1: 핵심 모듈 개발 (Modules)**
    *   `ActionModuleGrant`: `ItemSelector`, `TargetListSelector` 포함.
    *   `ExecutionResultView`: 결과 영수증 컴포넌트 개발.

2.  **Phase 2: 페이지 리팩토링 (Integration)**
    *   `AdminOpsPlanPage`에 모듈 조립 및 타임라인 뷰 적용.

3.  **Phase 3: 디테일 강화 (Polish)**
    *   골든아워 라이브 현황판 및 실명제 표시 적용.

---

## 4. 기대 효과 (Expected Outcome)

*   **운영 실수 0% 도전**: 오타로 인한 잘못된 아이템 지급이나 타겟 설정 사고 원천 차단.
*   **업무 속도 3배 향상**: 코드 찾아보는 시간 제거, 클릭 몇 번으로 캠페인 세팅 완료.
*   **심리적 안정감**: 명확한 피드백을 통해 운영자가 확신을 가지고 버튼을 누를 수 있음.
