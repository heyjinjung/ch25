# UI Polish & Build Fixes - 2026-01-17

## 1. 개요
*   **날짜**: 2026년 1월 17일
*   **작업자**: Senior Full-Stack Dev
*   **목표**: 주요 모달 UI/UX 개선 (다크 테마, 가독성, 강조점 변경) 및 프로덕션 빌드 오류 수정.

## 2. 변경 사항 상세

### A. Golden Hour Popup (`src/components/events/GoldenHourPopup.tsx`)
*   **Dark Theme 적용**: 기존의 밝은/글로우 위주 스타일에서 `bg-emerald-950` 기반의 고급스러운 다크 테마로 변경.
*   **가독성 개선**: 텍스트 글로우 효과 제거, 대비(Contrast) 강화.
*   **버튼 스타일**: 어두운 배경에 맞는 스타일로 조정.

### B. Starter Missions Modal (`src/components/modal/StarterMissionsModal.tsx`)
*   **강조점 변경**: "전부 받기" 버튼의 시각적 비중 축소 (Solid -> Outline).
*   **개별 카드 강조**: 각 미션 카드에 그라디언트 보더(`from-amber-500/20`)와 배경색을 추가하여 사용자 시선을 개별 미션으로 유도.

### C. Season Pass Promo Modal (`src/components/modal/SeasonPassPromoModal.tsx`)
*   **Compact Layout**: 모바일 화면 최적화를 위해 최대 너비를 `max-w-[320px]`로 제한.
*   **패딩 축소**: 내부 여백을 줄여 전체적인 모달 높이 감소.
*   **아이콘 조정**: 왕관 아이콘 크기를 축소하여 비율 조정.

### D. Limited Offer Modal (`src/components/modal/LimitedOfferModal.tsx`)
*   **Redesign**: 기존 스타일을 다크 프리미엄 테마로 전면 개편.
*   **Coming Soon**: 아직 준비 중인 기능임을 명확히 하기 위해 구매/상세 버튼 비활성화 및 스타일 적용.

### E. Build Fixes (`src/pages/EventModalsPage.tsx`)
*   **Duplicate Identifier Fix**: `framer-motion`의 `motion` 컴포넌트가 중복 import 되어 발생하던 빌드 오류(`TS2300`) 수정.
*   **Verification**: `npm run build` 성공 확인.

## 3. 검증 결과
*   **Frontend Build**: `npm run build` -> **SUCCESS** (All chunks generated).
*   **UI Check**:
    *   Golden Hour: 다크 테마 적용 확인.
    *   Starter Mission: 개별 카드 강조 확인.
    *   Season Pass: 소형화 확인.
    *   Limited Offer: Coming Soon 스타일 확인.

## 4. 향후 계획
*   배포 후 실제 모바일 디바이스(Telegram WebView)에서의 렌더링 확인 필요.
