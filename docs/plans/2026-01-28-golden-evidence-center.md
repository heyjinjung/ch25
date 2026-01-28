# Golden V2 Evidence Center Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 관리자의 개입 없이도 골든 AI가 자율적으로 리텐션과 수익(CC 데이터 연동)을 창출하고 있음을 증명하는 **"골든 증거 센터(Evidence Center)"** 구축.

**Architecture:** 
1. **Backend**: `MarketingSummaryService`를 신설하여 `v2_golden_intervention_log`, `v2_retention_roi_log`, `external_ranking_data`를 교차 분석하는 집계 API 구축.
2. **Frontend**: `MarketingCenterPage.tsx`를 Bento Grid 기반의 프리미엄 디자인으로 전면 개편하여 "골든의 활동(Action)"과 "그 결과(Evidence)"를 시각화.

**Tech Stack:** React (Vite), FastAPI, SQLAlchemy (MySQL), Redis (Pub/Sub).

---

### Task 1: Backend Evidence Aggregator Implementation

**Files:**
- Create: `app/v2/services/marketing_summary_service.py`
- Create: `app/v2/api/admin/marketing_routes.py` (이미 존재 시 수정)
- Modify: `app/v2/api/admin/__init__.py` (라우터 등록)

**Step 1: Write the failing test**
```python
def test_get_golden_evidence_summary(client, admin_token):
    response = client.get("/api/v2/admin/marketing/summary", headers={"Authorization": f"Bearer {admin_token}"})
    assert response.status_code == 200
    data = response.json()
    assert "golden_performance" in data
    assert "external_ranking_impact" in data
```

**Step 2: Run test to verify it fails**
Run: `pytest tests/v2_tests/test_marketing_summary.py`
Expected: FAIL (404 Not Found)

**Step 3: Write minimal implementation**
`MarketingSummaryService`에서 다음 지표 집계 로직 구현:
- `total_interventions_24h`: 최근 24시간 자율 개입 횟수
- `golden_roi_avg`: 리텐션 ROI 평균
- `cc_deposit_total`: 외부 CC 입금 총액
- `intervened_user_cc_contribution`: 골든이 관리 중인 유저의 CC 입금 기여분

**Step 4: Run test to verify it passes**
Run: `pytest tests/v2_tests/test_marketing_summary.py`
Expected: PASS

**Step 5: Commit**
```bash
git add app/v2/services/marketing_summary_service.py app/v2/api/admin/marketing_routes.py
git commit -m "feat(golden): add marketing summary evidence api"
```

---

### Task 2: Intuitive Frontend "Evidence Dashboard" UI

**Files:**
- Modify: `src/v2/admin/pages/dashboard/MarketingCenterPage.tsx`
- Modify: `src/hooks/useV2Admin.ts` (API Hook 추가)

**Step 1: Write the failing test (Visual/Code)**
`MarketingCenterPage.tsx`에서 mock 데이터를 실제 API 연동 로직으로 교체 준비.

**Step 2: Update Component Architecture**
- `EvidenceCard`: 골든 AI의 활동(Intervention) 대비 수익 기여도를 보여주는 특수 카드.
- `CCImpactChart`: 외부 입금액과 골든의 개입 시점을 오버레이한 차트(Placeholder 우선 구현).
- `ChurnRecoveryStatus`: 위험 유저가 골든에 의해 얼마나 복구되었는지 시각화.

**Step 3: Implement minimal implementation**
`BentoGrid` 레이아웃 내에 V1의 직관적 요소를 V2 스타일로 재배치:
- 금일 활성 유저 (DAU)
- 금일 게임 플레이 (Plays)
- 티켓 사용량 (Tickets)
- **Golden Automation Status** (PulsatingDot: "Autonomous Running")

**Step 4: Verify in Browser**
- 관리자 로그인 후 마케팅 센터 진입.
- 실시간 API 데이터가 카운팅되는지 확인.

**Step 5: Commit**
```bash
git add src/v2/admin/pages/dashboard/MarketingCenterPage.tsx
git commit -m "ui(golden): implement intuitive evidence dashboard"
```

---

## Verification Plan

### Automated Tests
- `pytest tests/v2_tests/test_marketing_summary.py`: 백엔드 집계 API 정합성 검증.
- `npm run lint`: 프론트엔드 코드 정합성 검증.

### Manual Verification
1. **Admin Login**: 관리자 계정으로 접속하여 사이드바의 [마케팅 센터] 클릭.
2. **Data Consistency**: 화면의 "외부 입금액" 수치가 DB의 `external_ranking_data` 합계와 일치하는지 확인.
3. **Autonomous Proof**: 최근 개입 내역(Intervention Log)이 "Golden's Work" 섹션에 실시간으로 반영되는지 확인.
4. **Visual Wow Factor**: Bento Grid 레이아웃과 애니메이션이 프리미엄하게 동작하는지 확인.
