# 상점 관리 페이지 재설계 가이드

**작성일**: 2026-01-13  
**상태**: 📋 **PLAN 단계** (구현 승인 대기)

---

## 1. 현황 분석

### 1.1. 기존 코드 문제점 (AdminShopPage.tsx)

```typescript
// ❌ 문제 1: 하드코딩된 상품 그룹핑
{effectiveProducts.filter(p => !p.sku.startsWith("PROD_TICKET_"))}
{effectiveProducts.filter(p => p.sku.startsWith("PROD_TICKET_"))}

// ❌ 문제 2: 영어 라벨 잔존
<th className="admin-th">가격(DIAMOND)</th>
<span>{r.is_active ? "ON" : "OFF"}</span>

// ❌ 문제 3: 로컬 Map 기반 상태 관리 (서버 상태와 동기화 미흡)
const [rows, setRows] = useState<Map<string, RowState>>(new Map());
```

### 1.2. 준수 문서 (SoT)

| 문서 | 핵심 내용 | 적용 항목 |
| --- | --- | --- |
| `admin_ui_standards.md` | 4단 그리드, Semantic Colors, adminApi 필수 사용 | 레이아웃, 색상, API 클라이언트 |
| `admin_ui_improvement_checklist.md` | OI-013 하드코딩 제거, OI-015 Patch 저장 | 동적 그룹핑, Race Condition 방지 |
| `phase2_economy_game_audit_report.md` | Game Token 7종, Ledger 패턴, Economy Stats | 상품 타입, 통계 연동 |
| `phase6_global_sync_integrity_audit_report.md` | React Query 무효화, 실시간 반영 | 전역 동기화 전략 |

---

## 2. 목표 및 범위

### 2.1. 핵심 목표

1. **하드코딩 완전 제거**: `PROD_TICKET_` 접두사 의존 → `item_type` 기반 동적 분류
2. **한글 패치 완료**: 모든 UI 요소 한글화 (DIAMOND → 다이아, ON/OFF → 활성/비활성)
3. **전역 동기화 강화**: React Query 기반 실시간 상태 반영
4. **미니멀 UX**: 불필요 요소 제거, 핵심 기능 집중

### 2.2. 변경 범위

| 구분 | 파일 | 변경 내용 |
| --- | --- | --- |
| **신규** | `src/admin/pages/AdminShopPage.tsx` | 완전 재작성 |
| **참조** | `src/admin/api/adminShopApi.ts` | 기존 API 활용 (수정 없음) |
| **참조** | `src/admin/api/adminEconomyApi.ts` | 통계 API 활용 (수정 없음) |

### 2.3. 범위 외 (Out of Scope)

- 백엔드 API 수정
- 상품 추가/삭제 기능 (기존 미구현)
- 이미지 업로드 기능

---

## 3. 기술 설계

### 3.1. 컴포넌트 구조

```
AdminShopPage (메인)
├── 헤더 영역
│   ├── 제목 + 설명
│   └── 액션 버튼 (새로고침, 저장)
├── KPI 카드 영역 (4열 그리드)
│   ├── 총 상품 수
│   ├── 활성 상품 수
│   ├── 오늘 판매량
│   └── 평균 가격
├── 메인 컨텐츠 (2열 그리드: 1:3 비율)
│   ├── 좌측: 통계 위젯
│   │   ├── 최근 구매 추이
│   │   └── 바우처 사용 현황
│   └── 우측: 상품 관리 테이블
│       ├── 검색/필터 바
│       └── 상품 목록 테이블
└── 하단 액션 바
    └── 내보내기 버튼
```

### 3.2. 상태 관리 전략

```typescript
// React Query 기반 서버 상태
const productsQuery = useQuery({
  queryKey: ["admin", "shop", "products"],
  queryFn: fetchAdminShopProducts,
  staleTime: 5 * 60 * 1000, // 5분
});

const statsQuery = useQuery({
  queryKey: ["admin", "economy", "stats"],
  queryFn: fetchEconomyStats,
  staleTime: 30 * 1000, // 30초
});

// 로컬 편집 상태 (변경 감지용)
const [editedRows, setEditedRows] = useState<Map<string, RowState>>(new Map());
const [changedSkus, setChangedSkus] = useState<Set<string>>(new Set());
```

### 3.3. 동적 그룹핑 로직

```typescript
// ✅ 개선: item_type 기반 동적 그룹핑
const groupedProducts = useMemo(() => {
  const groups: Record<string, AdminShopProduct[]> = {};
  
  for (const product of products) {
    const groupKey = product.grant.item_type;
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(product);
  }
  
  return groups;
}, [products]);

// 그룹 라벨 매핑 (한글)
const GROUP_LABELS: Record<string, string> = {
  DIAMOND_KEY: "다이아몬드 키",
  GOLD_KEY: "골드 키",
  ROULETTE_COIN: "룰렛 코인",
  DICE_TOKEN: "주사위 토큰",
  LOTTERY_TICKET: "복권 티켓",
  TRIAL_TOKEN: "체험 토큰",
  DIAMOND: "다이아몬드",
};
```

### 3.4. 한글 패치 상수

```typescript
// 테이블 헤더
const TABLE_HEADERS = {
  sku: "상품코드",
  title: "상품명",
  price: "가격 (다이아)",
  grant: "지급 내용",
  status: "상태",
};

// 상태 라벨
const STATUS_LABELS = {
  active: "활성",
  inactive: "비활성",
};

// 버튼 라벨
const BUTTON_LABELS = {
  refresh: "새로고침",
  save: "저장",
  saveCount: (n: number) => `저장 (${n}건)`,
  export: "내보내기",
};
```

---

## 4. UI/UX 스펙

### 4.1. 레이아웃 (admin_ui_standards.md 준수)

```
┌─────────────────────────────────────────────────────────────────┐
│ [헤더] 상점 상품 관리                          [새로고침] [저장] │
├─────────────────────────────────────────────────────────────────┤
│ [KPI] 총 상품  │  활성 상품  │  오늘 판매  │  평균 가격         │
├──────────┬──────────────────────────────────────────────────────┤
│ [통계]   │ [검색바: 상품명/코드 검색...]  [전체] [활성] [비활성] │
│ 최근구매 │ ┌─────────────────────────────────────────────────┐ │
│ 바우처   │ │ 상품코드 │ 상품명 │ 가격 │ 지급 │ 상태          │ │
│          │ │ ──────── │ ────── │ ──── │ ──── │ ──────        │ │
│          │ │ ...      │ ...    │ ...  │ ...  │ ...           │ │
│          │ └─────────────────────────────────────────────────┘ │
├──────────┴──────────────────────────────────────────────────────┤
│ [하단]                                              [내보내기]  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2. 디자인 토큰 (Semantic Colors)

| 용도 | Tailwind Class | 적용 위치 |
| --- | --- | --- |
| 배경 | `bg-admin-bg` | 페이지 컨테이너 |
| 카드 배경 | `bg-admin-sidebar` | KPI 카드, 통계 위젯 |
| 테두리 | `border-admin-border` | 테이블, 입력창 |
| 브랜드 강조 | `text-admin-brand` | 변경된 행 표시 |
| 활성 상태 | `text-admin-success` | 활성 상품 |
| 비활성 상태 | `text-admin-text-muted` | 비활성 상품 |

### 4.3. 접근성 준수

```typescript
// 모든 입력 요소에 aria-label과 title 필수
<input
  type="text"
  aria-label="상품명 검색"
  title="상품명 또는 상품코드로 검색"
  placeholder="상품명/코드 검색..."
/>

// 버튼에 aria-label 필수
<button
  type="button"
  aria-label="변경사항 저장"
  title="변경사항 저장"
>
  <Save size={16} /> 저장
</button>
```

---

## 5. API 연동

### 5.1. 사용 API (기존 adminShopApi.ts)

| API | 용도 | 호출 시점 |
| --- | --- | --- |
| `fetchAdminShopProducts()` | 상품 목록 로딩 | 페이지 마운트 |
| `fetchAdminShopOverrides()` | 오버라이드 설정 로딩 | 페이지 마운트 |
| `upsertAdminShopOverrides()` | 설정 저장 | 저장 버튼 클릭 |
| `fetchEconomyStats()` | 통계 데이터 | 페이지 마운트 |

### 5.2. 캐시 무효화 전략 (phase6 준수)

```typescript
const saveMutation = useMutation({
  mutationFn: upsertAdminShopOverrides,
  onSuccess: () => {
    // 관련 쿼리 전체 무효화
    queryClient.invalidateQueries({ queryKey: ["admin", "shop"] });
    addToast("상점 설정이 저장되었습니다.", "success");
  },
  onError: (err) => {
    addToast(`저장 실패: ${err.message}`, "error");
  },
});
```

### 5.3. API 클라이언트 규칙 (CRITICAL)

```typescript
// ✅ 올바른 사용: adminApi 사용
import { adminApi } from "../api/httpClient";

// ❌ 금지: 일반 apiClient 사용 (401 에러 발생)
// import { apiClient } from "../../api/apiClient"; // NEVER
```

---

## 6. 구현 체크리스트

### Phase 1: 기본 구조 (예상 1시간)

- [ ] 기존 AdminShopPage.tsx 백업
- [ ] 신규 컴포넌트 스켈레톤 생성
- [ ] React Query 훅 설정
- [ ] 기본 레이아웃 구현

### Phase 2: 핵심 기능 (예상 2시간)

- [ ] KPI 카드 영역 구현
- [ ] 상품 테이블 구현 (동적 그룹핑)
- [ ] 검색/필터 기능 구현
- [ ] 인라인 편집 기능 구현

### Phase 3: 통계 및 UX (예상 1시간)

- [ ] 통계 위젯 구현
- [ ] 변경 감지 및 표시 (좌측 브랜드 바)
- [ ] 저장 로직 구현

### Phase 4: 검증 (예상 30분)

- [ ] TypeScript 컴파일 확인
- [ ] 빌드 성공 확인
- [ ] 기능 테스트 (로딩/편집/저장)

---

## 7. 품질 기준

### 7.1. TypeScript 엄격 준수

- 모든 컴포넌트 Props 타입 명시
- any 타입 사용 금지
- 옵셔널 체이닝 적극 사용

### 7.2. 코드 품질

- ESLint 경고 0건
- 미사용 import 제거
- console.log 제거 (에러 로깅만 허용)

### 7.3. 성능 기준

- 페이지 로드 < 3초
- 저장 응답 < 1초
- 검색 필터링 < 100ms

---

## 8. 롤백 계획

| 조건 | 액션 |
| --- | --- |
| 빌드 실패 | 기존 코드로 복원 |
| API 호환성 문제 | 백엔드 확인 후 재구현 |
| 성능 저하 | 최적화 또는 단계적 적용 |

---

## 9. 승인 요청

**다음 단계 진행을 위해 승인이 필요합니다:**

1. Phase 1부터 순차적으로 구현 진행
2. 각 Phase 완료 후 빌드 검증
3. 최종 통합 테스트 후 배포

> **승인 시 "진행" 또는 "수정 필요한 부분" 알려주세요.**

---

*작성: GitHub Copilot | 최종 수정: 2026-01-13*
