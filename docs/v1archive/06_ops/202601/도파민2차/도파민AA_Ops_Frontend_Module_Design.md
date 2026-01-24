# 🧩 Ops Frontend Module Design (Action Modules)

**작성일**: 2026-01-16
**목적**: `AdminOpsPlanPage.tsx`의 모놀리식 구조를 해체하고, 상황별로 최적화된 "조립식 액션 모듈" 상세 설계.

---

## 1. 컴포넌트 계층 구조 (Component Hierarchy)

전체 UI를 **[컨테이너] - [모듈] - [부품]** 3단계로 분해합니다.

```mermaid
graph TD
    Page[AdminOpsPlanPage] --> TaskList[OpsTaskList]
    TaskList --> TaskCard[OpsTaskCard]
    
    TaskCard --> TaskEditor[TaskEditor (Form)]
    TaskCard --> ResultView[ExecutionResultView (Feedback)]

    %% The Core Switcher
    TaskEditor -- "type=TOGGLE" --> ModToggle[ActionModuleToggle]
    TaskEditor -- "type=DM/BROADCAST" --> ModMsg[ActionModuleMessage]
    TaskEditor -- "type=GRANT" --> ModGrant[ActionModuleGrant]

    %% Atoms (Reusable Parts)
    ModToggle --> TargetSelect[TargetListSelect]
    ModMsg --> TargetSelect
    ModGrant --> TargetSelect
    ModGrant --> ItemSelect[ItemSelect (Combobox)]
    
    %% Common
    TaskEditor --> TimePicker[TimeSlotPicker]
```

---

## 2. 핵심 "부품" (Atoms) 설계

가장 기초가 되는 입력 컴포넌트입니다.

### 2.1. `ItemSelector` (아이템 선택기)
*   **기능**: 수천 개의 아이템 코드 중 원하는 것을 검색/선택.
*   **UX**:
    *   입력: `다이아` 검색 -> 목록에 `💎 DIAMOND (재화)` 표시.
    *   출력: `DIAMOND` (코드 값).
*   **Props**:
    ```typescript
    interface ItemSelectorProps {
      value: string; // "DIAMOND"
      onChange: (code: string) => void;
      categoryFilter?: "CURRENCY" | "TICKET" | "ALL";
    }
    ```

### 2.2. `TargetListSelector` (타겟 리스트 선택기)
*   **기능**: 현재 Plan에 유효한 타겟 리스트를 조회하고 선택.
*   **UX**:
    *   드롭다운: `[#52] 윈도우 쇼퍼 (1,240명)`
    *   선택 시 우측에 빨간색/초록색 뱃지로 "처리됨/대기중" 상태 표시.
*   **Props**:
    ```typescript
    interface TargetListSelectorProps {
      planId: number;
      value: number | null; // target_list_id
      onChange: (id: number | null) => void;
    }
    ```

---

## 3. "액션 모듈" (Feature Modules) 설계

운영자가 수행하려는 **'의도(Intent)'** 단위의 컴포넌트입니다.

### 3.1. `ActionModuleToggle` (골든아워 제어)
*   **목적**: 서버 전체 설정 변경.
*   **필드 구성**:
    *   **모드 선택**: [🔴 강제 종료] [🟢 강제 가동] [⚡ 배수 조정] (Segmented Control)
    *   **배수 입력**: `multiplier` (배수 조정 모드일 때만 노출, Stepper UI 0.1 단위)
*   **프리뷰**: "현재: 1.0배 → **변경 후: 2.5배**" (직관적 비교)

### 3.2. `ActionModuleMessage` (DM/공지 발송)
*   **목적**: 메시지 발송. (DM과 Broadcast 통합 처리)
*   **필드 구성**:
    *   **수신자**: [전체 유저] vs [특정 타겟 리스트] (Radio Group)
        *   타겟 선택 시 `TargetListSelector` 활성화.
    *   **채널**: [텔레그램 DM] vs [전체 공지방]
    *   **메시지**: 텍스트 에어리어 (PII 감지 로직 내장).
*   **안전 장치**:
    *   PII(전화번호 등) 감지 시 "전송 불가" 버튼 잠금 및 경고 모달.
    *   전체 유저 대상 발송 시 "⚠️ 전체 발송" 빨간색 테두리 경고.

### 3.3. `ActionModuleGrant` (보상 지급)
*   **목적**: 아이템/재화 지급.
*   **필드 구성**:
    *   **지급 대상**: [전체 유저] vs [특정 타겟 리스트]
        *   '전체 유저' 선택 시 2차 확인 모달 트리거 (실수 방지).
    *   **아이템 목록**: `ItemSelector` + `Amount` + `[삭제]` 버튼이 있는 동적 리스트.
        *   Example: `[💎 다이아몬드] [x 1] [🗑️]`, `[🎫 룰렛 티켓] [x 5] [🗑️]`
    *   **지급 사유**: "이벤트 보상" 등 (텍스트 입력 or 프리셋 선택).

---

## 4. "피드백 뷰" (Feedback View) 설계

`Execute` 버튼을 누른 후의 경험을 책임집니다.

### 4.1. `ExecutionResultView`
*   **위치**: Task Card 하단 (접기/펼치기 가능).
*   **데이터 소스**: `payload_json["execution_result"]`.
*   **상태별 UI**:
    *   `LOADING`: 스피너 + "2,500명에게 지급 중..." (진행률 표시 가능하면 베스트).
    *   `SUCCESS`:
        *   **DM**: `✅ 텔레그램 DM (대상: Window Shopper) 발송 완료: 2,450건 / 실패: 0건`
        *   **Grant**: `🎁 지급 완료: 총 2,450명 (다이아 2,450개)`
    *   `ERROR`:
        *   `❌ 실패: 잔액 부족 (Error Code: 402)` (재시도 버튼 제공).

---

## 5. 개발 우선순위 (Implementation Phase)

1.  **Step 1**: `ItemSelector`, `TargetListSelector` (Atoms) 개발. (가장 시급한 Raw Input 제거)
2.  **Step 2**: `ActionModuleMessage`, `ActionModuleGrant` 개발 및 적용. (가장 빈번한 실수 구간)
3.  **Step 3**: `ActionModuleToggle` 및 피드백 뷰 고도화.

이 설계대로라면 운영자는 **"코드"를 몰라도**, 블록 조립하듯 안전하게 운영 계획을 세울 수 있습니다.
