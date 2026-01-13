# Admin Ops 시스템 업그레이드: 10+1 위기 신호 시나리오 설계 (Technical Spec Included)

## 목표 (Goal Description)
`리텐션_마케팅_가이드.md`와 `sheet3_data.csv`의 내부 데이터 분석 결과에 더해, **외부 입금 랭킹(External Ranking)** 데이터를 활용한 히든 시나리오를 추가합니다.
타 사이트(외부)에서의 이용 실적을 외부 입금 랭킹 데이터(`deposit_amount`, `updated_at`)로 확인하여, 우리 서비스의 리텐션 후킹 요소로 활용합니다.

## 상세 마케팅 설계 (11 Crisis Scenarios)

### Group A. 뉴비 & 초기 정착 (Onboarding Risk)
| # | 시나리오명 | 데이터 매핑 | 진단 기준 | 처방전 (Action) |
|:--|:---|:---|:---|:---|
| 1 | **불운한 뉴비**<br>(Unlucky Newbie) | `1회성_테스트` 가능성 | 가입 24H 내, 베팅 10회+, 잔액 0원 | **구조대 파견**<br>체험 티켓 3장 + 1,000P |
| 2 | **작심일일**<br>(One-Day Tester) | `1회성_테스트` & `이탈위험(단기)` | 가입 당일 활성 후 D+1 미접속 | **작심삼일 부스트**<br>3일 연속 접속 시 보상 제안 |
| 3 | **아이쇼핑족**<br>(Window Shopper) | `일반_유지` 중 미입금 | 무료 티켓 소진, 입금 0원 | **첫충전 딜**<br>1만원 충전 시 2만원 적립 |

### Group B. 이탈 위험 관리 (Churn Prevention)
| # | 시나리오명 | 데이터 매핑 | 진단 기준 | 처방전 (Action) |
|:--|:---|:---|:---|:---|
| 4 | **잠자는 금고 주인**<br>(Sleeping Vault) | `이탈위험(단기)` (7~9일) | 미접속 7일+, 금고 잔액 > 1만원 | **금고 리콜**<br>소멸 임박 알림 (Loss Aversion) |
| 5 | **돌아선 단골**<br>(Turning Regular) | `이탈위험(중기)` (10~15일) | 최근 30일 접속 15회+였으나<br>최근 10일 무반응 | **컴백 보너스**<br>즉시 사용 가능한 5,000P 지급 |
| 6 | **끊긴 스트릭**<br>(Broken Streak) | `일반_유지` 스트릭 중단 | 7일 연속 접속 후 어제 결석 | **스트릭 복구권**<br>"어제만 봐드립니다" (Streak Repair) |

### Group C. VIP & 고가치 유저 (High Value Care)
| # | 시나리오명 | 데이터 매핑 | 진단 기준 | 처방전 (Action) |
|:--|:---|:---|:---|:---|
| 7 | **정체된 등반가**<br>(Stuck Climber) | `일반_유지` 레벨 정체 | 레벨 4~5 구간 48H 체류,<br>XP 획득 0 | **특진 기회**<br>골드키 교환권(Voucher) 슬쩍 지급 |
| 8 | **지루해진 VIP**<br>(Bored VIP) | `활성` VIP 활동 감소 | 레벨 10+, 활동량 전주 대비 50%↓ | **시크릿 기프트**<br>전담 매니저 1:1 안부 + 선물 |

### Group D. 리스크 관리 (Risk Management)
| # | 시나리오명 | 데이터 매핑 | 진단 기준 | 처방전 (Action) |
|:--|:---|:---|:---|:---|
| 9 | **분노의 배팅러**<br>(Tilting Player) | `개진상` 진입 전조 | 10분 내 5연패 or 시드 50% 급락 | **강제 진정제**<br>3,000P + "좀 쉬었다 하시죠" |
| 10 | **체리피커 경고**<br>(Bonus Hunter) | `작업/완전꽁머니` | 입금 0원 & 출금 시도 or<br>보너스 수익 비중 90%+ | **출금 규정 안내**<br>정중한 거절 및 규정 고지 |

### Group E. 외부 데이터 연동 (External Intel)
| # | 시나리오명 | 데이터 매핑 | 진단 기준 | 처방전 (Action) |
|:--|:---|:---|:---|:---|
| 11 | **외부 VIP 대우**<br>(External VIP Reward) | **External Ranking Data**<br>(`deposit_amount`, `updated_at`) | 1. 외부 입금액(`deposit_amount`) 상위 (예: 100만원+)<br>2. 데이터 입력일(`updated_at`)이 최신 (예: 7일 이내) | **VIP 감사 보너스**<br>"타사 이용 감사 선물 지급" (Retention Hook) |

## ⚙️ 데이터베이스 스키마 분석 (DB Schema Analysis)

요청하신 대로 **"기존 테이블 중복 활용 가능성"**과 **"확장 필요 영역"**을 면밀히 분석했습니다.

### 1. 중복/재사용 가능성 검토 (Existing Models)

#### A. `user_segment` (Existing)
*   **구조**: `user_id` (PK), `segment` (String).
*   **분석**: 유저당 하나의 세그먼트만 가질 수 있는 1:1 구조입니다.
*   **한계**: 우리가 필요한 "11개 시나리오 중복 해당" 및 "오늘의 Ops Plan을 위한 일회성 스냅샷"을 지원하지 못합니다. (예: A유저가 '불운한 뉴비'이면서 동시에 '잠재적 VIP'일 수 있음).
*   **결론**: **재사용 불가**. Ops 타겟팅용 별도 테이블 필요.

#### B. `segment_rule` (Existing)
*   **구조**: 세그먼트 자동 분류 규칙 정의 (조건문 JSON).
*   **분석**: 자동 배치(Batch) 잡을 위한 정적 규칙입니다.
*   **한계**: 운영자가 실시간으로 클릭해서 만드는 "Ad-hoc Target List"의 개념이 없습니다.
*   **결론**: 참고는 가능하나, 직접 활용은 어려움.

#### C. `ops_plan_task` (Existing)
*   **구조**: `ops_plan`에 종속된 개별 작업. `payload_json` 필드 보유.
*   **분석**: `payload_json`에 **타겟 유저 ID 목록**을 통째로 넣는 방법도 고려해볼 수 있습니다 (`{"target_user_ids": [1, 2, 3...]}`).
*   **한계**: 대상자가 수천 명일 경우 JSON 필드 용량 한계 및 검색/조회 성능 저하 발생. 개별 유저별 발송 상태(`SENT`, `FAILED`) 추적이 불가능함.
*   **결론**: 소규모(10명 이하)라면 가능하나, **확장성 면에서 별도 테이블 분리 필수**.

### 2. 영역 확장 제안 (Proposed Expansion)

기존 테이블로는 "대규모 인원 스냅샷" 및 "개별 발송 추적"이 불가능하므로, `Ops` 도메인 내에서 다음 영역을 확장해야 합니다.

#### [확장 1] `ops_target_list` (신규 정의 필요)
`ops_plan` (운영 계획)과 1:N 관계로 매핑되는 **"대상자 그룹 명부"**입니다.
*   **역할**: "이 리스트는 2026-01-13 플랜의 '불운한 뉴비' 타겟팅용이다"라는 메타데이터 저장.
*   **재사용성**: 향후 'Manual Upload' (엑셀 업로드) 기능 구현 시에도 이 테이블을 공통 컨테이너로 재사용 가능.

#### [확장 2] `ops_target_member` (신규 정의 필요)
실제 대상자 개개인을 관리하는 테이블입니다.
*   **역할**: 유저 ID 매핑 + **개인화 데이터** 저장.
*   **Update**: **결과 추적(Result Tracking)** 컬럼 추가.

## ⚙️ 상세 기술 설계 (Backend Spec)

### 1. 데이터베이스 스키마 (Database Schema)

#### `ops_target_list` (대상자 그룹)
| Column | Type | Description |
|:---|:---|:---|
| `id` | `Integer` (PK) | 고유 ID |
| `plan_id` | `Integer` (FK) | `ops_plan.id` 참조 |
| `name` | `String(100)` | 화면 표시용 이름 (예: "불운한 뉴비 타겟군") |
| `source_type` | `String` | `SCENARIO`, `SEGMENT`, `UPLOAD` |
| `source_params` | `JSON` | 생성 조건 (예: `{"scenario_id": 11, "threshold": 1000000}`) |
| `count_snapshot` | `Integer` | 생성 시점의 포함 인원 수 |
| `is_processed` | `Boolean` | 처리 완료 여부 (Batch 실행 여부) |

#### `ops_target_member` (대상자 개별)
**[Update] 결과 추적(Result Check) 컬럼 추가**
| Column | Type | Description |
|:---|:---|:---|
| `id` | `Integer` (PK) | 고유 ID |
| `target_list_id` | `Integer` (FK) | `ops_target_list.id` 참조 |
| `user_id` | `Integer` (FK) | `user.id` 참조 |
| `status` | `String` | `PENDING`, `SENT`, `FAILED` |
| `data` | `JSON` | 개인화 변수 (예: `{"loss_amount": 50000}`) |
| **`result_status`** | `String` | `NONE` (미확인), `CHECKED` (확인됨) |
| **`converted_at`** | `DateTime` | 목표 행동 달성 시각 (NULL이면 미달성) |
| **`conversion_value`** | `Integer` | 전환 가치 (예: 입금액, 판수) |

### 2. 백엔드 로직 (Scenario Query Logic)

#### Scenario 1: 불운한 뉴비 (Unlucky Newbie)
```sql
SELECT u.id, u.nickname
FROM user u
JOIN (SELECT user_id, count(*) as play_cnt FROM game_hand GROUP BY user_id) h ON h.user_id = u.id
WHERE u.created_at >= NOW() - INTERVAL 1 DAY -- 가입 24시간 내
AND u.vault_balance = 0 -- 잔액 0원 (All-in)
AND h.play_cnt >= 10 -- 최소 10판 플레이
```

#### Scenario 11: 외부 VIP (Scenario 11)
```sql
SELECT u.id, e.deposit_amount
FROM external_ranking_data e
JOIN user u ON u.id = e.user_id
WHERE e.deposit_amount >= 1000000 -- 외부 입금 100만 이상
AND e.updated_at >= NOW() - INTERVAL 7 DAY -- 최근 7일 내 데이터 갱신
```

### 3. API 명세 (API Specification)

#### `GET /api/v1/admin/ops/dashboard/crisis-signals`
- **Description**: 11개 시나리오별 실시간 대상자 수 조회 (Polling 1분)
- **Response**:
```json
{
  "timestamp": "2026-01-13T18:00:00Z",
  "signals": [
    {
      "id": "SCENARIO_01",
      "name": "Unlucky Newbie",
      "count": 12,
      "level": "HIGH" // 긴급도
    },
    {
      "id": "SCENARIO_11",
      "name": "External VIP",
      "count": 3,
      "level": "SPECIAL" // 히든
    }
  ]
}
```

#### `POST /api/v1/admin/ops/plans/{plan_id}/import-target`
- **Description**: 특정 시나리오의 유저들을 `OpsTargetList`로 변환
- **Request**: `{ "scenario_id": "SCENARIO_11", "options": { "min_deposit": 500000 } }`
- **Response**: `OpsTargetList` 객체 반환

### 4. 결과 추적 및 팔로업 (Result Check & Follow-up)

**"보내고 끝"이 아니라 "먹혔는지 확인"하는 피드백 루프를 구축합니다.**

1.  **자동 추적 (Auto-Tracking)**:
    *   **Trigger**: 타겟 리스트 생성 후 24시간 뒤 배치(Batch) 또는 관리자가 수동으로 "결과 확인" 버튼 클릭.
    *   **Logic**:
        *   `Scnenario 1 (뉴비)`: 지급 후 24시간 내 **게임 플레이 횟수** 확인.
        *   `Scenario 3 (첫충전)`: 제안 후 24시간 내 **입금 발생 여부** 확인.
        *   `Scenario 11 (외부VIP)`: 보상 지급 후 **로그인 및 게임 참여** 확인.
2.  **리포팅 (Reporting)**:
    *   Ops Plan 결과 화면에 **"전환율(Conversion Rate)"** 표시. (예: "총 12명 중 4명(33%) 복귀 성공")
3.  **팔로업 (Follow-up)**:
    *   효과가 없는 그룹은 "실패(Failed)"로 분류하고, 추후 다른 시나리오(예: 더 강력한 미끼) 대상군으로 재활용.

## 🎨 프론트엔드 UI 설계 (Frontend Design Spec - ISFJ Edition)

`docs/design/*.md` 가이드라인을 준수하여, **"차분하고 예측 가능한(Calm & Predictable)"** 운영 환경을 구축합니다.

### 1. 전역 스타일 규칙 (Global Style Tokens)
*   **배경색 (Deep Calm)**: `#121214` (Soft Obsidian)
*   **컨테이너 (Surface)**: `#18181b` (Zinc-900)
*   **텍스트 (Primary)**: `#e4e4e7` (Zinc-200) / **(Secondary)**: `#a1a1aa` (Zinc-400)
*   **강조색 (Brand)**: `#6366f1` (Indigo-500)
*   **위험/경고 (Danger)**: `#f43f5e` (Rose-500) / **성공 (Success)**: `#10b981` (Emerald-500)
*   **그리드**: `4px` 단위 시스템 (`p-6`, `gap-6`, `rounded-2xl`).

### 2. 컴포넌트별 상세 디자인

#### A. 위기 감지 레이더 (Crisis Radar Widget)
**위치**: 마케팅 대시보드 상단 (기존 카드 영역 대체)
*   **레이아웃**: `grid grid-cols-4 gap-4`.
*   **카드 디자인 (Pulse Card)**:
    *   **Normal**: `bg-zinc-900/50 border border-white/5 hover:border-indigo-500/50`.
    *   **High Risk (Scenario 1,9)**: `bg-rose-500/5 border-rose-500/20` + 적색 맥동(Pulse) 애니메이션.
    *   **Hidden Gem (Scenario 11)**: `bg-amber-500/5 border-amber-500/20` + 금색 테두리(`ring-1 ring-amber-500/30`).
*   **콘텐츠**:
    *   **Title**: `text-xs font-bold text-zinc-500 uppercase tracking-widest` (시나리오명).
    *   **Value**: `text-2xl font-mono font-bold text-zinc-100` (대상자 수).
    *   **Action**: 마우스 오버 시 "작전 실행 >" 버튼 (`text-xs text-indigo-400`) 노출.

#### B. 타겟 리스트 테이블 (Target List Table)
**위치**: Ops Plan 페이지 > Target List 섹션
*   **헤더**: `sticky top-0 z-10 bg-[#121214]/90 backdrop-blur`. (`text-xs text-zinc-500 uppercase`).
*   **행(Row)**: `h-14` (56px) 등간격. `border-b border-white/5`.
    *   **시나리오 뱃지**: `Outlined Style` (`border border-indigo-500/30 text-indigo-400 bg-indigo-500/5`).
    *   **인원수**: `font-mono text-emerald-400 tabular-nums` (우측 정렬).
*   **상태 표시**: `PROCESSED` (완료) 상태는 투명도 50% 처리하여 시각적 노이즈 감소.

#### C. 원클릭 실행 모달 (One-Click Action Modal)
**위치**: 위기 감지 카드 클릭 시 팝업
*   **배경**: `bg-black/80 backdrop-blur-sm` (집중 모드).
*   **컨테이너**: `bg-zinc-900 border border-white/10 rounded-2xl w-[600px]`.
*   **Safety Zone (입력/확인 영역)**:
    *   모달 하단 액션 영역에 `bg-[#1e1e24]` 배경을 깔아 "중요한 결정"임을 암시.
    *   **미리보기**: 상단에는 대상자 Top 5 리스트 표시 (Compact List).
    *   **페이로드 설정**: 메시지 템플릿 선택 및 보상 금액 확인 (Read-only 권장).
*   **버튼**:
    *   `[취소]`: `text-zinc-400 hover:text-white`.
    *   `[작전 실행]`: `bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg`.

## 검증 계획

### 1. 시뮬레이션
*   **Step 1**: `Scenario 1` 해당 유저(가입 D-1, 0원) 3명 DB 시드 생성.
*   **Step 2**: 위기 감지 레이더에 숫자 '3' 카운트 확인.
*   **Step 3**: Import 버튼 클릭 -> Ops Target List 생성 확인.
*   **Step 4**: 결과 추적 필드(`result_status`) 초기값(`NONE`) 확인.

### 2. 결과 추적 테스트
*   **Step 5**: 대상 유저 중 1명이 로그인 및 게임 플레이.
*   **Step 6**: 결과 확인(Check Result) 로직 실행.
*   **Step 7**: 전환된 유저의 `converted_at` 타임스탬프 기록 확인 및 `result_status` -> `CHECKED` 변경 확인.
