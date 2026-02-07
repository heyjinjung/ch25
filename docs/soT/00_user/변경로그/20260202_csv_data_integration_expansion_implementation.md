# CSV 데이터 통합 확장 구현 완료

**문서 타입**: Implementation Record
**도메인**: Golden / Ops / Analytics / CSV Import
**작성일**: 2026-02-02
**상태**: ✅ 구현 완료

---

## 1. 개요

CSV Import 데이터(HQ Margin, Game Log)가 모든 대시보드에서 활용되도록 전체 데이터 파이프라인을 확장 구현함.

### 1.1 해결한 문제

| 문제 | 해결 |
|------|------|
| 분석 대시보드 "오늘 수익 ₩0" | CSV revenueStats fallback 적용 |
| Ops Dashboard 기회 그룹 미표시 | opportunityUsers 실제 리스트 연동 |
| CSV → DB 저장 누락 | V2GameLog 테이블 + save_to_db 옵션 추가 |
| 위험 유저 분석 미작동 | DetailedRiskUserDto + GameLogAnalyticsService 연동 |

---

## 2. 백엔드 구현 상세

### 2.1 신규 생성 파일

#### 2.1.1 V2GameLog 모델

**파일**: `app/v2/models/v2_game_log.py`

```python
class V2GameLog(Base):
    """외부 CSV에서 임포트된 게임 로그 저장 테이블"""
    __tablename__ = "v2_game_log"
    
    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("v2_user.id", ondelete="CASCADE"), nullable=False)
    game_type = Column(String(32), nullable=False)  # DICE, SLOT, ROULETTE, etc.
    result = Column(String(16), nullable=False)     # WIN, LOSE, DRAW, JACKPOT
    bet_amount = Column(BigInteger, default=0)
    payout_amount = Column(BigInteger, default=0)
    balance_after = Column(BigInteger, default=0)
    recorded_at = Column(DateTime(timezone=True), nullable=False)
    imported_at = Column(DateTime(timezone=True), server_default=func.now())
    import_job_id = Column(String(64), nullable=True)
```

**인덱스**:
- `ix_v2_game_log_user_recorded` - (user_id, recorded_at)
- `ix_v2_game_log_result_recorded` - (result, recorded_at)
- `ix_v2_game_log_game_type` - (game_type)

#### 2.1.2 마이그레이션

**파일**: `alembic/versions/20260202_1400_add_v2_game_log.py`

```python
revision = '20260202_1400_add_v2_game_log'
down_revision = 'aad439cb38d2'
```

#### 2.1.3 GameLogAnalyticsService

**파일**: `app/v2/services/game_log_analytics_service.py`

| 메서드 | 반환값 | 설명 |
|--------|--------|------|
| `get_today_revenue()` | dict | 오늘 배팅액/지급액/순수익 |
| `get_weekly_growth_rate()` | float | 주간 성장률 (%) |
| `get_high_rollers(min_bet)` | List[dict] | 고액 베팅 유저 목록 |
| `detect_loss_streak_users(min_streak)` | List[dict] | 연패 중인 유저 감지 |
| `get_opportunity_users(limit)` | List[dict] | VIP/WHALE 기회 유저 |
| `get_risk_users(limit)` | List[dict] | 복합 위험 유저 (연패+AT_RISK) |
| `get_revenue_summary()` | dict | 대시보드용 수익 요약 |

### 2.2 수정 파일

#### 2.2.1 스키마 확장

**파일**: `app/v2/schemas/v2_admin_ops.py`

```python
# 신규 DTO 추가
class RevenueStatsDto(BaseModel):
    today_revenue: int
    today_expenses: int
    net_income: int
    deposit_count: int
    weekly_growth_rate: float

class DetailedRiskUserDto(BaseModel):
    user_id: int
    nickname: str
    risk_type: str    # LOSS_STREAK | AT_RISK | BALANCE_DROP
    risk_level: str   # LOW | MEDIUM | HIGH | CRITICAL
    risk_score: float
    details: str
    last_activity_at: datetime | None

class OpportunityUserDto(BaseModel):
    user_id: int
    nickname: str
    segment: str      # VIP | WHALE
    total_margin: int
    total_charge: int
    last_activity_at: datetime | None

# OpsDashboardResponse 확장
class OpsDashboardResponse(BaseModel):
    # ... 기존 필드 ...
    revenue_stats: RevenueStatsDto | None
    risk_users: list[DetailedRiskUserDto] = []
    opportunity_users: list[OpportunityUserDto] = []
```

#### 2.2.2 API 라우트 연결

**파일**: `app/v2/api/admin/ops_routes.py`

```python
# Line 159-210: GameLogAnalyticsService 연동
from app.v2.services.game_log_analytics_service import GameLogAnalyticsService

game_analytics = GameLogAnalyticsService(db)
revenue_stats_data = game_analytics.get_revenue_summary()
risk_users_data = game_analytics.get_risk_users(limit=10)
opportunity_users_data = game_analytics.get_opportunity_users(limit=10)

return OpsDashboardResponse(
    # ... 기존 필드 ...
    revenue_stats=revenue_stats,
    risk_users=detailed_risk_users,
    opportunity_users=opportunity_user_list,
)
```

#### 2.2.3 CSV Import Service DB 저장 추가

**파일**: `app/v2/services/csv_import_service.py`

```python
# Line 270-285: DB 저장 로직 추가
if request.save_to_db:
    game_log = V2GameLog(
        user_id=record.user_id,
        game_type=record.game_type,
        result=record.result.value,
        bet_amount=int(record.bet_amount),
        payout_amount=int(record.payout_amount),
        balance_after=int(record.balance_after),
        recorded_at=record.timestamp,
        import_job_id=job_id,
    )
    self.db.add(game_log)
```

**파일**: `app/v2/schemas/v2_csv_import.py`

```python
# CSVImportRequest에 save_to_db 필드 추가
save_to_db: bool = Field(
    True,
    description="Whether to save records to V2GameLog table for analytics",
)
```

---

## 3. 프론트엔드 구현 상세

### 3.1 타입 정의 확장

**파일**: `src/v2/api/adminApi.ts`

```typescript
export interface RevenueStatsDto {
  todayRevenue: number;
  todayExpenses: number;
  netIncome: number;
  depositCount: number;
  weeklyGrowthRate: number;
}

export interface DetailedRiskUserDto {
  userId: number;
  nickname: string;
  riskType: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore: number;
  details: string;
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

export interface OpsDashboardResponse {
  // ... 기존 필드 ...
  revenueStats?: RevenueStatsDto | null;
  riskUsers?: DetailedRiskUserDto[];
  opportunityUsers?: OpportunityUserDto[];
}
```

### 3.2 OpsDashboard UI 수정

**파일**: `src/v2/admin/pages/dashboard/OpsDashboard.tsx`

기회 그룹 섹션에 `opportunityUsers` 실제 데이터 표시:

```tsx
{status?.opportunityUsers && status.opportunityUsers.length > 0 ? (
  <div className="space-y-2">
    {status.opportunityUsers.slice(0, 5).map((u) => (
      <div key={u.userId} className="flex items-center justify-between p-2 ...">
        <div className="flex flex-col">
          <span className="text-sm font-bold">{u.nickname || `유저 #${u.userId}`}</span>
          <span className="text-[10px]">총 마진: ₩{(u.totalMargin ?? 0).toLocaleString()}</span>
        </div>
        <Badge variant="outline" className={u.segment === "WHALE" ? "border-blue-500/50" : "border-purple-500/50"}>
          {u.segment === "WHALE" ? "큰손 🐋" : "VIP ⭐"}
        </Badge>
      </div>
    ))}
  </div>
) : (
  <div className="text-center py-8 text-obsidian-muted">현재 활동 중인 기회 그룹 유저가 없습니다.</div>
)}
```

### 3.3 AnalyticsDashboard CSV Fallback

**파일**: `src/v2/admin/pages/ops/AnalyticsDashboard.tsx`

```tsx
// useOpsStatus hook 추가
import { useOpsStatus } from "../../../hooks/useV2Admin";
const { data: opsStatus } = useOpsStatus();

// CSV revenueStats fallback 적용
const csvRevenueStats = opsStatus?.revenueStats;
const todayRevenue =
  dailyFinance?.revenue?.total_deposits ?? 
  revenueSummary?.today_revenue ?? 
  csvRevenueStats?.todayRevenue;
const todayDepositCount = 
  dailyFinance?.revenue?.deposit_count ?? 
  csvRevenueStats?.depositCount;
const todayExpenses =
  dailyFinance?.spending?.total_withdrawals ?? 
  revenueSummary?.today_expenses ?? 
  csvRevenueStats?.todayExpenses;
const weeklyGrowthRate = csvRevenueStats?.weeklyGrowthRate;
```

---

## 4. 데이터 흐름

```
┌────────────────────┐
│  CSV 파일 업로드    │
│  (Game Log/HQ Margin)│
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ CSVImportService   │
│ save_to_db=True    │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│   V2GameLog 테이블  │
│   (영속 저장)       │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│GameLogAnalyticsService│
│ - get_revenue_summary │
│ - get_risk_users      │
│ - get_opportunity_users│
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│ /api/v2/admin/ops/status │
│ revenueStats, riskUsers, │
│ opportunityUsers 포함     │
└─────────┬──────────┘
          │
    ┌─────┴─────┐
    ▼           ▼
┌────────┐  ┌────────────┐
│OpsDash │  │AnalyticsDash│
│board   │  │board        │
└────────┘  └────────────┘
```

---

## 5. 배포 체크리스트

### 5.1 마이그레이션 적용
```bash
docker compose exec backend alembic upgrade head
```

### 5.2 백엔드 재시작
```bash
docker compose restart backend
```

### 5.3 프론트엔드 빌드
```bash
npm run build
```

### 5.4 검증 항목

| 항목 | 검증 방법 |
|------|----------|
| V2GameLog 테이블 생성 | `SHOW TABLES LIKE 'v2_game_log';` |
| CSV 임포트 후 DB 저장 | `SELECT COUNT(*) FROM v2_game_log;` |
| /ops/status 응답에 revenueStats 포함 | curl 또는 Swagger |
| OpsDashboard 기회 그룹 표시 | UI 확인 |
| AnalyticsDashboard 수익 표시 | UI 확인 |

---

## 6. 변경 이력

| 버전 | 일시 | 변경 내용 |
|------|------|----------|
| v1.0 | 2026-02-02 14:00 | 초기 구현 완료 |

---

## 7. 관련 문서

- [14.csv_data_integration_expansion_spec.md](./14.csv_data_integration_expansion_spec.md) - 설계 문서
- [12.hq_margin_csv_import_comprehensive.md](./12.hq_margin_csv_import_comprehensive.md) - HQ Margin Import SoT
- [13.game_log_csv_import_spec.md](./13.game_log_csv_import_spec.md) - Game Log Import SoT
