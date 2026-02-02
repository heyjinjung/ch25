문서 타입: Golden 프로젝트 통합 진행 현황
버전: v3.6
작성일: 2026-02-02
업데이트: 2026-02-02
작성자: GitHub Copilot
대상: V2 운영/개발
상태: SoT

---

# 🏆 Golden 프로젝트 통합 진행 현황

> **이 문서 하나로 Golden 프로젝트 전체 진행 상황을 파악할 수 있습니다.**

---

## 📚 관련 문서 링크 (Learned SoT)

### 핵심 요약
| 문서 | 경로 | 내용 |
|------|------|------|
| **종합 학습 요약** | [00_v2_golden_comprehensive_summary.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/00_v2_golden_comprehensive_summary.md) | 시스템 정의, SoT 값, 백엔드/프론트 구현 |
| **ROI 분석** | [11.roi_analysis.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/11.roi_analysis.md) | ROI 계산 로직, 메트릭 |
| **HQ Margin CSV Import (종합)** | [12.hq_margin_csv_import_comprehensive.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/12.hq_margin_csv_import_comprehensive.md) | CSV 임포트 전체 설계 |
| **Game Log CSV Import** | [13.game_log_csv_import_spec.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/13.game_log_csv_import_spec.md) | 게임 로그 CSV 스펙 |
| **CSV 데이터 통합 확장** | [14.csv_data_integration_expansion_spec.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/14.csv_data_integration_expansion_spec.md) | 데이터 통합 확장 설계 |
| **Latency Survival** | [15.latency_survival_spec.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/15.latency_survival_spec.md) | 지연 시간 생존 전략 |

### HQ Margin 설계/구현 문서
| 문서 | 경로 | 내용 |
|------|------|------|
| **설계 문서** | [20260131_hq_margin_csv_import_design.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/20260131_hq_margin_csv_import_design.md) | 초기 설계 |
| **구현 문서** | [20260131_hq_margin_csv_import_implementation.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/20260131_hq_margin_csv_import_implementation.md) | 구현 완료 |
| **Phase 2~4 상세 설계** | [20260131_hq_margin_csv_import_phase2_4_detailed_design.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/20260131_hq_margin_csv_import_phase2_4_detailed_design.md) | Ops/잠재고객/골든 연동 |
| **Phase 2~4 상세 구현** | [20260131_hq_margin_csv_import_phase2_4_detailed_implementation.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/20260131_hq_margin_csv_import_phase2_4_detailed_implementation.md) | 구현 상세 |
| **Phase 2: Ops Dashboard** | [20260131_hq_margin_csv_import_phase2_ops_dashboard.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/20260131_hq_margin_csv_import_phase2_ops_dashboard.md) | 대시보드 연동 |
| **Phase 3: 잠재고객** | [20260131_hq_margin_csv_import_phase3_prospective_users.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/20260131_hq_margin_csv_import_phase3_prospective_users.md) | 미가입 잠재고객 관리 |
| **Phase 4: 골든 정렬** | [20260131_hq_margin_csv_import_phase4_golden_alignment.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/20260131_hq_margin_csv_import_phase4_golden_alignment.md) | Golden 프로젝트 연동 |
| **Dashboard Phase 2 설계** | [20260131_hq_margin_dashboard_phase2_design.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/20260131_hq_margin_dashboard_phase2_design.md) | 대시보드 확장 설계 |
| **CSV 통합 확장 구현** | [20260202_csv_data_integration_expansion_implementation.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/20260202_csv_data_integration_expansion_implementation.md) | 최신 구현 (2/2) |

---

## 📊 전체 진행 현황 요약

### 백엔드 진행 상태
| 영역 | Task | 상태 | 파일 |
|------|------|------|------|
| **HQ Margin CSV Import** | CSV 파싱 | ✅ 완료 | `hq_margin_import_service.py` |
| | 인코딩 자동 감지 (cp949/utf-8) | ✅ 완료 | `hq_margin_import_service.py` |
| | 세그먼트 자동 분류 | ✅ 완료 | `hq_margin_import_service.py` |
| | V2User 매칭 | ✅ 완료 | `hq_margin_import_service.py` |
| | 잠재고객 테이블 저장 | ✅ 완료 | `hq_prospective_user.py` |
| **Game Log CSV Import** | CSV 파싱 | ✅ 완료 | `csv_import_service.py` |
| | Redis Pub/Sub 발행 | ✅ 완료 | `csv_import_service.py` |
| | V2GameLog DB 저장 | ✅ 완료 | `csv_import_service.py` |
| **Analytics Service** | HQ Margin Summary API | ✅ 완료 | `game_log_analytics_service.py` |
| | Revenue Stats 통합 | ✅ 완료 | `game_log_analytics_service.py` |
| | 주간 성장률 계산 | ✅ 완료 | `game_log_analytics_service.py` |
| | Risk/Opportunity 유저 | ✅ 완료 | `game_log_analytics_service.py` |
| **ROI 분석** | ROI 계산 서비스 | ✅ 완료 | `roi_analysis_service.py` |
| | V2RetentionRoiLog 모델 | ✅ 완료 | `v2_retention_roi_log.py` |
| **Latency Survival** | 선지급 서비스 | ✅ 완료 | `latency_survival_service.py` |
| | 회수(Clawback) 로직 | ✅ 완료 | `latency_survival_service.py` |
| | 유저 신고 API | ✅ 완료 | 관련 라우트 |
| **Golden 개입** | 개입 트리거 로직 | ✅ 완료 | `golden_intervention_service.py` |
| | Redis Pub/Sub | ✅ 완료 | `golden_event_service.py` |
| | 골든아워 스케줄러 | ✅ 완료 | `golden_scheduler_service.py` |

### 프론트엔드 진행 상태
| 영역 | Task | 상태 | 파일 |
|------|------|------|------|
| **CSV Import** | 업로드 UI | ✅ 완료 | `CSVImportPage.tsx` |
| | HQ_MARGIN 타입 선택 | ✅ 완료 | `CSVImportPage.tsx` |
| **Analytics Dashboard** | 오늘 수익 표시 | ✅ 완료 | `AnalyticsDashboard.tsx` |
| | 데이터 소스 배지 | ✅ 완료 | `AnalyticsDashboard.tsx` |
| | 총 충전 표시 | ✅ 완료 | `AnalyticsDashboard.tsx` |
| **Ops Dashboard** | HQ Margin 현황 카드 | ✅ 완료 | `OpsDashboard.tsx` |
| | VIP/WHALE/AT_RISK 카운트 | ✅ 완료 | `OpsDashboard.tsx` |
| | 잠재 VIP 알림 | ✅ 완료 | `OpsDashboard.tsx` |
| **Golden 실시간** | 이벤트 스트림 | ✅ 완료 | `GoldenEventStream.tsx` |
| | 개입 로그 테이블 | ✅ 완료 | `InterventionLogTable.tsx` |
| | 실시간 모니터링 페이지 | ✅ 완료 | `GoldenRealTimePage.tsx` |
| **Golden CRM** | 승인/거절 UI | ✅ 완료 | `GoldenCRMPage.tsx` |
| | 복수 건 일괄 처리 | ✅ 완료 | `GoldenCRMPage.tsx` |
| **Latency Survival** | 유저 신고 폼 | ✅ 완료 | `LatencyReportModal.tsx` |
| | 어드민 승인/반려 UI | ✅ 완료 | `LatencySurvivalPage.tsx` |
| **가입 플로우** | CC 닉네임 직접 입력 필드 | ✅ 완료 | `V2TelegramLoginPage.tsx` |
| | 닉네임 매칭 결과 UI | ✅ 완료 | `V2TelegramLoginPage.tsx` |
| | VIP 매칭 완료 알림 | ✅ 완료 | `V2TelegramLoginPage.tsx` |
| **잠재고객 관리** | 잠재고객 목록 페이지 | ✅ 완료 | `ProspectLinkingPage.tsx` |
| | 수동 V2User 연결 모달 | ✅ 완료 | `ProspectLinkingPage.tsx` |

---

## 🎯 미완료 프론트엔드 작업 (To-Do)

### P0 (즉시 필요)
| Task | 설명 | 예상 시간 |
|------|------|----------|
| **가입 시 CC 닉네임 입력** | 유저가 직접 CC 닉네임 입력 → 즉시 VIP 매칭 | ✅ 완료 |
| **Ops Dashboard 세그먼트 카드** | VIP/WHALE/AT_RISK/잠재VIP 카운트 표시 | ✅ 완료 |
| **Risk Users 테이블** | 7일+ 미접속 위험 유저 리스트 | ✅ 완료 |
| **Opportunity Users 테이블** | VIP/WHALE 기회 유저 리스트 | ✅ 완료 |

### P1 (중요)
| Task | 설명 | 예상 시간 |
|------|------|----------|
| **잠재고객 관리 페이지** | 미매칭 잠재고객 목록 + 수동 V2User 연결 | ✅ 완료 |
| **Golden CRM 페이지** | 개입 승인/거절 관리 UI | ✅ 완료 |
| **가입 시 VIP 매칭 알림** | 닉네임 매칭 시 "🎉 VIP 회원으로 등록되었습니다!" Toast | ✅ 완료 |
| **Golden 개입 알림** | 실시간 Toast 알림 | ✅ 완료 |
| **세그먼트 상세 페이지** | 세그먼트별 유저 목록 + 액션 | ✅ 완료 |

### P2 (개선)
| Task | 설명 | 예상 시간 |
|------|------|----------|
| **ROI 대시보드** | ROI 시각화 차트 | ✅ 완료 |
| **잠재고객 관리 페이지** | 미가입 잠재고객 목록 + 알림 | ✅ 완료 (ProspectLinkingPage) |
| **골든아워 설정 UI** | 골든아워 수동/자동 토글 | ✅ 완료 (DiceConfigPage 내 구현) |

---

## 🔧 프론트엔드 미구현 상세 명세

### Ops Dashboard 확장 (⏳ 미구현)
> 출처: [14.csv_data_integration_expansion_spec.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/14.csv_data_integration_expansion_spec.md)

#### 기회 그룹 상세 UI
```tsx
{/* 기회 그룹 (고액 유저) */}
<Card className="bg-black/20 border-emerald-500/20">
  <CardContent>
    {status?.opportunityUsers?.map((u) => (
      <div key={u.user_id} className="flex items-center justify-between p-2 rounded-lg bg-white/5">
        <div className="flex flex-col">
          <span className="text-sm font-bold text-white">{u.nickname}</span>
          <span className="text-[10px] text-obsidian-muted">
            총 마진: ₩{u.total_margin.toLocaleString()}
          </span>
        </div>
        <Badge className="border-emerald-500/50 text-emerald-400">
          {u.segment}  {/* VIP | WHALE */}
        </Badge>
      </div>
    ))}
  </CardContent>
</Card>
```

#### 위험 유저 상세 UI
```tsx
{/* 위기 그룹 상세 */}
{status?.riskUsers?.map((u) => (
  <div key={u.user_id}>
    <span className="text-sm font-bold">{u.nickname}</span>
    <span className="text-[10px]">
      {u.risk_type === "LOSS_STREAK" && `연패: ${u.details.loss_streak}회`}
      {u.risk_type === "BALANCE_DROP" && `잔액 급감: ${u.details.balance_drop_pct}%`}
      {u.risk_type === "INACTIVE" && `미접속: ${u.details.inactive_days}일`}
    </span>
    <Badge className={u.risk_level === "HIGH" ? "text-red-400" : "text-amber-400"}>
      {u.risk_level === "HIGH" ? "매우 위험" : "주의"}
    </Badge>
  </div>
))}
```

**필요 타입 정의** (`src/v2/api/adminApi.ts`):
```typescript
export interface DetailedRiskUserDto {
  userId: number;
  nickname: string;
  riskType: "LOSS_STREAK" | "BALANCE_DROP" | "INACTIVE";
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore: number;
  details: { loss_streak?: number; balance_drop_pct?: number; inactive_days?: number };
  lastActivityAt?: string | null;
}

export interface OpportunityUserDto {
  userId: number;
  nickname: string;
  segment: "VIP" | "WHALE";
  totalMargin: number;
  totalCharge: number;
  lastActivityAt?: string | null;
}
```

---

### Latency Survival 유저 신고 폼 상세 (✅ 구현됨)
> 출처: [15.latency_survival_spec.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/15.latency_survival_spec.md)

#### 컴포넌트 명세
| Input | Type | Required | UX Guide |
|-------|------|----------|----------|
| **입금액 (Amount)** | `Number` | **Yes** | "입금하신 금액을 입력해주세요." |
| **입금일 (Date)** | `Date` | **Yes** | 오늘/어제 선택 (기본값: 오늘) |
| **시간 (Time)** | `Time` | **Yes** | "몇 시쯤 보내셨나요?" |
| *닉네임* | `String` | Auto | 로그인 유저 정보 자동 첨부 |

#### 어드민 매칭 개선 (⏳ 미구현)
- `Verify` 모달에서 최근 24시간 내 미매칭 입금 로그 Dropdown 제공
- 현재는 수동으로 `Matched Log ID` 입력

---

### CSV Import 확장 UI (🔄 일부 구현)
> 출처: [20260202_csv_data_integration_expansion_implementation.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/20260202_csv_data_integration_expansion_implementation.md)

#### 추가 필요한 UI 요소
| 요소 | 상태 | 설명 |
|------|------|------|
| `save_to_db` 체크박스 | ⏳ 미구현 | DB 저장 여부 선택 (기본 true) |
| Import 결과 요약 | 🔄 일부 | 성공/실패/스킵 건수 표시 |
| 실시간 Progress | ⏳ 미구현 | 대용량 CSV 처리 진행률 |

---

## ⚠️ 도메인 충돌 분석 및 대응책

### 1. Inventory & Economy Domain (💰 금고/지갑)

> 출처: [15.latency_survival_spec.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/15.latency_survival_spec.md) §7.1

| 충돌 요소 | 영향 | 대응책 |
|----------|------|--------|
| **음수 잔액 (Negative Balance)** | Clawback 시 `Force Deduct`로 음수 잔액 발생 | DB 스키마는 `Integer (Signed)` - 음수 허용됨 |
| **상점/게임 로직** | 음수 잔액 처리 미비 시 예외 발생 | `inventory_service`는 `allow_negative=False` 기본값, Clawback 시에만 `True` |
| **프론트 잔액 표시** | 음수 잔액 UI 표시 필요 | `WalletBalance` 컴포넌트에서 음수 시 붉은색 처리 필요 ⏳ |

**영향받는 컴포넌트**:
- `src/v2/components/user/WalletBalance.tsx` - 음수 잔액 표시 로직 추가 필요
- `src/v2/pages/vault/VaultPage.tsx` - 음수 잔액 경고 메시지

---

### 2. Deposit & Payment Domain (💳 입금/결제)

> 출처: [15.latency_survival_spec.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/15.latency_survival_spec.md) §7.2

| 충돌 요소 | 영향 | 대응책 |
|----------|------|--------|
| **Provisional Grant vs 실제 입금** | 중복 보상 우려 | `V2UserDepositEvidence.matched_log_id` ↔ `UserCashLedger.id` Soft Link |
| **어드민 매칭 UX** | 수동 검색 번거로움 | 최근 24시간 미매칭 입금 로그 Dropdown 제공 ⏳ |

**영향받는 컴포넌트**:
- `LatencySurvivalPage.tsx` - 어드민 매칭 UI 개선 필요
- 새 API: `GET /api/v2/admin/deposits/unmatched?hours=24`

---

### 3. Game Domain (🎮 게임 - Roulette)

> 출처: [15.latency_survival_spec.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/15.latency_survival_spec.md) §7.3

| 충돌 요소 | 영향 | 대응책 |
|----------|------|--------|
| **게임 로그 스키마 변경** | Clawback 추적 실패 가능 | `V2RouletteLog` 스키마 의존성 - Integration Test 필수 |
| **Clawback 범위** | 선지급 티켓으로 획득한 당첨금까지 회수 | FIFO 추적 로직 (`latency_survival_service.py`) |

**영향받는 테이블**:
- `V2RouletteLog` - `reward_type`, `reward_amount`, `created_at` 컬럼 의존
- 스키마 변경 시 Clawback 로직 동기화 필수

---

### 4. Auth & Security Domain (🔐 인증/보안)

> 출처: [15.latency_survival_spec.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/15.latency_survival_spec.md) §7.4

| 충돌 요소 | 영향 | 대응책 |
|----------|------|--------|
| **Rate Limit 우회** | VPN으로 IP 우회 가능 | **User ID 기반** Rate Limit 적용 (IP 아님) |
| **어뷰징 방지** | 반복 허위 신고 | `MAX_PROVISIONAL_PER_HOUR = 3` 제한 |

**Rate Limit 정책 SoT**:
| 항목 | 값 |
|------|------|
| 시간당 최대 | 3회/User |
| 중복 TX ID | Unique Check (동일 TX 재제출 차단) |
| 쿨다운 | 429 Error 반환 |

---

### 5. CSV Import → Analytics 파이프라인

> 출처: [14.csv_data_integration_expansion_spec.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/14.csv_data_integration_expansion_spec.md) §5

| 충돌 요소 | 영향 | 대응책 |
|----------|------|--------|
| **CSV Import 중 대시보드 쿼리** | 데이터 정합성 이슈 | `import_job_id`로 진행 중인 작업 필터링 |
| **대용량 CSV** | 메모리 부족, 타임아웃 | Batch Size 250, Background Worker 고려 |
| **Game Log vs HQ Margin 우선순위** | 어떤 데이터를 우선 표시? | HQ Margin 우선 → Game Log Fallback |

**데이터 파이프라인 우선순위**:
```
1. HQ Margin CSV → V2UserSegment.total_margin (가장 신뢰)
2. Game Log CSV → V2GameLog → 실시간 수익/지출 (보조)
3. 내부 게임 로그 → V2RouletteLog 등 (실시간)
```

---

### 6. Golden Intervention vs CRM 충돌

| 충돌 요소 | 영향 | 대응책 |
|----------|------|--------|
| **자동 개입 vs 수동 승인** | 개입 중복 발생 가능 | `status: PENDING_APPROVAL` 상태 체크 후 발송 |
| **쿨다운 관리** | Redis 키 불일치 | `golden:v2:cooldown:{trigger_id}:{user_id}` 표준화 |
| **Golden Hour + AT_RISK** | VIP에게 과도한 혜택 | Segment 우선순위: VIP > WHALE > AT_RISK |

---

## 📊 도메인별 영향 매트릭스

| 기능 | Inventory | Payment | Game | Auth | Analytics | Golden |
|------|:---------:|:-------:|:----:|:----:|:---------:|:------:|
| **Latency Survival** | ⚠️ 高 | ⚠️ 高 | ⚠️ 中 | ✅ | - | - |
| **CSV Import** | - | - | ⚠️ 中 | - | ⚠️ 高 | ⚠️ 中 |
| **Prospect Matching** | - | - | - | ⚠️ 中 | - | ⚠️ 高 |
| **Golden CRM** | - | - | - | - | - | ⚠️ 高 |
| **Ops Dashboard** | - | - | - | - | ⚠️ 高 | ⚠️ 中 |

**범례**: ⚠️ 高 = 주의 필요, ⚠️ 中 = 모니터링, ✅ = 안전, - = 무관

---

## 📈 주요 기능별 상세 현황

### ROI Analysis (캠페인 성과 분석)
> 출처: [11.roi_analysis.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/11.roi_analysis.md)

| 구분 | 상태 | 설명 |
|------|------|------|
| **Backend** | ✅ 완료 | `V2RoiAnalysisService` - 개입 비용 대비 예측 LTV 계산 |
| **Model** | ✅ 완료 | `V2RetentionRoiLog` (marketing_cost, predicted_ltv, roi_percent) |
| **Frontend** | ✅ 완료 | `AnalyticsDashboard.tsx` > "Campaign Performance" |

**핵심 지표**:
- `User Count`: 캠페인 노출 유저 수
- `Total Cost`: 총 보상 비용 (KRW)
- `Total Return`: 예측 LTV 합계
- `Avg ROI`: 평균 ROI 퍼센트

---

### Game Log CSV Import (게임 로그 분석)
> 출처: [13.game_log_csv_import_spec.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/13.game_log_csv_import_spec.md)

**CSV 컬럼 SoT**:
| 컬럼 | 타입 | 설명 |
|------|------|------|
| `기록 일시` | datetime | 게임 실행 시각 |
| `유저 ID` | int | V2 유저 ID |
| `게임 종류` | string | DICE, ROULETTE, SLOT, POKER |
| `결과` | string | WIN, LOSE, DRAW, JACKPOT |
| `배팅 금액` | int | 배팅액 (원) |
| `지급 금액` | int | 당첨액 (원) |
| `게임 후 잔액` | int | 게임 후 잔액 |

**실시간 모니터링 트리거**:
| 트리거 | 조건 | 액션 |
|--------|------|------|
| `TRG_LOSE_5` | 5연속 LOSE | 개입 발동 |
| `TRG_BAL_DROP_50` | 잔액 50%+ 감소 | 개입 발동 |
| 고액 배팅 | 100만원+ 배팅 | 고액 유저 마킹 |
| JACKPOT | 잭팟 당첨 | VIP 승격 검토 |

---

### Latency Survival (지연 입금 선반영)
> 출처: [15.latency_survival_spec.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/15.latency_survival_spec.md)

**목적**: "돈 보냈는데 안 들어왔어요" → 즉시 게임 재화 선지급 후 사후 검증

| 구분 | 상태 | 설명 |
|------|------|------|
| **Backend** | ✅ 완료 | `latency_survival_service.py` - 선지급, 회수(Clawback) |
| **Admin UI** | ✅ 완료 | `LatencySurvivalPage.tsx` - 승인/반려 처리 |
| **User UI** | ✅ 완료 | `LatencyReportModal.tsx` - 유저 신고 폼 |

**지급 정책 SoT**:
| 항목 | 값 |
|------|------|
| 선지급 보상 | ROULETTE_TICKET x 5 |
| 시간당 한도 | Max 3회/User/Hour |
| 중복 제한 | TX ID Unique Check |

**회수(Clawback) 정책**:
- 원금 + 당첨금(Winnings) **모두 회수** (Strict Recursive)
- FIFO 추적: 선지급 이후 최초 N판 사용분 특정
- 음수 잔액(Negative Balance) 허용

---

### CSV 데이터 통합 확장 현황
> 출처: [14.csv_data_integration_expansion_spec.md](../00_sot_meta/00_A_sot_code_ops_chk/learned_/golden/14.csv_data_integration_expansion_spec.md)

**데이터 파이프라인**:
```
CSV Import (HQ Margin + Game Log)
         │
         ├──▶ 분석 대시보드 (오늘 수익/지출, 주간 성장률)
         ├──▶ Ops Dashboard (VIP/WHALE 리스트, 기회 그룹)
         └──▶ 이탈 레이더 (위험 유저, 연패 감지, 개입 트리거)
```

**이탈 위험 감지 로직**:
```python
def detect_churn_risk(user_id, game_logs):
    recent_logs = game_logs[-10:]  # 최근 10게임
    lose_count = sum(1 for log in recent_logs if log.result == 'LOSE')
    total_loss = sum(log.bet_amount - log.payout for log in recent_logs)
    
    if lose_count >= 7 or total_loss > 500_000:
        return 'HIGH'   # 즉시 개입
    elif lose_count >= 5 or total_loss > 200_000:
        return 'MEDIUM' # 모니터링
    else:
        return 'LOW'    # 정상
```

---

## 🎯 잠재고객(Prospect) 매칭 전략

> **두 가지 매칭 방식을 병렬로 진행하여 빠른 VIP 확보**

### 매칭 방식 비교
| 방식 | 설명 | 장점 | 구현 상태 |
|------|------|------|----------|
| **방식 A: 유저 직접 입력** | 가입 시 CC 닉네임 입력 필드 제공 | 빠른 매칭, 유저 주도 | ✅ 완료 (V2TelegramLoginPage.tsx) |
| **방식 B: 어드민 수동 매칭** | 관리자가 잠재고객 목록에서 V2User 선택 | 정확한 매칭, 검증 가능 | ✅ 완료 (ProspectLinkingPage.tsx) |
| **방식 C: 자동 매칭 (현재)** | 가입 시 닉네임 자동 대조 | 무간섭 UX | ✅ 백엔드 완료 |

---

### 방식 A: 유저 직접 CC 닉네임 입력 (P0)

**목적**: 잠재고객이 가입 시 본인의 CC 닉네임을 입력하면 즉시 VIP 매칭

#### 프론트엔드 UI 예시
```
┌─────────────────────────────────────────┐
│ 회원가입                                │
├─────────────────────────────────────────┤
│ 이메일: [__________________]            │
│ 비밀번호: [__________________]          │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🎁 기존 회원이신가요?               │ │
│ │ CC 닉네임 입력 시 VIP 혜택!         │ │
│ │ [CC 닉네임 입력 (선택)]             │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [가입하기]                              │
└─────────────────────────────────────────┘
```

#### 필요 작업
| 구분 | Task | 예상 시간 |
|------|------|----------|
| 프론트 | 가입 폼에 CC 닉네임 입력 필드 추가 | 30분 |
| 프론트 | 입력 시 실시간 매칭 확인 API 호출 | 20분 |
| 백엔드 | `POST /api/v2/auth/check-prospect` API | 30분 |
| 프론트 | 매칭 성공 시 "🎉 VIP 확인!" 피드백 | 15분 |

---

### 방식 B: 어드민 수동 매칭 (P1)

**목적**: 관리자가 잠재고객 목록에서 가입한 V2User를 수동으로 연결

#### 프론트엔드 UI 예시
```
┌───────────────────────────────────────────────────────────────┐
│ 잠재고객 관리                                                 │
├───────────────────────────────────────────────────────────────┤
│ 🔍 검색: [__________]  [미매칭만 보기 ☑]                      │
├───────────────────────────────────────────────────────────────┤
│ CC닉네임    │ 마진      │ 세그먼트 │ 매칭 상태 │ 액션        │
├─────────────┼───────────┼──────────┼───────────┼─────────────┤
│ 영하19도    │ ₩800,000 │ VIP      │ ❌ 미매칭 │ [연결]      │
│ 허거덩      │ ₩-4.3M   │ COMMON   │ ✅ 매칭됨 │ -           │
│ 내가왔다    │ ₩60,000  │ COMMON   │ ❌ 미매칭 │ [연결]      │
└───────────────────────────────────────────────────────────────┘

[연결] 클릭 시 모달:
┌─────────────────────────────────────┐
│ V2 유저 연결                        │
├─────────────────────────────────────┤
│ 잠재고객: 영하19도                  │
│                                     │
│ V2 유저 검색:                       │
│ [닉네임/이메일로 검색]              │
│                                     │
│ 검색 결과:                          │
│ ○ 영하19 (user_id: 42)              │
│ ○ 영하 (user_id: 87)                │
│                                     │
│ [취소] [연결 확정]                  │
└─────────────────────────────────────┘
```

#### 필요 작업
| 구분 | Task | 예상 시간 |
|------|------|----------|
| 프론트 | 잠재고객 목록 페이지 (`ProspectListPage.tsx`) | 1시간 |
| 프론트 | 수동 매칭 모달 컴포넌트 | 30분 |
| 백엔드 | `POST /api/v2/admin/prospects/{id}/link` API | 30분 |
| 백엔드 | `GET /api/v2/admin/prospects` 목록 API | 30분 |

---

### 방식 C: 자동 매칭 (현재 구현됨)

**현재 구현 상태**
| 구분 | 상태 | 설명 |
|------|------|------|
| **백엔드** | ✅ 완료 | `AuthService` → `segment_service.match_prospect_on_joined()` 자동 호출 |
| **프론트엔드** | ✅ 완료 | 매칭 성공 시 Toast 알림 표시 (`V2TelegramLoginPage.tsx`) |

**백엔드 자동 처리 플로우**
```
유저 가입/첫 로그인
       ↓
AuthService.register_user() / login()
       ↓
segment_service.match_prospect_on_joined(user_id, nickname)
       ↓
HQProspectiveUser 테이블에서 닉네임 대조
       ↓
├── 매칭 성공 → V2UserSegment 즉시 생성 (VIP 등급 부여)
│              prospect.is_joined = True 업데이트
│
└── 매칭 실패 → 아무 작업 없음
```

**프론트엔드 개선 (P1)**
- 가입 완료 시 API 응답에 `is_vip_matched: boolean` 필드 추가
- 매칭 성공 시 Toast: "🎉 VIP 회원으로 등록되었습니다!"
- 마이페이지에 VIP 배지 표시

---

## 📋 HQ Margin → Analytics Dashboard 연동 (최근 PATCH)

### 1. 목적
대시보드 수익이 ₩0으로 표시되는 문제를 해결하기 위해, **HQ Margin CSV 데이터**를 우선 활용하여 실제 마진/충전 데이터를 표시한다.

## 2. 배경 및 문제 정의

### 2.1 기존 상태
| 컴포넌트 | 파일 | 상태 | 문제점 |
|---------|------|------|--------|
| HQ Margin CSV Import | `hq_margin_import_service.py` | ✅ 완료 | V2UserSegment에 저장됨 |
| V2UserSegment 모델 | `v2_user_segment.py` | ✅ 완료 | `total_margin`, `total_charge` 컬럼 존재 |
| GameLogAnalyticsService | `game_log_analytics_service.py` | ✅ 완료 | **V2GameLog 기반 (빈 테이블)** |
| 분석 대시보드 | `AnalyticsDashboard.tsx` | ✅ 완료 | **오늘 수익 = ₩0 (데이터 미연동)** |
| Ops Dashboard | `OpsDashboard.tsx` | ✅ 완료 | 기회 그룹 상세 미표시 |

### 2.2 문제 원인
1. **데이터 소스 불일치**: Dashboard가 V2GameLog를 쿼리 → 테이블 비어있음 → ₩0
2. **HQ Margin 미활용**: V2UserSegment에 `total_margin`, `total_charge` 있음 → 집계 안됨
3. **Risk/Opportunity 미연동**: `inactive_days` 기반 위험 유저, VIP/WHALE 기회 유저 리스트 미노출

---

## 3. 핵심 데이터 SoT

### 3.1 HQ Margin CSV 컬럼 → V2UserSegment 매핑
| CSV 컬럼 | DB 컬럼 | 의미 |
|---------|---------|------|
| `총 운영 마진` | `total_margin` | 충전 - 환전 (핵심 수익!) |
| `누적 충전 금액` | `total_charge` | 총 충전액 |
| `미접속 경과일` | `inactive_days` | 이탈 위험 판단 기준 |

### 3.2 세그먼트 분류 SoT
| 세그먼트 | 조건 | 골든 전략 |
|---------|------|----------|
| **VIP** | 마진 100만원+ | 고배율 골든아워, 우선 지원 |
| **WHALE** | 충전 500만원+ | VIP 전환 유도 |
| **AT_RISK** | 7일+ 미접속 + 마진 양수 | 자동 리워드, 복귀 캠페인 |
| **COMMON** | 기본 | 일반 운영 |

---

## 4. 구현 계획 (Tasks)

| Task | 우선순위 | 예상 시간 | 상태 |
|------|---------|----------|------|
| Task 1: HQ Margin Summary API | P0 | 30분 | ✅ 완료 |
| Task 2: Revenue Stats 통합 | P0 | 30분 | ✅ 완료 |
| Task 3: 주간 성장률 계산 | P1 | 20분 | ✅ 완료 |
| Task 4: 리텐션 분석 연동 | P1 | 20분 | ✅ 완료 |
| Task 5: ROI 연동 | P2 | 20분 | ✅ 기존 구현 |
| 검증 및 배포 | - | 30분 | 🔄 진행중 |

---

## 5. 실제 변경 내역 (PATCH)

### 5.1 백엔드

#### 1) `app/v2/services/game_log_analytics_service.py`
- `get_hq_margin_summary()` 메서드 추가 - V2UserSegment에서 total_margin/total_charge 집계
- `get_revenue_summary()` 수정 - HQ Margin 데이터 우선, Game Log 폴백
- `get_hq_weekly_growth_rate()` 추가 - 활성 유저 비율 기반 성장률 추정

#### 2) `app/v2/schemas/v2_admin_ops.py`
- `RevenueStatsDto`에 필드 추가:
  - `total_charge`: 총 충전액
  - `data_source`: 데이터 출처 ("HQ_MARGIN" | "GAME_LOG")

#### 3) `app/v2/api/admin/ops_routes.py`
- `RevenueStatsDto` 생성 시 `total_charge`, `data_source` 매핑 추가

### 5.2 프론트엔드

#### 1) `src/v2/api/adminApi.ts`
- `RevenueStatsDto` 타입에 필드 추가:
  - `totalCharge: number`
  - `dataSource: "HQ_MARGIN" | "GAME_LOG"`

#### 2) `src/v2/admin/pages/ops/AnalyticsDashboard.tsx`
- 헤더에 데이터 소스 배지 표시 ("📊 HQ 마진 데이터" / "🎮 게임 로그")
- 오늘 수익 카드 하단에 `총 충전 ₩XXX,XXX` 표시

---

## 6. 데이터 흐름

```
┌──────────────────┐
│ HQ Margin CSV    │   Result (1).CSV (실제 마진 데이터)
│ 199 유저         │
└────────┬─────────┘
         │ Admin Upload / import
         ▼
┌──────────────────────────────────────────┐
│ V2UserSegment (DB)                       │
│ • total_margin    (총 마진)              │
│ • total_charge    (총 충전)              │
│ • inactive_days   (미접속일)             │
│ • segment         (VIP/WHALE/AT_RISK)    │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ GameLogAnalyticsService                  │
│ • get_hq_margin_summary()    [신규]      │
│ • get_revenue_summary()      [수정]      │
│ • get_risk_users()           [기존]      │
│ • get_opportunity_users()    [기존]      │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ /api/v2/admin/ops/status                 │
│ • revenueStats: RevenueStatsDto          │
│ • riskUsers: List[DetailedRiskUserDto]   │
│ • opportunityUsers: List[...]            │
└────────┬─────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│ AnalyticsDashboard.tsx                   │
│ • 오늘 수익: ₩XX,XXX,XXX (실데이터!)    │
│ • 오늘 지출: ₩XX,XXX,XXX               │
│ • 데이터 소스 배지 표시                  │
└──────────────────────────────────────────┘
```

---

## 7. 배포 명령

### 7.1 로컬 빌드 및 전송
```powershell
# 백엔드 이미지 빌드
docker compose build backend

# tar로 저장 (GitHub 100MB 제한 우회)
docker save ghcr.io/heyjinjung/xmas-backend:latest -o backend-latest.tar

# 프로덕션 서버로 전송
scp -i C:\Users\JAVIS\.ssh\id_ed25519_vultr backend-latest.tar root@149.28.135.147:/root/
```

### 7.2 프로덕션 서버 배포
```bash
# 이미지 로드 및 서비스 재시작
docker load -i /root/backend-latest.tar
cd /opt/ch25
docker compose up -d backend
```

---

## 8. 주의사항
- `backend-latest.tar`는 GitHub 100MB 제한으로 인해 Git에 포함 불가
- `.gitignore`에 `backend-latest.tar` 추가 필요
- 배포는 이미지 직접 전송 방식으로 수행

---

## 9. Out of Scope
- HQ Margin CSV Import 로직 수정 (이미 완료)
- V2UserSegment 모델 변경 (이미 완료)
- 신규 마이그레이션 (불필요)
- Game Log CSV 실시간 연동 (별도 태스크)

---

## 10. 변경 이력
- v1.0 (2026-02-02, GitHub Copilot): PATCH 단계 실행 내역 기록
- v2.0 (2026-02-02, GitHub Copilot): 계획서 + 실행 내역 통합 문서로 확장
- v3.0 (2026-02-02, GitHub Copilot): Golden 프로젝트 통합 진행 현황 문서로 확장
  - Learned SoT 문서 링크 추가 (15개 문서)
  - 백엔드/프론트엔드 진행 상태 표 추가
  - 미완료 프론트엔드 작업 목록 추가 (P0/P1/P2)
- v3.1 (2026-02-02, GitHub Copilot): Learned 문서 핵심 내용 반영
  - ROI Analysis 상세 추가 (11.roi_analysis.md)
  - Game Log CSV Import 컬럼/트리거 추가 (13.game_log_csv_import_spec.md)
  - Latency Survival 전체 내용 추가 (15.latency_survival_spec.md)
  - CSV 통합 확장 이탈 감지 로직 추가 (14.csv_data_integration_expansion_spec.md)

---

## 📁 파일 구조 참고

### 백엔드 주요 파일
```
app/v2/services/
├── game_log_analytics_service.py    # HQ Margin Summary, Revenue Stats
├── hq_margin_import_service.py      # CSV Import
├── hq_margin_stats_service.py       # Dashboard 통계 집계
├── golden_intervention_service.py   # 개입 트리거
├── golden_event_service.py          # Redis Pub/Sub
├── golden_scheduler_service.py      # 골든아워 스케줄러
└── roi_analysis_service.py          # ROI 분석

app/v2/api/admin/
├── ops_routes.py                    # /api/v2/admin/ops/*
├── csv_import_routes.py             # CSV 업로드 API
└── golden_routes.py                 # Golden API

app/v2/models/
├── v2_user_segment.py               # 세그먼트 모델
├── hq_prospective_user.py           # 잠재고객 모델
└── v2_golden_intervention_log.py    # 개입 로그 모델
```

### 프론트엔드 주요 파일
```
src/v2/admin/
├── pages/
│   ├── ops/
│   │   └── AnalyticsDashboard.tsx   # 분석 대시보드
│   └── dashboard/
│       ├── OpsDashboard.tsx         # Ops 대시보드
│       ├── GoldenRealTimePage.tsx   # 골든 실시간 페이지
│       └── ControlCenterPage.tsx    # 통합 컨트롤 센터
│
├── components/
│   └── golden/
│       ├── GoldenEventStream.tsx    # 실시간 이벤트 스트림
│       └── InterventionLogTable.tsx # 개입 로그 테이블
│
└── api/
    └── adminApi.ts                  # API 타입 정의
```

---

## 🔗 Quick Links

- **시스템 정의**: [golden_v2_system_definition_ko.md](golden_v2_system_definition_ko.md)
- **개입 로직**: [golden_v2_intervention_logic_ko.md](golden_v2_intervention_logic_ko.md)
- **운영 로직**: [golden_v2_operational_logic_ko.md](golden_v2_operational_logic_ko.md)
- **실시간 아키텍처**: [02_golden_v2_realtime_architecture.md](02_golden_v2_realtime_architecture.md)
- **골든아워 정책**: [v2_golden_hour_policy_sot_ko.md](v2_golden_hour_policy_sot_ko.md)
- **프론트엔드 스펙**: [2026_01_28_golden_frontend_spec.md](2026_01_28_golden_frontend_spec.md)

---

## 📝 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| v3.3 | 2026-02-02 | Ops Dashboard/Golden CRM/잠재고객 관리 프론트 구현 반영 | GitHub Copilot |
| v3.2 | 2026-02-03 | 프론트엔드 미구현 상세 명세, 도메인 충돌 분석 6개 섹션 추가 | JAVIS |
| v3.1 | 2026-02-03 | CSV 통합, Game Log, ROI Analysis, Latency Survival 상세 추가 | GitHub Copilot |
| v3.0 | 2026-02-02 | 15개 Learned SoT 문서 링크, 진행 현황 표 통합 | GitHub Copilot |
| v2.0 | 2026-02-02 | 잠재고객 매칭 전략 3안, 프론트 To-Do 추가 | GitHub Copilot |
| v1.0 | 2026-02-02 | HQ Margin → Analytics 연동 PATCH 초안 | GitHub Copilot |
