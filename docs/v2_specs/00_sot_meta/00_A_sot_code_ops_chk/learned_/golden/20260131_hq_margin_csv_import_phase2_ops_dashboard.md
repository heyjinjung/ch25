# HQ Margin 데이터 연동 상세 설계 - Phase 2: Ops Dashboard 통합

**문서 타입**: Detailed Design / Learned SoT
**도메인**: Ops / Monitoring
**작성일**: 2026-01-31
**상태**: 설계 완료

---

## 1. 목적 (Objective)

본사(HQ)에서 임포트된 마진 데이터를 운영 대시보드에 시각화하여, 관리자가 실시간으로 가입 유저들의 수익 기여도(마진)와 세그먼트 분포를 파악하고 운영 의사결정을 내릴 수 있도록 함.

## 2. 주요 기능 (Key Features)

### 2.1 HQ Margin 인사이트 카드
- **VIP (100만원+) 인원**: 가입 유저 중 마진 100만 원 이상인 'VIP' 세그먼트 수.
- **Whale (500만원+) 인원**: 가입 유저 중 충전액 500만 원 이상인 'WHALE' 세그먼트 수.
- **이탈 위험 유저**: 미접속 7일 이상이면서 마진이 양수인 유저 수.
- **최근 동기화 정보**: 마지막 CSV 임포트 시각 및 임포트 결과(성공/실패 건수) 표시.

### 2.2 실시간 데이터 연동
- 페이지 로드 시 `/api/v2/admin/ops/hq-margin-stats` 엔드포인트를 통해 최신 데이터를 페칭.
- `Audit Log`와 연동하여 임포트 히스토리를 대시보드에서 바로 확인.

---

## 3. 기술 설계 및 구현 가이드 (Technical Fail-Safe Guide)

### 3.1 백엔드 API 규격
- **대상 파일**: [ops_routes.py](file:///c:/Users/JAVIS/ch/ch25/app/v2/api/admin/ops_routes.py)
- **엔드포인트**: `GET /api/v2/admin/ops/status` (기존 응답 DTO 확장)
- **응답 스키마 (`OpsHQMarginStatsDto`)**:
  ```python
  class OpsHQMarginStatsDto(BaseModel):
      vip_count: int = Field(alias="vipCount")
      whale_count: int = Field(alias="whaleCount")
      at_risk_count: int = Field(alias="atRiskCount")
      prospective_vip_count: int = Field(alias="prospectiveVipCount") # 미가입 VIP
      last_sync_at: datetime | None = Field(alias="lastSyncAt")
  ```

### 3.2 프론트엔드 UI 컴포넌트
- **대상 파일**: [OpsDashboard.tsx](file:///c:/Users/JAVIS/ch/ch25/src/v2/admin/pages/dashboard/OpsDashboard.tsx)
- **데이터 페칭**: `useOpsStatus()` 훅의 리턴 타입에 `hqStats` 추가.
- **컴포넌트 배치**: `BentoGrid` 내부, `Golden Radar` 카드 바로 아래에 배치.
- **사용 라이브러리**: `lucide-react` (아이콘), `framer-motion` (미세 애니메이션).

### 3.3 데이터 흐름 (Data Lineage)
1. `V2UserSegment` (joined) + `HQProspectiveUser` (unjoined) 합산 쿼리.
2. `V2AdminAuditLog`에서 `action="HQ_MARGIN_IMPORT"`인 최신 항목 추출.
3. `OpsDashboardResponse` DTO에 병합하여 반환.

---

## 4. 자가 진단 체크리스트 (Self-Correction Checklist)

구현 중 다음 사항 중 하나라도 어긋날 경우 설계 위반으로 간주하고 즉시 수정함.

1.  **[SOT]** `v1_user` (Legacy) 테이블을 참조하고 있는가? → **No.** 반드시 `v2_user`를 참조해야 함.
2.  **[Performance]** 대시보드 로딩 시 매번 CSV 전체를 스캔하는가? → **No.** 이미 DB화된 `hq_prospective_user` 와 `v2_user_segment`만 카운트함.
3.  **[UI]** 잠재 VIP 수치(`prospective_vip_count`)가 누락되었는가? → **No.** 가입 유입을 위한 핵심 지표이므로 반드시 표시.
4.  **[API]** `camelCase`와 `snake_case` 혼용 중인가? → **No.** Frontend향 DTO는 반드시 `camelCase` 별칭(`alias`) 사용.

---

## 5. 단계별 검증 절차 (Verification)
1.  **Mock Data Test**: DB에 임의의 `VIP` 세그먼트 유저와 `Prospective` 유저를 생성 후 대시보드 숫자가 맞는지 확인.
2.  **Import Sync Test**: CSV 임포트 성공 직후 `lastSyncAt` 시간이 현재 시간으로 갱신되는지 확인.
3.  **Empty State Test**: 데이터가 하나도 없을 때 `0`으로 표시되며 UI가 깨지지 않는지 확인.
