# Golden V2: Semi-Automatic CRM & Evidence Center Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 골든 AI가 대상을 추출하고 관리자가 승인하는 **"반자동 리텐션 시스템"**과 그 효과를 증명하는 **"증거 센터(Evidence Center)"** 구축.

**Architecture:** 
1. **Engine (Processing)**: `GoldenInterventionService`가 트리거 시 즉시 발송하지 않고 `PENDING_APPROVAL` 상태로 DB에 적재.
2. **Approval App (Human Check)**: `MarketingCenterPage` 내 [발송 대기 함]에서 관리자가 대상자를 검토하고 '최종 승인/거절' 수행.
3. **Analysis (Output)**: 승인된 메시지 발송 후 리텐션(D-2) 및 외부 CC 입금액 기여도를 **퍼널/코호트**로 시각화.

**Tech Stack:** React (Vite), FastAPI, SQLAlchemy (MySQL), Redis.

---

### Task 1: Semi-Automatic CRM Engine Backend

**Files:**
- Modify: `app/v2/models/v2_golden_intervention_log.py` (Add `status` field)
- Modify: `app/v2/services/golden_intervention_service.py` (Flow change to PENDING)
- Create: `app/v2/api/admin/crm_routes.py` (Approval/Stats API)

**Step 1: Write the failing test**
```python
def test_intervention_creates_pending_log(client, db):
    # Simulate trigger (e.g. TRG_LOSE_5)
    # Assert V2GoldenInterventionLog has status='PENDING_APPROVAL'
```

**Step 2: Update Schema & Logic**
- `V2GoldenInterventionLog`: `status` (PENDING_APPROVAL, APPROVED, REJECTED, SENT) 추가.
- `resolve_intervention`: 자율 실행 대신 대기열 적재 로직으로 변경.

**Step 3: Implement Approval API**
- `POST /admin/crm/approve`: 상태를 APPROVED/SENT로 변경하고 실제 발송 호출.
- `GET /admin/crm/pending`: 대기 중인 리스트 조회.

**Step 4: Commit**
```bash
git add app/v2/models/v2_golden_intervention_log.py app/v2/services/golden_intervention_service.py
git commit -m "feat(crm): implement semi-automatic approval queue backend"
```

---

### Task 2: Intuitive "Approval & Evidence" Dashboard UI

**Files:**
- Modify: `src/v2/admin/pages/dashboard/MarketingCenterPage.tsx`
- Create: `src/v2/admin/components/crm/ApprovalQueue.tsx`

**Step 1: Design Approval Center Tab**
- V1의 직관적 요소를 Bento Grid로 배치 (DAU, CC 입금, Churn Risk).
- **[발송 대기 함]** 섹션: 대상 유저, 트리거 이유, 예상 보상, [승인/제외] 버튼.

**Step 2: Implement Funnel/Cohort Visualization**
- `FunnelChart`: 추출 -> 승인 -> 발송 -> 복귀 단계별 시각화.
- `CCImpactCard`: 골든 개입 후 유저의 외부 입금액(CC) 변화 리포트.

**Step 3: Integrate Logic**
- `useV2Admin` 훅에 CRM API 연동.
- 승인 클릭 시 실시간 리프레시 및 상태 반영.

**Step 4: Commit**
```bash
git add src/v2/admin/pages/dashboard/MarketingCenterPage.tsx
git commit -m "ui(crm): implement semi-automatic approval UI and evidence funnel"
```

---

## Verification Plan

### Automated Tests
- `pytest tests/v2_tests/test_crm_flow.py`: 추출 -> 대기 -> 승인 -> 발송 전 과정 검증.

### Manual Verification
1. **Trigger Check**: 의도적 연패 등으로 인터벤션 발생시킨 후, [마케팅 센터 - 발송 대기 함]에 해당 유저가 뜨는지 확인.
2. **Human Approval**: 관리자가 '승인' 버튼을 누를 때만 실제 텔레그램 메시지/보상이 지급되는지 확인.
3. **Evidence Wow**: 결제 유저(Whale) 세그먼트와 외부 입금액(CC) 데이터가 대시보드에서 직관적으로 대조되는지 확인.
