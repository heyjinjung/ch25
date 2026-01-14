# Admin Ops 시스템 업그레이드: 11대 위기 신호 시나리오 및 기술 명세

**작성일**: 2026-01-13
**작성자**: Antigravity (AI)
**문서 위치**: `docs/06_ops/202601/20260113_ops_crisis_scenarios_spec.md`

---

## 1. 개요 (Overview)

### 배경 및 목표
기존 **마케팅 대시보드**는 다양한 KPI를 보여주지만, 운영자가 이를 보고 구체적으로 어떤 액션을 취해야 할지 직관적이지 않았습니다.
본 문서는 대시보드의 데이터를 **"11가지 위기/기회 신호(Crisis Signals)"**로 실시간 진단하고, 클릭 한 번으로 **"대상자 목록(Target List)"**을 생성하여 즉시 마케팅 액션을 수행할 수 있는 시스템 설계를 정의합니다.

### 핵심 가치
*   **Active Operation**: "보는 대시보드"에서 "쓰는 도구"로 전환.
*   **One-Click Action**: 진단부터 실행까지 3단계(감지 -> 클릭 -> 발송)로 단축.
*   **Data-Driven**: 실제 유저 행동 데이터(`sheet3_data.csv`) 기반의 정교한 타겟팅.

---

## 2. 11대 위기 신호 시나리오 (Marketing Scenarios)

어드민은 다음 11가지 시나리오를 통해 유저 상태를 진단하고 최적의 치료제를 처방합니다.

### Group A. 뉴비 & 초기 정착 (Onboarding Risk)
| # | 시나리오명 (Persona) | 진단 기준 (Diagnosis) | 처방전 (Action / Payload) |
|:--|:---|:---|:---|
| 1 | **불운한 뉴비**<br>(Unlucky Newbie) | 가입 24H 내, 베팅 10회+, 잔액 0원 (All-in) | **구조대 파견**<br>- 체험 티켓 3장 + 1,000P 지급<br>- Msg: "사장님, 초기 불운을 씻어낼 지원금 도착했습니다." |
| 2 | **작심일일**<br>(One-Day Tester) | 가입 당일 활발했으나, D+1(다음날) 미접속 | **작심삼일 부스트**<br>- 3일 연속 접속 서약 보상 제안<br>- Msg: "오늘만 출석하시면 내일 [대박 보상] 확정입니다!" |
| 3 | **아이쇼핑족**<br>(Window Shopper) | 무료 티켓 전량 소진, 입금 0원 | **첫충전 딜 (First Deposit Deal)**<br>- 1만원 충전 시 2만원 적립 제안<br>- Msg: "오늘 딱 하루, 만원만 넣으셔도 2배로 불려드립니다." |

### Group B. 이탈 위험 관리 (Churn Prevention)
| # | 시나리오명 (Persona) | 진단 기준 (Diagnosis) | 처방전 (Action / Payload) |
|:--|:---|:---|:---|
| 4 | **잠자는 금고 주인**<br>(Sleeping Vault) | 미접속 7일+, 금고 잔액 > 1만원 | **금고 리콜 (Loss Aversion)**<br>- 잔액 소멸 경고 알림<br>- Msg: "🚨 [긴급] 금고 속 15,400원이 오늘 밤 소멸 예정입니다." |
| 5 | **돌아선 단골**<br>(Turning Regular) | 최근 30일 접속 15회+ (Active) 였으나,<br>최근 10일간 침묵 | **컴백 보너스**<br>- 즉시 사용 가능한 5,000P 지급<br>- Msg: "오랜만입니다! 돌아오시면 바로 쓰실 수 있는 보너스 넣어뒀습니다." |
| 6 | **끊긴 스트릭**<br>(Broken Streak) | 7일 이상 연속 접속하다가 어제 결석 | **스트릭 복구권**<br>- 접속 시 스트릭 유지 처리 보장<br>- Msg: "앗! 어제 깜빡하셨나요? 지금 오시면 개근 인정해드립니다." |

### Group C. VIP & 고가치 유저 (High Value Care)
| # | 시나리오명 (Persona) | 진단 기준 (Diagnosis) | 처방전 (Action / Payload) |
|:--|:---|:---|:---|
| 7 | **정체된 등반가**<br>(Stuck Climber) | 레벨 4~5 구간에서 48H 이상 체류,<br>XP 획득 0 | **특진 기회 (Secret Voucher)**<br>- 골드키 교환권 슬쩍 지급<br>- Msg: "부장님 몰래 골드키 하나 챙겨드립니다. VIP 라운지 구경오세요." |
| 8 | **지루해진 VIP**<br>(Bored VIP) | 레벨 10+, 최근 주간 활동량이<br>전주 대비 50% 급감 | **시크릿 기프트 (VIP Care)**<br>- 전담 매니저 1:1 안부 + 선물<br>- Msg: "이사님, 요즘 뜸하시네요. 시시해서 재미 없으신가요? (선물 동봉)" |

### Group D. 리스크 관리 (Risk Management)
| # | 시나리오명 (Persona) | 진단 기준 (Diagnosis) | 처방전 (Action / Payload) |
|:--|:---|:---|:---|
| 9 | **분노의 배팅러**<br>(Tilting Player) | 10분 내 5연패 또는 시드머니 50% 급락 | **강제 진정제 (Cool Down)**<br>- 커피값 3,000P + 휴식 권고<br>- Msg: "잠시만요! 흐름이 안 좋습니다. 담배 한대 태우고 오시죠." |
| 10 | **체리피커/어뷰저**<br>(Bonus Hunter) | 입금 0원 & 출금 시도 하거나,<br>전체 수익 중 보너스 비중 90%+ | **출금 규정 안내 (Soft Block)**<br>- 정중한 출금 거절 및 규정 고지<br>- Msg: "현재 보너스 비율이 너무 높습니다. 정상 이용 부탁드립니다." |

### Group E. 외부 데이터 연동 (External Intel)
| # | 시나리오명 (Persona) | 진단 기준 (Diagnosis) | 처방전 (Action / Payload) |
|:--|:---|:---|:---|
| 11 | **외부 VIP 대우**<br>(External VIP Reward) | 1. 외부 입금액(`deposit_amount`) 상위 (예: 100만+)<br>2. 데이터 입력일(`updated_at`) 최신 (예: 7일 이내) | **VIP 감사 보너스 (Retention Hook)**<br>- 타사 이용 실적 인정 및 특별 보너스<br>- Msg: "타사 이용 내역이 확인되어, 특별 VIP 감사 보너스를 드립니다." |

---

## 3. 실행 프로세스 (Execution Flow)

1.  **감지 (Alert)**: 대시보드 상단 **"위기 감지 레이더"**에서 11개 항목의 대상자 수를 실시간으로 보여줍니다. (예: `🚨 불운한 뉴비: 5명`)
2.  **생성 (Create)**: 카드를 클릭하면 **"오늘의 타겟 리스트"**로 변환되어 `Ops Plan`에 등록됩니다.
    *   중복 방지: 최근 3일 내 동일 시나리오로 메시지를 받은 유저는 자동 제외됩니다.
3.  **실행 (Execute)**: 운영자는 생성된 리스트와 미리 세팅된 메시지를 확인하고 **"보내기(Send)"** 버튼만 누르면 됩니다.

---

## 4. 상세 기술 설계 (Technical Specification)

### 4.1. 데이터베이스 스키마 (Database Schema)

#### `ops_target_list` (대상자 그룹)
| Column | Type | Description |
|:---|:---|:---|
| `id` | `Integer` (PK) | 고유 ID |
| `plan_id` | `Integer` (FK) | `ops_plan.id` 참조 (오늘의 운영 계획) |
| `name` | `String(100)` | 예: "2026-01-13 불운한 뉴비 그룹" |
| `source_type` | `String` | `SCENARIO`, `SEGMENT`, `UPLOAD` |
| `source_params` | `JSON` | 예: `{"scenario_id": 1, "threshold_balance": 0}` |
| `count_snapshot` | `Integer` | 생성 시점 인원 수 |
| `created_at` | `DateTime` | 생성 일시 |

#### `ops_target_member` (대상자 개별)
| Column | Type | Description |
|:---|:---|:---|
| `id` | `Integer` (PK) | 고유 ID |
| `target_list_id` | `Integer` (FK) | `ops_target_list.id` 참조 |
| `user_id` | `Integer` (FK) | `user.id` 참조 |
| `status` | `String` | `PENDING`(대기), `SENT`(발송됨), `FAILED`(실패) |
| `data` | `JSON` | 개인화 치환 데이터 (예: `{"loss_amount": 5000}`) |

### 4.2. 백엔드 로직 (Scenario Logic Examples)

**Scenario 1: 불운한 뉴비 (SQL)**
```sql
SELECT u.id, u.nickname
FROM user u
JOIN (SELECT user_id, count(*) as play_cnt FROM game_hand GROUP BY user_id) h ON h.user_id = u.id
WHERE u.created_at >= NOW() - INTERVAL 1 DAY -- 가입 24시간 내
AND u.vault_balance = 0 -- 잔액 0원
AND h.play_cnt >= 10 -- 최소 10판 플레이
```

**Scenario 11: 외부 VIP (SQL)**
*내부 충전액 비교 없음, 오직 외부 데이터 가치 평가*
```sql
SELECT u.id, e.deposit_amount
FROM external_ranking_data e
JOIN user u ON u.id = e.user_id
WHERE e.deposit_amount >= 1000000 -- 외부 입금 100만 이상
AND e.updated_at >= NOW() - INTERVAL 7 DAY -- 최근 7일 내 갱신된 데이터
```

### 4.3. API 명세 (API Specs)

#### `GET /api/v1/admin/dashboard/crisis-signals`
*   **목적**: 대시보드 레이더용 실시간 통계
*   **Response**:
    ```json
    {
      "signals": [
        { "id": "SCENARIO_01", "name": "불운한 뉴비", "count": 12, "level": "HIGH" },
        { "id": "SCENARIO_11", "name": "외부 VIP", "count": 3, "level": "SPECIAL" }
      ]
    }
    ```

#### `POST /api/v1/admin/ops/plans/{plan_id}/import-target`
*   **목적**: 시나리오 대상을 타겟 리스트로 변환
*   **Request**: `{ "scenario_id": "SCENARIO_01" }`
*   **Logic**:
    1.  해당 시나리오 SQL 실행
    2.  `ops_target_list` 레코드 생성
    3.  결과 유저들을 `ops_target_member`로 Bulk Insert
    4.  최근 발송 이력 필터링 적용

### 4.4. 프론트엔드 UI

#### `CrisisRadarWidget` (`MarketingDashboardPage.tsx`)
*   **Visual**: 11개 시나리오 카드를 Carousel로 표시. `High` 등급은 붉은색 맥동 효과, `Special` 등급은 금색 테두리 효과.
*   **Action**: 카드 클릭 시 `PlanImportModal`을 띄워 미리보기 및 확정 유도.

#### `PlanImportModal`
*   **Visual**: "총 12명의 불운한 뉴비가 발견되었습니다. 구조대를 파견하시겠습니까?"
*   **Action**: "작전 실행" 버튼 클릭 시 `AdminOpsPlanPage`로 이동하며 Task 자동 생성.


 데이터베이스 스키마 분석 (DB Schema Analysis)
요청하신 대로 **"기존 테이블 중복 활용 가능성"**과 **"확장 필요 영역"**을 면밀히 분석했습니다.

1. 중복/재사용 가능성 검토 (Existing Models)
A. user_segment (Existing)
구조: user_id (PK), 
segment
 (String).
분석: 유저당 하나의 세그먼트만 가질 수 있는 1:1 구조입니다.
한계: 우리가 필요한 "11개 시나리오 중복 해당" 및 "오늘의 Ops Plan을 위한 일회성 스냅샷"을 지원하지 못합니다. (예: A유저가 '불운한 뉴비'이면서 동시에 '잠재적 VIP'일 수 있음).
결론: 재사용 불가. Ops 타겟팅용 별도 테이블 필요.
B. segment_rule (Existing)
구조: 세그먼트 자동 분류 규칙 정의 (조건문 JSON).
분석: 자동 배치(Batch) 잡을 위한 정적 규칙입니다.
한계: 운영자가 실시간으로 클릭해서 만드는 "Ad-hoc Target List"의 개념이 없습니다.
결론: 참고는 가능하나, 직접 활용은 어려움.
C. ops_plan_task (Existing)
구조: ops_plan에 종속된 개별 작업. payload_json 필드 보유.
분석: payload_json에 타겟 유저 ID 목록을 통째로 넣는 방법도 고려해볼 수 있습니다 ({"target_user_ids": [1, 2, 3...]}).
한계: 대상자가 수천 명일 경우 JSON 필드 용량 한계 및 검색/조회 성능 저하 발생. 개별 유저별 발송 상태(SENT, FAILED) 추적이 불가능함.
결론: 소규모(10명 이하)라면 가능하나, 확장성 면에서 별도 테이블 분리 필수.
2. 영역 확장 제안 (Proposed Expansion)
기존 테이블로는 "대규모 인원 스냅샷" 및 "개별 발송 추적"이 불가능하므로, 
Ops
 도메인 내에서 다음 영역을 확장해야 합니다.

[확장 1] ops_target_list (신규 정의 필요)
ops_plan (운영 계획)과 1:N 관계로 매핑되는 **"대상자 그룹 명부"**입니다.

역할: "이 리스트는 2026-01-13 플랜의 '불운한 뉴비' 타겟팅용이다"라는 메타데이터 저장.
재사용성: 향후 'Manual Upload' (엑셀 업로드) 기능 구현 시에도 이 테이블을 공통 컨테이너로 재사용 가능.
[확장 2] ops_target_member (신규 정의 필요)
실제 대상자 개개인을 관리하는 테이블입니다.

역할: 유저 ID 매핑 + 개인화 데이터 저장.
확장 포인트: data JSON 컬럼을 두어, 시나리오별로 상이한 보상액이나 메시지 변수(예: { "loss_amount": 50000 })를 유연하게 담을 수 있게 설계합니다.
3. 최종 스키마 권장안 (Recommendation)
기존 ops_plan 영역을 보조하는 서브 모듈(Sub-module) 형태의 확장을 권장합니다.

has
contains
targets
ops_plan
ops_target_list
int
id
PK
string
source_type
SCENARIO vs UPLOAD
json
source_params
조건 스냅샷
ops_target_member
int
id
PK
int
user_id
FK
string
status
PENDING/SENT
json
data
개인화변수
user
이 구조는 기존 
User
나 Game 테이블을 건드리지 않고 
Ops
 영역만 깔끔하게 확장하므로 사이드 이펙트가 가장 적습니다.