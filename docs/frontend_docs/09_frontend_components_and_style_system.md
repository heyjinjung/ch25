# 공통 컴포넌트 & 스타일 시스템

- 문서 타입: 프론트엔드 컴포넌트/스타일 가이드
- 버전: v1.0
- 작성일: 2025-12-10
- 작성자: 시니어 백엔드/FE 협업 가이드
- 대상 독자: 프론트엔드 개발자, 디자이너

## 1. 목적 (Purpose)
- Tailwind 기반 공통 컴포넌트와 스타일 패턴을 정의해 재사용성과 일관성을 높인다.

## 2. 범위 (Scope)
- Scope: 버튼/모달/카드/폼 필드 등의 공통 컴포넌트 설계, Tailwind 프리셋, shadcn/ui 또는 MUI 사용 기준.
- Out of Scope: 브랜드 컬러 자산, 아이콘 세트.

## 3. 용어 정의 (Definitions)
- Primitive: 라이브러리 기본 컴포넌트(shadcn/ui, MUI)에서 래핑하지 않은 요소.
- Token: 색상/폰트/간격 등 공통 스타일 변수.

## 4. 본문 (스타일/컴포넌트)
- Tailwind 프리셋: primary/secondary 색상, spacing scale, font scale을 `tailwind.config.ts`에서 정의.
- 공통 컴포넌트:
  - Button, IconButton, Modal, Drawer, Card, Input, Select, Tabs, Toast.
  - 상태: default/hover/active/disabled, size(sm/md/lg), variant(primary/secondary/ghost).
- 라이브러리 사용 기준:
  - User App: Tailwind 커스텀 우선, 필요한 경우 shadcn/ui Primitive.
  - Admin: shadcn/ui 또는 MUI v6 우선 적용, 테이블/폼/모달 재사용.
- 아이콘: Heroicons 또는 Lucide 사용 권장, 일관된 사이즈(예: 20/24px).

## 5. 예시
- Primary Button 예시: `Button variant="primary" size="md" iconLeft={<PlayIcon />} disabled={isLoading}`
- Tailwind 토큰 예: `text-slate-900`, `bg-emerald-600`, `shadow-md`, `rounded-lg`.

## 6. Validation / Checklist
- [ ] Tailwind 토큰/프리셋 정의가 문서에 존재하는가?
- [ ] 공통 컴포넌트 목록과 상태/variant 규칙이 명시되었는가?
- [ ] User vs Admin에서 라이브러리 사용 기준이 구분되었는가?
- [ ] 아이콘 라이브러리/사이즈 규칙이 정의되었는가?

## 7. 변경 이력 (Changelog)
- v1.0 (2025-12-10): 최초 작성. Tailwind 토큰, 공통 컴포넌트, 라이브러리 선택 기준 정의.
