# Admin UI/UX 표준화 규칙 (Standardization Rules)

## 1. 개요 (Overview)

본 문서는 **CC Admin System**의 일관된 사용자 경험(UX)과 유지보수 효율성을 위해 정의된 디자인 표준 가이드라인입니다.
모든 어드민 페이지 개발 및 리팩토링 시 본 규칙을 준수해야 합니다.

---

## 2. 레이아웃 규칙 (Layout Rules)

### 2.1. 그리드 시스템 (Grid System)

- **대시보드**: 4단 그리드 시스템을 기본으로 합니다.
  - **Header**: 높이 `60px`, `border-b` 고정.
  - **Sidebar**: 너비 `288px (w-72)`, `border-r` 고정.
  - **Main Content**: `flex-1`, `p-6 (24px)` 패딩 기본 적용.
  - **Widget Grid**: `grid-cols-12` 기반.
    - **KPI Cards**: `col-span-3` (4개 배치)
    - **Charts**: `col-span-8` (Main), `col-span-4` (Sub)

### 2.2. 간격 및 정렬 (Spacing & Alignment)

- **Page Container**: `p-6` (24px)
- **Card Spacing**: `gap-4` (16px) 또는 `gap-6` (24px)
- **Section Spacing**: `mb-8` (32px)
- **Table**:
  - **Row Height**: `h-12` (48px)
  - **Cell Padding**: `px-4 py-3`
  - **Header Padding**: `px-4 py-2`

### 2.3. 모달 (Modal)

- **Backdrop**: `bg-black/50 backdrop-blur-sm`
- **Dialog**: `rounded-lg`, `border border-[#3e3e42]`, `bg-[#252526]`, `shadow-2xl`
- **Size**:
  - **Default**: `max-w-md` (448px)
  - **Large**: `max-w-2xl` (672px)
  - **Full**: `max-w-5xl` (1024px)

---

## 3. 디자인 토큰 (Design Tokens)

### 3.1. 색상 팔레트 (Semantic Palette)

하드코딩된 Hex 값 대신 Tailwind Semantic Class를 사용합니다.

| 용도 | Tailwind Class | Base Color (VS Code Dark) | 비고 |
| --- | --- | --- | --- |
| **배경 (Editor)** | `bg-admin-bg` | `#1e1e1e` | 메인 콘텐츠 영역 |
| **배경 (Sidebar)** | `bg-admin-sidebar` | `#252526` | 사이드바, 카드 배경 |
| **보두 (Border)** | `border-admin` | `#3e3e42` | 구분선 |
| **브랜드 (Point)** | `text-admin-brand` | `#007acc` | 강조, 링크, 활성 상태 |
| **텍스트 (Default)** | `text-admin-base` | `#cccccc` | 기본 본문 |
| **텍스트 (Muted)** | `text-admin-muted` | `#858585` | 설명, 비활성 |

### 3.2. 상태 색상 (Status Colors)

- **Success**: `text-admin-success` (`#91F402` Neon Green)
- **Warning**: `text-admin-warning` (`#F97935` Orange)
- **Error**: `text-admin-danger` (`#FF4D4D` Red)
- **Info**: `text-admin-info` (`#30FF75` Light Green)

### 3.3. 타이포그래피 (Typography)

- **Font Family**: `"Noto Sans KR", "Inter", sans-serif`
- **Scale**:
  - **H1 (Page Title)**: `text-3xl font-bold`
  - **H2 (Section)**: `text-2xl font-semibold`
  - **H3 (Card Title)**: `text-xl font-medium`
  - **Body**: `text-lg` (18px) - *가독성을 위해 Admin 전역 18px 기본*
  - **Small**: `text-base` (16px) - 테이블 내부, 부가 정보

---

## 4. 컴포넌트 표준 (Component Standards)

### 4.1. 버튼 (Button)

`src/components/common/Button.tsx`의 `variant`를 준수합니다.

- **Primary**: `variant="figma-primary"` (주요 액션)
- **Secondary**: `variant="figma-secondary"` (보조 액션)
- **Ghost**: `variant="ghost"` (테이블 내 액션, 아이콘 버튼)
- **Outline**: `variant="figma-outline"` (구분 필요한 보조 액션)

### 4.2. 상태 UI (State UI)

- **Loading**: 스켈레톤(Skeleton) 또는 `spin-slow` 로더 사용. 전체 블로킹 지양.
- **Empty**: 데이터 없음 아이콘(`Box`, `Inbox` 등)과 함께 "데이터가 없습니다" 문구 및 CTA 버튼(생성하기 등) 노출.
- **Error**: 붉은색 테두리 또는 경고 아이콘과 함께 재시도(Retry) 버튼 제공.

---

## 5. 개발 표준 (Development Standards)

### 5.1. API 클라이언트 사용 규칙 (CRITICAL)

관리자(Admin) 페이지에서 API 요청 시 반드시 **`adminApi`**를 사용해야 합니다.

- **`src/admin/api/httpClient.ts`의 `adminApi` import 사용.** (O)
- **`src/api/apiClient.ts`의 `apiClient` 사용 금지.** (X)

> **이유**: `apiClient`는 일반 유저 토큰(`xmas_access_token`)만 처리하며, 관리자 토큰(`admin_token`)을 헤더에 포함하지 않습니다. 이로 인해 `401 Unauthorized` 오류가 발생합니다.

### 5.2. 에러 핸들링

- API 호출 실패 시 `console.error` 로그를 남기고, 사용자에게 `Toast` 또는 `Alert`로 명확한 피드백을 제공합니다.
- `401` 발생 시 `adminApi` 인터셉터가 자동으로 로그인 페이지로 리다이렉트하므로 별도 처리는 불필요합니다.

---

## 6. 접근성 (Accessibility)

### 5.1. 키보드 포커스 (Focus Management)

- 모든 인터랙티브 요소(`button`, `input`, `a`)는 `focus-visible` 시 명확한 링을 가져야 합니다.
- **Standard**: `focus:outline-none focus:ring-2 focus:ring-[#007acc] focus:ring-offset-2 focus:ring-offset-[#1e1e1e]`

### 5.2. 대비 (Contrast)

- 텍스트와 배경 간 명도 대비 **4.5:1** 이상 유지 권장.
- `#858585` (Muted) 텍스트는 `#1e1e1e` 배경 위에서 사용 시 주의 (중요 정보에는 사용 금지).

---

## 7. 적용 계획 (Implementation Plan)

1. **Phase 1**: `tailwind.config.js`에 Admin 전용 Semantic Colors 추가.
2. **Phase 2**: `AdminLayout.tsx`의 하드코딩 Hex 값을 Class로 치환.
3. **Phase 3**: 주요 페이지(`Dashboard`, `UserList`)부터 레이아웃/토큰 점진적 적용.
