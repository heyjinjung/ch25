# 리텐션 실행 계획 (시스템 기반)

[골든 레코드 전략](c:\Users\JAVIS\ch\ch25\docs\09_marketing\retention_data_requirements.md)과 현재 [시스템 스키마](c:\Users\JAVIS\ch\ch25\docs\00_meta\weekly\%5B20261%EC%9B%94%EC%B2%AB%EC%A7%B8%EC%A3%BC%5D_%ED%95%B5%EC%8B%AC%EB%AC%B8%EC%84%9C_%EC%9D%B8%EB%8D%B1%EC%8A%A4.md)에 기반하여, 즉시 실행 가능한 로드맵을 정의합니다.

## 1. 시스템 역량 매핑 (현황 분석)

| 목표 | 유저 욕구 | 현재 시스템 기능 | 실현 가능성 |
| :--- | :--- | :--- | :--- |
| **습관 형성** | 일일 미션 | **시즌패스 (일일 퀘스트 대용)** | ✅ **높음** (설정만으로 가능) |
| **경쟁** | 리더보드 | **랭킹 시스템** (구축됨) | ✅ **높음** |
| **가변 보상** | 랜덤 박스 | **복권 / 랜덤박스** | ✅ **높음** (설정만으로 가능) |
| **사회적 증명** | 잭팟 티커 | **공개 피드 (`JACKPOT_WIN`)** | ✅ **높음** (존재함) |
| **구제 (Bailout)** | "불운 위로금" | **없음** (로직 필요) | ⚠️ **중간** (개발 필요) |
| **개인화** | "타이밍" 넛지 | **없음** (데이터 필요) | ⚠️ **중간** (개발 필요) |
| **충성도** | "VIP" 대우 | **금고 (레벨/이율)** | ✅ **높음** (설정만으로 가능) |

---

## 2. 실행 단계 (Execution Phases)

### Phase 1: 운영 튜닝 (No Code)
*어드민 콘솔을 사용하여 즉시 시작합니다.*

1.  **일일 미션 구성**:
    *   **시즌패스**를 "일일 미션" 대용으로 사용합니다.
    *   시즌 레벨 1~30을 매일 하나씩 달성할 수 있는 난이도로 설정합니다 (1레벨 = 1일 플레이).
    *   *제약*: 매일 자동 리셋은 안 되지만, "월간 출석부" 역할을 수행할 수 있습니다.
2.  **"골든 아워" 활성화**:
    *   어드민의 **게릴라 드롭 (`GUERRILLA_DROP`)** 기능을 사용합니다.
    *   피크 타임(예: 20:00 KST)에 수동으로 트리거합니다.
    *   메시지: "🔥 앞으로 10분간 확률 2배!"
3.  **세그먼트 푸시 (수동)**:
    *   유저 세그먼트 로그(`CC0109_Updated.csv`)를 활용합니다.
    *   `WARNING`(이탈위험) 그룹에게 수동으로 문자/텔레그램을 발송합니다.

### Phase 2: 엔지니어링 MVP ("골든 레코드" 구축)
*자동화된 리텐션을 위해 1~2주 내 구현합니다.*

1.  **백엔드: "감정" 추적**:
    *   **신규 로직**: `ActivityService`에서 `LOSE` 결과가 5회 이상 연속될 때를 감지.
    *   **액션**: Redis에 `loss_streak` 저장.
2.  **백엔드: "구제(Bailout)" 트리거**:
    *   **신규 API**: `/api/bonus/bailout`.
    *   **로직**: `loss_streak >= 10` 이고 `balance < 100` 일 때, `EMERGENCY_FUND` (예: 10,000원 잠김 금고) 지급.
3.  **프론트엔드: "비공개 피드"**:
    *   `USER_ASSET_UPDATE` 스키마(현재 *Future* 상태)를 구현합니다.
    *   특정 유저에게만 보이는 토스트 메시지 허용 ("🎁 매니저가 선물을 보냈습니다!").

### Phase 3: 자동화 ("두뇌" 장착)
*장기 목표입니다.*
*   **동적 상점 (Dynamic Shop)**: `User Segment`에 따라 상점 상품을 다르게 노출.
*   **오토 넛지 (Auto-Nudge)**: `last_login > 3 days`일 때 시스템이 자동으로 알림 발송.

---

## 3. 즉시 실행 항목 (향후 24시간)

1.  **[문서]** `docs/00_meta/2026_strict_vault_policy.md`에 "연패 스트릭" 임계값과 "구제 금융" 금액 정의.
2.  **[설정]** **시즌패스**를 "일일 출석부"처럼 작동하도록 업데이트 (스탬프당 기본 XP = 1 레벨).
3.  **[개발]** 새로운 `RetentionService`에서 `loss_streak` 카운터 프로토타입 개발.

---

## 4. 실행 결과 리포트 (2026-01-18)

### A. 증거 수집 요약
- `stream:raw_logs` 테스트 이벤트 주입 → 워커 소비 확인
- `ch25:state:*` 상태 키 갱신 확인 (LOSS_STREAK/psych_state)
- `ch25_events` publish 수신 확인 (experiment_group 포함)
- WS `/api/ws/events` 수신 확인
- DB 영속성 확인(`event_participation_log`), Redis 중지 상태에서도 조회 가능
- 신규 개입 API(`/api/retention/intervention/resolve`) 구현 완료(운영 미확인)
- 재참여 큐 API(`/api/retention/reengagement/queue`) 구현 완료(운영 미확인)
- Reward_Size ≤ Cmax 캡 + ROI 로그(`retention_roi_log`) 구현 완료(운영 미확인)

### B. 미확인/제약
- UI 토스트: 텔레그램 인증 필요로 로컬 확인 불가
- 어뷰징 필터/롤백 플래그: 추가 확인 필요
- 신규 개입/재참여 API 운영 증거 필요

### C. 참조
- 체크리스트: [docs/09_marketing/golden/04_report/golden_system_integration_checklist_v1.md](docs/09_marketing/golden/04_report/golden_system_integration_checklist_v1.md)
- 진행도 보고서: [docs/09_marketing/golden/04_report/golden_progress_report_20260118.md](docs/09_marketing/golden/04_report/golden_progress_report_20260118.md)

### D. 결과 리포트 초안 (진행중)
#### 1) 지표 스냅샷(일/주)
- LOSS_STREAK 이벤트 수: TBD (대시보드 확인 필요)
- ASSET_DEPLETION 이벤트 수: TBD (대시보드 확인 필요)
- SESSION_END 이벤트 수: TBD (대시보드 확인 필요)

#### 2) 실험군 분배 결과 요약
- Control/FreeSpin/Cashback/Mission 분배 비율: TBD (대시보드 확인 필요)

#### 3) 이슈/개선점
- UI 토스트 증거: 텔레그램 인증 필요로 로컬 확인 불가 → 운영 환경 캡처 필요
- 롤백 플래그 검증: 토글 검증 미완 → 운영 점검 필요
- 알람 임계치(X/Y/Z): 기준 수치 확정 필요
