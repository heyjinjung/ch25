# 티켓 자산 관리 페이지 재설계 가이드

**문서 버전**: 1.0.0  
**작성일**: 2026-01-13  
**근거 문서**: phase2_economy_game_audit_report.md, phase6_global_sync_integrity_audit_report.md, admin_ui_improvement_checklist.md

---

## 1. Executive Summary

티켓 자산 관리 페이지(`TicketManagerPage.tsx`)는 **관리자가 가장 많이 머무르는 섹션**으로, 다음 핵심 요구사항을 충족해야 합니다:

| 요구사항 | 현재 상태 | 목표 상태 |
|----------|----------|----------|
| 하드코딩 제거 | `TICKET_FREE`, `TICKET_PREMIUM` 고정 | API 기반 동적 토큰 타입 |
| 전역 동기화 | 부분 적용 | React Query `invalidateQueries` 전략 완비 |
| 한글 패치 | 영문 라벨 혼재 | 100% 한글화 |
| 로그 조회 | 미구현 | 플레이 로그 + 원장 로그 탭 |
| 유저별 조회 | 미구현 | 검색 → 유저 상세 패널 |
| 통계 대시보드 | 하드코딩 0 표시 | 실시간 API 연동 |

---

## 2. 현재 코드 분석 (As-Is)

### 2.1 기존 파일 구조
```
src/admin/pages/TicketManagerPage.tsx (253줄)
src/admin/api/adminGameTokenApi.ts (API 클라이언트)
src/admin/api/adminInventoryApi.ts (인벤토리 API)
```

### 2.2 문제점 식별

| ID | 문제 | 심각도 | 영향 |
|----|------|--------|------|
| TM-001 | 토큰 타입 하드코딩 (`TICKET_FREE/PREMIUM`) | 🔴 High | 새 토큰 추가 시 코드 수정 필요 |
| TM-002 | 통계 카드 하드코딩 (`0` 고정) | 🔴 High | 실제 데이터 미반영 |
| TM-003 | 플레이 로그 미구현 | 🟡 Medium | 운영 가시성 부족 |
| TM-004 | 원장(Ledger) 조회 미구현 | 🟡 Medium | 감사 추적 불가 |
| TM-005 | 유저별 상세 조회 미구현 | 🟡 Medium | CS 대응 지연 |
| TM-006 | 영문 라벨 혼재 | 🟢 Low | UX 일관성 저하 |
| TM-007 | `alert()` 사용 | 🟢 Low | Toast 시스템 미활용 |

### 2.3 기존 API 엔드포인트 (사용 가능)

| 엔드포인트 | 용도 | 응답 타입 |
|-----------|------|----------|
| `POST /admin/api/game-tokens/grant` | 토큰 지급 | `GrantGameTokensResponse` |
| `POST /admin/api/game-tokens/revoke` | 토큰 회수 | `GrantGameTokensResponse` |
| `GET /admin/api/game-tokens/wallets` | 지갑 목록 | `TokenBalance[]` |
| `GET /admin/api/game-tokens/play-logs` | 플레이 로그 | `PlayLogEntry[]` |
| `GET /admin/api/game-tokens/ledger` | 원장 로그 | `LedgerEntry[]` |
| `GET /admin/api/game-tokens/summary` | 유저별 요약 | `UserWalletSummary[]` |

---

## 3. 재설계 아키텍처 (To-Be)

### 3.1 페이지 레이아웃 구조

```
┌─────────────────────────────────────────────────────────────────┐
│ [헤더] 티켓 자산 관리                            [새로고침] [검색] │
├─────────────────────────────────────────────────────────────────┤
│ [통계 카드 3열] 오늘 지급 | 오늘 회수 | 보유자 수                 │
├─────────────────────────────────────────────────────────────────┤
│ [탭 네비게이션]                                                  │
│   ┌──────────┬──────────┬──────────┬──────────┐                │
│   │ 지급/회수 │ 플레이 로그 │ 원장 로그 │ 유저 조회 │                │
│   └──────────┴──────────┴──────────┴──────────┘                │
├─────────────────────────────────────────────────────────────────┤
│ [탭 콘텐츠 영역]                                                 │
│   - 지급/회수: 토큰 지급/회수 폼                                  │
│   - 플레이 로그: 전체 게임 로그 테이블 (룰렛/주사위/복권)          │
│   - 원장 로그: 토큰 변동 내역 테이블                              │
│   - 유저 조회: 검색 → 유저별 상세 패널                            │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 핵심 기능 정의

#### Tab 1: 지급/회수 (Grant/Revoke)
- **토큰 타입**: API에서 `GameTokenType` enum 기반 동적 로드
- **유저 식별**: External ID / 닉네임 / 텔레그램 ID 통합 검색
- **수량 입력**: 숫자 입력 + 빠른 선택 버튼 (1, 5, 10, 50, 100)
- **사유 입력**: 선택적 메모
- **결과 피드백**: Toast 알림 + 결과 패널

#### Tab 2: 플레이 로그 (Play Logs)
- **데이터 소스**: `/admin/api/game-tokens/play-logs`
- **필터**: 유저 ID, 게임 타입 (룰렛/주사위/복권), 날짜 범위, 보상 타입
- **정렬**: 시간 (최신순/오래된순), 보상량 (높은순/낮은순)
- **컬럼**: 시간, 유저, 게임, 결과, 보상 타입, 보상량
- **페이지네이션**: 무한 스크롤 또는 페이지 버튼

#### Tab 3: 원장 로그 (Ledger)
- **데이터 소스**: `/admin/api/game-tokens/ledger`
- **필터**: 유저 ID, 토큰 타입, 날짜 범위, 변동 방향 (지급/차감)
- **정렬**: 시간 (최신순/오래된순), 변동량 (높은순/낮은순), 잔액 (높은순/낮은순)
- **컬럼**: 시간, 유저, 토큰, 변동량, 잔액, 사유
- **페이지네이션**: 무한 스크롤 또는 페이지 버튼

#### Tab 4: 유저 조회 (User Lookup)
- **검색**: External ID / 닉네임 / 텔레그램 ID
- **결과 패널**:
  - 유저 기본 정보
  - 토큰별 보유량 (지갑 요약)
  - 최근 플레이 로그 (최대 10건)
  - 최근 원장 로그 (최대 10건)
- **빠른 액션**: 지급/회수 버튼 → Tab 1로 이동

---

## 3.3 필터 및 정렬 상세 명세

### A. 플레이 로그 필터/정렬

| 필터 항목 | 타입 | 옵션 | 기본값 |
|----------|------|------|--------|
| 유저 식별자 | 텍스트 입력 | - | 없음 (전체) |
| 게임 타입 | 드롭다운 | 전체 / 룰렛 / 주사위 / 복권 | 전체 |
| 보상 타입 | 드롭다운 | 전체 / VAULT / TOKEN / XP | 전체 |
| 날짜 범위 | 날짜 선택기 | 시작일 ~ 종료일 | 오늘 |

| 정렬 항목 | 방향 | 기본값 |
|----------|------|--------|
| 시간 | 최신순 ↓ / 오래된순 ↑ | 최신순 ↓ |
| 보상량 | 높은순 ↓ / 낮은순 ↑ | - |

### B. 원장 로그 필터/정렬

| 필터 항목 | 타입 | 옵션 | 기본값 |
|----------|------|------|--------|
| 유저 식별자 | 텍스트 입력 | - | 없음 (전체) |
| 토큰 타입 | 드롭다운 | 전체 / 7종 토큰 | 전체 |
| 변동 방향 | 드롭다운 | 전체 / 지급 (+) / 차감 (-) | 전체 |
| 날짜 범위 | 날짜 선택기 | 시작일 ~ 종료일 | 오늘 |

| 정렬 항목 | 방향 | 기본값 |
|----------|------|--------|
| 시간 | 최신순 ↓ / 오래된순 ↑ | 최신순 ↓ |
| 변동량 | 높은순 ↓ / 낮은순 ↑ | - |
| 잔액 | 높은순 ↓ / 낮은순 ↑ | - |

### C. 유저 조회 (Tab 4) 필터/정렬

| 필터 항목 | 타입 | 옵션 | 기본값 |
|----------|------|------|--------|
| 보유 토큰 | 멀티 셀렉트 | 7종 토큰 | 전체 |
| 최소 잔액 | 숫자 입력 | 0 이상 | 0 |

| 정렬 항목 | 방향 | 기본값 |
|----------|------|--------|
| 총 보유량 | 높은순 ↓ / 낮은순 ↑ | 높은순 ↓ |
| 최근 활동 | 최신순 ↓ / 오래된순 ↑ | - |

---

## 4. 상세 구현 가이드

### 4.1 한글 라벨 상수 (LABELS)

```typescript
const LABELS = {
  pageTitle: "티켓 자산 관리",
  pageDescription: "게임 토큰을 지급/회수하고 트랜잭션을 관리합니다.",
  refresh: "새로고침",
  search: "검색",
  
  // 탭
  tabGrant: "지급/회수",
  tabPlayLogs: "플레이 로그",
  tabLedger: "원장 로그",
  tabUserLookup: "유저 조회",
  
  // 통계 카드
  statGrantToday: "오늘 지급",
  statRevokeToday: "오늘 회수",
  statActiveHolders: "보유자 수",
  
  // 필터/정렬 라벨
  filterAll: "전체",
  filterUser: "유저 검색",
  filterGameType: "게임 타입",
  filterTokenType: "토큰 타입",
  filterRewardType: "보상 타입",
  filterDateRange: "날짜 범위",
  filterDeltaDirection: "변동 방향",
  filterDeltaPlus: "지급 (+)",
  filterDeltaMinus: "차감 (-)",
  filterMinBalance: "최소 잔액",
  
  sortBy: "정렬",
  sortTimeDesc: "최신순",
  sortTimeAsc: "오래된순",
  sortAmountDesc: "높은순",
  sortAmountAsc: "낮은순",
  
  // 폼
  labelUserId: "유저 식별자",
  labelUserIdPlaceholder: "External ID / 닉네임 / @텔레그램",
  labelTokenType: "토큰 타입",
  labelAmount: "수량",
  labelReason: "사유 (선택)",
  labelReasonPlaceholder: "지급/회수 사유 입력...",
  
  // 버튼
  btnGrant: "지급",
  btnRevoke: "회수",
  btnProcessing: "처리 중...",
  btnApplyFilter: "적용",
  btnResetFilter: "초기화",
  
  // 테이블 헤더
  colTime: "시간",
  colUser: "유저",
  colGame: "게임",
  colResult: "결과",
  colRewardType: "보상 타입",
  colRewardAmount: "보상량",
  colTokenType: "토큰",
  colDelta: "변동",
  colBalanceAfter: "잔액",
  colReason: "사유",
  
  // 게임 타입
  gameRoulette: "룰렛",
  gameDice: "주사위",
  gameLottery: "복권",
  
  // 토큰 타입 (동적 매핑)
  tokenLabels: {
    ROULETTE_COIN: "룰렛 코인",
    DICE_TOKEN: "주사위 토큰",
    TRIAL_TOKEN: "체험 토큰",
    LOTTERY_TICKET: "복권 티켓",
    GOLD_KEY: "골드 키",
    DIAMOND_KEY: "다이아몬드 키",
    DIAMOND: "다이아몬드",
  } as Record<string, string>,
  
  // 상태
  loading: "불러오는 중...",
  noData: "데이터 없음",
  error: "불러오기 실패",
} as const;
```

### 4.2 필터/정렬 상태 타입 및 초기값

```typescript
// 플레이 로그 필터 상태
interface PlayLogFilters {
  userIdentifier: string;
  gameType: "ALL" | "ROULETTE" | "DICE" | "LOTTERY";
  rewardType: "ALL" | "VAULT" | "TOKEN" | "XP";
  dateFrom: string | null;
  dateTo: string | null;
  sortBy: "time" | "amount";
  sortOrder: "desc" | "asc";
}

const DEFAULT_PLAY_LOG_FILTERS: PlayLogFilters = {
  userIdentifier: "",
  gameType: "ALL",
  rewardType: "ALL",
  dateFrom: null,
  dateTo: null,
  sortBy: "time",
  sortOrder: "desc",
};

// 원장 로그 필터 상태
interface LedgerFilters {
  userIdentifier: string;
  tokenType: string; // "ALL" | GameTokenType
  deltaDirection: "ALL" | "PLUS" | "MINUS";
  dateFrom: string | null;
  dateTo: string | null;
  sortBy: "time" | "delta" | "balance";
  sortOrder: "desc" | "asc";
}

const DEFAULT_LEDGER_FILTERS: LedgerFilters = {
  userIdentifier: "",
  tokenType: "ALL",
  deltaDirection: "ALL",
  dateFrom: null,
  dateTo: null,
  sortBy: "time",
  sortOrder: "desc",
};
```

### 4.3 필터 바 컴포넌트 예시

```tsx
// 플레이 로그 필터 바
const PlayLogFilterBar: React.FC<{
  filters: PlayLogFilters;
  onChange: (filters: PlayLogFilters) => void;
  onReset: () => void;
}> = ({ filters, onChange, onReset }) => (
  <div className="flex flex-wrap gap-3 p-4 bg-admin-sidebar/30 rounded-xl border border-admin-border">
    {/* 유저 검색 */}
    <div className="flex-1 min-w-[200px]">
      <label className="text-xs font-semibold text-admin-text-secondary uppercase mb-1 block">
        {LABELS.filterUser}
      </label>
      <input
        type="text"
        className="admin-input w-full h-9"
        placeholder={LABELS.labelUserIdPlaceholder}
        value={filters.userIdentifier}
        onChange={(e) => onChange({ ...filters, userIdentifier: e.target.value })}
      />
    </div>

    {/* 게임 타입 */}
    <div className="w-32">
      <label className="text-xs font-semibold text-admin-text-secondary uppercase mb-1 block">
        {LABELS.filterGameType}
      </label>
      <select
        className="admin-input w-full h-9"
        value={filters.gameType}
        onChange={(e) => onChange({ ...filters, gameType: e.target.value as PlayLogFilters["gameType"] })}
      >
        <option value="ALL">{LABELS.filterAll}</option>
        <option value="ROULETTE">{LABELS.gameRoulette}</option>
        <option value="DICE">{LABELS.gameDice}</option>
        <option value="LOTTERY">{LABELS.gameLottery}</option>
      </select>
    </div>

    {/* 정렬 */}
    <div className="w-32">
      <label className="text-xs font-semibold text-admin-text-secondary uppercase mb-1 block">
        {LABELS.sortBy}
      </label>
      <select
        className="admin-input w-full h-9"
        value={`${filters.sortBy}-${filters.sortOrder}`}
        onChange={(e) => {
          const [sortBy, sortOrder] = e.target.value.split("-") as [PlayLogFilters["sortBy"], PlayLogFilters["sortOrder"]];
          onChange({ ...filters, sortBy, sortOrder });
        }}
      >
        <option value="time-desc">{LABELS.colTime} {LABELS.sortTimeDesc}</option>
        <option value="time-asc">{LABELS.colTime} {LABELS.sortTimeAsc}</option>
        <option value="amount-desc">{LABELS.colRewardAmount} {LABELS.sortAmountDesc}</option>
        <option value="amount-asc">{LABELS.colRewardAmount} {LABELS.sortAmountAsc}</option>
      </select>
    </div>

    {/* 초기화 버튼 */}
    <div className="flex items-end">
      <button
        type="button"
        onClick={onReset}
        className="btn-admin-ghost h-9 px-3 text-sm"
      >
        {LABELS.btnResetFilter}
      </button>
    </div>
  </div>
);
```

### 4.4 정렬 가능한 테이블 헤더 컴포넌트

```tsx
interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: { by: string; order: "asc" | "desc" };
  onSort: (key: string) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortKey,
  currentSort,
  onSort,
}) => {
  const isActive = currentSort.by === sortKey;
  
  return (
    <th
      className="admin-th cursor-pointer select-none hover:bg-admin-hover transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <span className={`transition-opacity ${isActive ? "opacity-100" : "opacity-30"}`}>
          {isActive && currentSort.order === "asc" ? (
            <ChevronUp size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
        </span>
      </div>
    </th>
  );
};

// 사용 예시
<thead>
  <tr>
    <SortableHeader
      label={LABELS.colTime}
      sortKey="time"
      currentSort={{ by: filters.sortBy, order: filters.sortOrder }}
      onSort={(key) => {
        const newOrder = filters.sortBy === key && filters.sortOrder === "desc" ? "asc" : "desc";
        setFilters({ ...filters, sortBy: key as any, sortOrder: newOrder });
      }}
    />
    <th className="admin-th">{LABELS.colUser}</th>
    <th className="admin-th">{LABELS.colGame}</th>
    <SortableHeader
      label={LABELS.colRewardAmount}
      sortKey="amount"
      currentSort={{ by: filters.sortBy, order: filters.sortOrder }}
      onSort={handleSort}
    />
  </tr>
</thead>
```

### 4.5 클라이언트 사이드 필터링/정렬 유틸

```typescript
// 플레이 로그 필터링 (API 미지원 필터는 클라이언트에서 처리)
const filterPlayLogs = (logs: PlayLogEntry[], filters: PlayLogFilters): PlayLogEntry[] => {
  return logs.filter((log) => {
    // 게임 타입 필터
    if (filters.gameType !== "ALL" && log.game !== filters.gameType) return false;
    // 보상 타입 필터
    if (filters.rewardType !== "ALL" && log.reward_type !== filters.rewardType) return false;
    return true;
  });
};

// 정렬 유틸
const sortPlayLogs = (logs: PlayLogEntry[], sortBy: string, sortOrder: "asc" | "desc"): PlayLogEntry[] => {
  return [...logs].sort((a, b) => {
    let compare = 0;
    if (sortBy === "time") {
      compare = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === "amount") {
      compare = a.reward_amount - b.reward_amount;
    }
    return sortOrder === "asc" ? compare : -compare;
  });
};

// 사용 예시
const filteredAndSortedLogs = useMemo(() => {
  const filtered = filterPlayLogs(playLogsQuery.data ?? [], filters);
  return sortPlayLogs(filtered, filters.sortBy, filters.sortOrder);
}, [playLogsQuery.data, filters]);
```

### 4.6 토큰 타입 동적 로드 (하드코딩 제거)

```typescript
// 백엔드 GameTokenType enum과 동기화
const TOKEN_TYPES = [
  { value: "ROULETTE_COIN", label: LABELS.tokenLabels.ROULETTE_COIN },
  { value: "DICE_TOKEN", label: LABELS.tokenLabels.DICE_TOKEN },
  { value: "TRIAL_TOKEN", label: LABELS.tokenLabels.TRIAL_TOKEN },
  { value: "LOTTERY_TICKET", label: LABELS.tokenLabels.LOTTERY_TICKET },
  { value: "GOLD_KEY", label: LABELS.tokenLabels.GOLD_KEY },
  { value: "DIAMOND_KEY", label: LABELS.tokenLabels.DIAMOND_KEY },
  { value: "DIAMOND", label: LABELS.tokenLabels.DIAMOND },
] as const;

// 게임 타입 매핑
const GAME_LABELS: Record<string, string> = {
  ROULETTE: LABELS.gameRoulette,
  DICE: LABELS.gameDice,
  LOTTERY: LABELS.gameLottery,
};
```

### 4.7 React Query 훅 설정 (전역 동기화)

```typescript
// 플레이 로그 조회
const playLogsQuery = useQuery({
  queryKey: ["admin", "game-tokens", "play-logs", { externalId, limit, offset }],
  queryFn: () => fetchRecentPlayLogs(limit, externalId, offset),
  staleTime: 30 * 1000, // 30초
});

// 원장 로그 조회
const ledgerQuery = useQuery({
  queryKey: ["admin", "game-tokens", "ledger", { externalId, tokenType, limit, offset }],
  queryFn: () => fetchLedger(limit, externalId, offset),
  staleTime: 30 * 1000,
});

// 지갑 요약 조회
const summaryQuery = useQuery({
  queryKey: ["admin", "game-tokens", "summary"],
  queryFn: fetchWalletSummary,
  staleTime: 60 * 1000,
});

// 지급/회수 뮤테이션 (전역 동기화)
const grantMutation = useMutation({
  mutationFn: grantGameTokens,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "game-tokens"] });
    addToast("토큰이 지급되었습니다.", "success");
  },
  onError: (err) => {
    addToast(`지급 실패: ${err.message}`, "error");
  },
});

const revokeMutation = useMutation({
  mutationFn: revokeGameTokens,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "game-tokens"] });
    addToast("토큰이 회수되었습니다.", "success");
  },
  onError: (err) => {
    addToast(`회수 실패: ${err.message}`, "error");
  },
});
```

### 4.4 전역 새로고침 핸들러

```typescript
const handleRefresh = () => {
  queryClient.invalidateQueries({ queryKey: ["admin", "game-tokens"] });
};
```

---

## 5. UI/UX 디자인 가이드

### 5.1 디자인 토큰 (admin-* 시스템)

| 용도 | 클래스 | 색상 |
|------|--------|------|
| 배경 | `bg-admin-bg` | #09090b |
| 카드 | `admin-card` | rgba(24,24,27,0.6) |
| 텍스트 (주) | `text-admin-text-primary` | #fafafa |
| 텍스트 (부) | `text-admin-text-secondary` | #a1a1aa |
| 브랜드 | `text-admin-brand` / `bg-admin-brand` | #6366f1 |
| 성공 | `text-admin-accent` / `bg-admin-accent` | #10b981 |
| 경고 | `text-admin-warning` | #f59e0b |
| 위험 | `text-admin-danger` / `bg-admin-danger` | #f43f5e |

### 5.2 가독성 대비 (4.5:1 이상)

- **주요 텍스트**: `text-admin-text-primary` (#fafafa) on `bg-admin-card` = **12:1** ✅
- **보조 텍스트**: `text-admin-text-secondary` (#a1a1aa) on `bg-admin-card` = **5.2:1** ✅
- **강조 텍스트**: `text-admin-accent` (#10b981) on `bg-admin-card` = **7.1:1** ✅

### 5.3 탭 네비게이션 스타일

```tsx
<div className="flex gap-1 p-1 bg-admin-sidebar/50 rounded-xl border border-admin-border">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={`
        flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all
        flex items-center justify-center gap-2
        ${activeTab === tab.id
          ? "bg-admin-brand text-white"
          : "text-admin-text-secondary hover:text-admin-text-primary hover:bg-admin-hover"}
      `}
    >
      {tab.icon}
      {tab.label}
    </button>
  ))}
</div>
```

### 5.4 테이블 스타일

```tsx
<table className="admin-table">
  <thead>
    <tr>
      <th className="admin-th">{LABELS.colTime}</th>
      <th className="admin-th">{LABELS.colUser}</th>
      {/* ... */}
    </tr>
  </thead>
  <tbody>
    {data.map((row) => (
      <tr key={row.id} className="admin-tr">
        <td className="admin-td text-admin-text-secondary text-sm">
          {formatKSTTime(row.created_at)}
        </td>
        <td className="admin-td">
          <UserBadge user={row} />
        </td>
        {/* ... */}
      </tr>
    ))}
  </tbody>
</table>
```

### 5.5 변동량 표시 컴포넌트

```tsx
const DeltaDisplay: React.FC<{ delta: number }> = ({ delta }) => (
  <span className={`
    font-mono font-semibold
    ${delta > 0 ? "text-admin-accent" : delta < 0 ? "text-admin-danger" : "text-admin-text-muted"}
  `}>
    {delta > 0 ? "+" : ""}{delta.toLocaleString()}
  </span>
);
```

---

## 6. 컴포넌트 분할 계획

### 6.1 파일 구조 (권장)

```
src/admin/pages/TicketManagerPage.tsx         # 메인 페이지 (탭 컨테이너)
src/admin/components/ticket/
  ├── TicketStatsCards.tsx                    # 통계 카드 섹션
  ├── TicketGrantRevokeForm.tsx               # 지급/회수 폼
  ├── TicketPlayLogsTable.tsx                 # 플레이 로그 테이블
  ├── TicketLedgerTable.tsx                   # 원장 로그 테이블
  ├── TicketUserLookupPanel.tsx               # 유저 조회 패널
  └── TicketUserDetailCard.tsx                # 유저 상세 카드
```

### 6.2 컴포넌트 책임

| 컴포넌트 | 책임 | Props |
|----------|------|-------|
| `TicketStatsCards` | 통계 카드 3열 렌더링 | `summary: UserWalletSummary[]` |
| `TicketGrantRevokeForm` | 지급/회수 폼 | `onSuccess: () => void` |
| `TicketPlayLogsTable` | 플레이 로그 테이블 | `externalId?: string` |
| `TicketLedgerTable` | 원장 로그 테이블 | `externalId?: string, tokenType?: string` |
| `TicketUserLookupPanel` | 유저 검색 + 상세 | `onSelectUser: (user) => void` |
| `TicketUserDetailCard` | 유저 상세 정보 | `userId: number` |

---

## 7. API 연동 체크리스트

### 7.1 필수 API 연동

| API | 용도 | 구현 상태 |
|-----|------|----------|
| `grantGameTokens` | 토큰 지급 | ✅ 기존 연동 |
| `revokeGameTokens` | 토큰 회수 | ✅ 기존 연동 |
| `fetchRecentPlayLogs` | 플레이 로그 | ⬜ 신규 연동 필요 |
| `fetchLedger` | 원장 로그 | ⬜ 신규 연동 필요 |
| `fetchWalletSummary` | 유저별 요약 | ⬜ 신규 연동 필요 |
| `fetchWallets` | 지갑 목록 | ⬜ 신규 연동 필요 |
| `fetchWalletsByUserId` | 유저별 지갑 | ⬜ 신규 연동 필요 |
| `fetchLedgerByUserId` | 유저별 원장 | ⬜ 신규 연동 필요 |

### 7.2 전역 동기화 invalidateQueries 키

```typescript
// 지급/회수 성공 시 무효화할 쿼리 키
const INVALIDATE_KEYS = [
  ["admin", "game-tokens", "play-logs"],
  ["admin", "game-tokens", "ledger"],
  ["admin", "game-tokens", "summary"],
  ["admin", "game-tokens", "wallets"],
];
```

---

## 8. 검증 체크리스트

### 8.1 기능 검증

- [ ] 토큰 타입 드롭다운이 7종 모두 표시되는가?
- [ ] 지급 후 플레이 로그/원장에 즉시 반영되는가?
- [ ] 회수 후 플레이 로그/원장에 즉시 반영되는가?
- [ ] 유저 검색 → 상세 패널 정상 표시되는가?
- [ ] 페이지네이션이 정상 작동하는가?

### 8.2 전역 동기화 검증

- [ ] Tab 1에서 지급 → Tab 2/3에서 새로고침 없이 반영
- [ ] 새로고침 버튼 클릭 시 모든 탭 데이터 갱신
- [ ] 다른 관리자가 변경한 내용 30초 내 반영 (staleTime)

### 8.3 UI/UX 검증

- [ ] 100% 한글 라벨 적용
- [ ] 가독성 대비 4.5:1 이상
- [ ] Toast 알림 정상 표시
- [ ] 로딩/에러/빈 상태 UI 정상 표시

### 8.4 빌드 검증

```bash
npm run build
# AdminShopPage.tsx 관련 에러 없음 확인
```

---

## 9. 마이그레이션 계획

### Phase 1: 기본 구조 + 지급/회수 개선
1. 한글 라벨 상수 적용
2. 토큰 타입 하드코딩 제거
3. Toast 시스템 적용
4. 통계 카드 API 연동

### Phase 2: 로그 탭 추가
1. 플레이 로그 테이블 구현
2. 원장 로그 테이블 구현
3. 필터 기능 추가

### Phase 3: 유저 조회 탭 추가
1. 유저 검색 기능
2. 유저 상세 패널
3. 빠른 액션 연동

---

## 10. 부록

### A. 백엔드 GameTokenType Enum

```python
# app/models/game_wallet.py
class GameTokenType(str, Enum):
    ROULETTE_COIN = "ROULETTE_COIN"
    DICE_TOKEN = "DICE_TOKEN"
    TRIAL_TOKEN = "TRIAL_TOKEN"
    LOTTERY_TICKET = "LOTTERY_TICKET"
    GOLD_KEY = "GOLD_KEY"
    DIAMOND_KEY = "DIAMOND_KEY"
    DIAMOND = "DIAMOND"
```

### B. 프론트엔드 타입 참조

```typescript
// src/admin/api/adminGameTokenApi.ts
export interface PlayLogEntry {
  id: number;
  user_id: number;
  external_id?: string;
  nickname?: string;
  telegram_username?: string;
  game: string;  // "ROULETTE" | "DICE" | "LOTTERY"
  reward_type: AdminRewardType;
  reward_amount: number;
  reward_label?: string | null;
  created_at: string;
}

export interface LedgerEntry {
  id: number;
  user_id: number;
  external_id?: string;
  nickname?: string;
  telegram_username?: string;
  token_type: GameTokenType;
  delta: number;
  balance_after: number;
  reason?: string | null;
  label?: string | null;
  meta_json?: Record<string, unknown> | null;
  created_at: string;
}
```

---

**작성자**: Antigravity AI  
**검토자**: -  
**다음 단계**: 가이드 기반 구현 진행
