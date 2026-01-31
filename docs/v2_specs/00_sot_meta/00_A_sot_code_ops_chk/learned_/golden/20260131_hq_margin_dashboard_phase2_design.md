# HQ Margin Ops Dashboard 통합 (Phase 2)

**문서 타입**: Learned SoT
**도메인**: Golden / Ops
**작성일**: 2026-01-31
**상태**: 설계 진행 중

---

## 1. 목적 (Purpose)

Phase 1에서 구현한 HQ Margin CSV Import 기능을 기반으로:
- Ops Dashboard에 본사 마진 현황 카드 추가
- 마지막 동기화 시각 및 세그먼트별 유저 분포 시각화
- VIP/WHALE/AT_RISK 유저 수 실시간 모니터링

---

## 2. 설계 개요

### 2.1 아키텍처

```
[V2 Admin Dashboard]
    ↓
[OpsDashboard.tsx]
    ↓ (API 호출)
[/api/v2/admin/ops/hq-margin-stats]
    ↓
[HQMarginStatsService]
    ↓ (쿼리)
[user_segment, v2_admin_audit_log]
    ↓
[세그먼트별 통계 반환]
```

### 2.2 화면 설계

```
┌─────────────────────────────────────────┐
│ 💰 본사 마진 현황                        │
├─────────────────────────────────────────┤
│ 마지막 동기화: 2026-01-31 14:30:00     │
│                                         │
│ ┌─────┬─────┬─────┬─────┐             │
│ │ VIP │WHALE│AT_R │COMM │             │
│ │ 45  │ 23  │ 12  │ 320 │             │
│ └─────┴─────┴─────┴─────┘             │
│                                         │
│ 총 세그먼트 유저: 400명                 │
│ 이번주 업데이트: 150건                  │
└─────────────────────────────────────────┘
```

---

## 3. 백엔드 API 설계

### 3.1 엔드포인트

```python
GET /api/v2/admin/ops/hq-margin-stats
```

### 3.2 Response Schema

```python
class HQMarginStatsResponse(BaseModel):
    last_sync_at: Optional[datetime]  # 마지막 HQ_MARGIN_IMPORT 시각
    segment_distribution: Dict[str, int]  # {"VIP": 45, "WHALE": 23, ...}
    total_users: int  # 총 세그먼트 유저 수
    this_week_updates: int  # 이번주 업데이트 건수
```

### 3.3 샘플 응답

```json
{
  "last_sync_at": "2026-01-31T14:30:00+09:00",
  "segment_distribution": {
    "VIP": 45,
    "WHALE": 23,
    "AT_RISK": 12,
    "COMMON": 320
  },
  "total_users": 400,
  "this_week_updates": 150
}
```

---

## 4. 구현 파일

### 4.1 백엔드

| 파일 | 내용 |
|------|------|
| `app/v2/services/hq_margin_stats_service.py` | HQ Margin 통계 서비스 (신규) |
| `app/v2/api/admin/ops_routes.py` | `/hq-margin-stats` 엔드포인트 추가 |
| `app/v2/schemas/v2_ops.py` | `HQMarginStatsResponse` 스키마 |

### 4.2 프론트엔드

| 파일 | 내용 |
|------|------|
| `src/v2/admin/pages/dashboard/OpsDashboard.tsx` | HQ Margin 카드 추가 |
| `src/v2/api/adminApi.ts` | `getHQMarginStats()` API 함수 |

---

## 5. 서비스 로직

### 5.1 HQMarginStatsService

```python
class HQMarginStatsService:
    @staticmethod
    def get_hq_margin_stats(db: Session) -> HQMarginStatsResponse:
        """
        HQ Margin 통계 조회

        Returns:
            - last_sync_at: v2_admin_audit_log에서 HQ_MARGIN_IMPORT 최근 실행 시각
            - segment_distribution: user_segment 테이블에서 세그먼트별 카운트
            - total_users: 총 세그먼트 유저 수
            - this_week_updates: 이번주 HQ_MARGIN_IMPORT 총 업데이트 건수
        """
        # 1. 마지막 동기화 시각
        last_sync = db.query(V2AdminAuditLog).filter(
            V2AdminAuditLog.action == "HQ_MARGIN_IMPORT"
        ).order_by(V2AdminAuditLog.created_at.desc()).first()

        # 2. 세그먼트 분포
        segment_counts = db.query(
            UserSegment.segment,
            func.count(UserSegment.id)
        ).group_by(UserSegment.segment).all()

        # 3. 이번주 업데이트 건수
        week_start = datetime.now(timezone.utc) - timedelta(days=7)
        this_week_logs = db.query(V2AdminAuditLog).filter(
            V2AdminAuditLog.action == "HQ_MARGIN_IMPORT",
            V2AdminAuditLog.created_at >= week_start
        ).all()

        this_week_updates = sum(
            log.changes.get("updated", 0) + log.changes.get("created", 0)
            for log in this_week_logs
        )

        return HQMarginStatsResponse(
            last_sync_at=last_sync.created_at if last_sync else None,
            segment_distribution={s: c for s, c in segment_counts},
            total_users=sum(c for _, c in segment_counts),
            this_week_updates=this_week_updates,
        )
```

---

## 6. 프론트엔드 UI

### 6.1 HQ Margin 카드 컴포넌트

```tsx
// OpsDashboard.tsx 내 추가
const HQMarginCard = () => {
  const { data: stats } = useQuery({
    queryKey: ["hq-margin-stats"],
    queryFn: getHQMarginStats,
    refetchInterval: 60000, // 1분마다 갱신
  });

  if (!stats) return <Card>로딩 중...</Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-500" />
          💰 본사 마진 현황
        </CardTitle>
        <CardDescription>
          마지막 동기화: {formatDateTime(stats.last_sync_at)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* 세그먼트 분포 */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <MetricBox label="VIP" value={stats.segment_distribution.VIP ?? 0} color="purple" />
          <MetricBox label="WHALE" value={stats.segment_distribution.WHALE ?? 0} color="blue" />
          <MetricBox label="AT_RISK" value={stats.segment_distribution.AT_RISK ?? 0} color="orange" />
          <MetricBox label="COMMON" value={stats.segment_distribution.COMMON ?? 0} color="gray" />
        </div>

        {/* 요약 정보 */}
        <div className="text-sm text-muted-foreground">
          <p>총 세그먼트 유저: <strong>{stats.total_users}명</strong></p>
          <p>이번주 업데이트: <strong>{stats.this_week_updates}건</strong></p>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## 7. 권한 및 보안

- **조회 권한**: `ADMIN` 또는 `SUPER_ADMIN`
- **데이터 캐싱**: React Query 1분 캐시
- **에러 처리**: API 실패 시 기본값 표시

---

## 8. 테스트 계획

### 8.1 백엔드 테스트

```python
def test_get_hq_margin_stats_success():
    # Given: DB에 세그먼트 데이터 및 감사 로그 존재
    # When: get_hq_margin_stats() 호출
    # Then: 정상적인 통계 반환
    pass

def test_get_hq_margin_stats_no_sync():
    # Given: HQ_MARGIN_IMPORT 이력 없음
    # When: get_hq_margin_stats() 호출
    # Then: last_sync_at=None, 세그먼트는 정상 반환
    pass
```

### 8.2 프론트엔드 테스트

- [ ] HQ Margin 카드 렌더링 확인
- [ ] API 실패 시 에러 핸들링
- [ ] 1분마다 자동 갱신 확인

---

## 9. 배포 체크리스트

- [ ] `HQMarginStatsService` 구현
- [ ] `/api/v2/admin/ops/hq-margin-stats` 엔드포인트 추가
- [ ] `OpsDashboard.tsx` HQ Margin 카드 추가
- [ ] 프론트엔드 빌드 및 배포
- [ ] 어드민 대시보드 접속하여 카드 표시 확인

---

## 10. 관련 문서

- **Phase 1 구현**: `docs/.../golden/20260131_hq_margin_csv_import_implementation.md`
- **Phase 1 설계**: `docs/.../golden/20260131_hq_margin_csv_import_design.md`
- **Ops Dashboard 기존 구조**: `src/v2/admin/pages/dashboard/OpsDashboard.tsx`

---

## 11. 변경 이력

- v1.0 (2026-01-31): Phase 2 설계 작성

---

**상태**: 설계 완료, 구현 대기
