# Golden V2: 프론트엔드 통합 기술 스펙 가이드 (Frontend Spec)

**작성일**: 2026-01-28
**버전**: v1.2
**상태**: SoT (Refined Blueprint)
**대상**: FE 개발팀 / UX 디자인팀

---

## 1. 개요 (Overview)
골든 V2의 프론트엔드는 단순한 데이터 표시를 넘어, 유저에게는 **'정서적 케어와 신뢰'**를 주고 운영자에게는 **'직관적인 통제권'**을 제공하는 것을 목적으로 합니다. 본 문서는 Phase 1~4를 관통하는 통합 프론트엔드 구현 가이드를 정의합니다.

---

## 2. 핵심 아키텍처 원칙 (Core Architectural Doctrine)

현대적인 리액트 개발 표준과 고성능 미니앱 환경을 위해 다음 원칙을 엄격히 준수합니다.

### 2.1 Feature-Based Structure
모든 골든 관련 인터페이스는 기능 단위로 응집됩니다.
- **경로**: `src/features/golden/`
- **구조**:
    - `api/`: 골든 전용 API 레이어 (Axios/TanStack Query)
    - `components/`: 기능 내에서만 재사용되는 UI 컴포넌트
    - `hooks/`: 골든 상태 및 로직 추상화 (e.g., `useGoldenIntervention`)
    - `types/`: API 응답 및 컴포넌트 Props 정의
    - `index.ts`: 공용 인터페이스 노출 (Public Entry)

### 2.2 Suspense-First Data Fetching
`isLoading` 조건부 렌더링을 지양하고 선언적 로딩 처리를 지향합니다.
- `useSuspenseQuery`를 기본 훅으로 사용.
- 상위 `SuspenseBoundary`에서 데이터 베칭 중의 스켈레톤(Skeleton) 처리.
- 초기 로딩 시 레이아웃 무너짐(CLS) 방지를 위한 고정 높이 컨테이너 활용.

### 2.3 Lazy Loading & Performance
- **Heavy Components**: 데이터 그리드, 차트, 복잡한 모달은 `React.lazy`로 분리.
- **Bundle Optimization**: 미니앱의 빠른 진입을 위해 초기 번들 크기를 최소화.

---

## 3. 유저 사이드: TMA (Telegram Mini App) 개선

### 3.1 Telegram WebApp SDK 활용
TMA 유저 경험을 위해 SDK 기능을 적극 활용합니다.
- **Haptic Feedback**: 증거 제출 성공, 보상 획득 시 진동 알림.
- **Main Button / Back Button**: 브라우저 UI 대신 텔레그램 기본 버튼 연동.
- **Cloud Storage**: 유저의 로컬 설정을 텔레그램 클라우드에 연동하여 기기 간 동기화.

### 3.2 Latency Survival UX (지연 극복)
*외부 데이터 지연을 심리학적 기회로 전환*
- **Evidence Submission Interface**:
    - **Trigger**: 입금 감지 후 1분 내 데이터 미도착 시 하단 시트(Bottom Sheet) 노출.
    - **UX**: 유저가 TX ID를 입력하는 동안 "증거를 확보 중입니다..." 애니메이션 재생.
    - **Reward**: 제출 즉시 '만능 티켓' 선지급 팝업 노출.
- **Pending UX**:
    - "보상이 숙성되는 중입니다" (Aging UI). 숙성 완료 시 텔레그램 봇 푸시 알림 발송 예약.

### 3.3 Flexible Care UI (유연한 케어)
- **Streak Recovery Canvas**: 연속 출석이 끊겼을 때, 깨진 유리 조각 애니메이션과 함께 복구 제안 (Emotional UX).
- **Floating Micro-mission**: 게임 화면 방해 없이 사이드에 위치한 작은 버블 인터페이스.

---

## 4. 관리자 사이드: OPS Center (Admin) 고도화

### 4.1 Semi-Auto CRM Approval App
- **ApprovalQueue Table**: 
    - 실시간 WebSocket 이벤트를 받아 즉시 리스트 갱신.
    - **Batch Approve**: 여러 선택 항목을 한 번에 승인하는 벌크 액션 지원.
- **User Context Insight**: 
    - 유저 ID 호버(Hover) 시, 해당 유저의 최근 7일간 리텐션 곡선 미니 차트 노출.

### 4.2 Evidence Dashboard (ROI Center)
- **Bento Grid Layout**: 
    - **CC 가시화**: 골든 개입 그룹의 CC 입금 전환율(CVR) 실시간 표시.
    - **Crisis Radar**: DDA 조절이 필요한 고액 손실 유저를 빨간색 노드로 표시.

---

## 4. 기술 스택 및 데이터 통신 규약

### 4.1 WebSocket (Real-time Stream)
- **Endpoint**: `/api/v2/admin/ws/golden/events`
- **Source Channel**: `golden:v2:events:game`
- **Update Frequency**: 이벤트 발생 시 즉시(Pub/Sub Stream) 기반.

### 4.2 API Contract Expansion
- **POST `/api/v2/admin/crm/approve`**: 복수 ID 승인 처리.
- **POST `/api/v2/user/evidence`**: 유저 TX ID 제출.
- **GET `/api/v2/user/honor-report`**: 유저 심리 자산 리포트 조회.
## 5. 구현 코드 템플릿 (Sample)

### 5.1 골든 컴포넌트 표준 구조
```tsx
import React, { useCallback } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { goldenApi } from '../api/goldenApi';
import type { InterventionData } from '../types';

export const GoldenInterventionCard: React.FC<{ userId: number }> = ({ userId }) => {
  const { data } = useSuspenseQuery<InterventionData>({
    queryKey: ['golden', 'intervention', userId],
    queryFn: () => goldenApi.getIntervention(userId),
  });

  const handleResolve = useCallback(() => {
    // 해결 로직
  }, []);

  return (
    <div className="golden-card">
      {/* UI Implementation using MUI v7 standard */}
    </div>
  );
};

export default GoldenInterventionCard;
```

---

## 6. 구현 우선순위 (Revised)

1.  **[Infrastructure]**: `src/features/golden/` 기초 폴더 구조 및 API 레이어 셋업.
2.  **[Admin/Phase 2]**: `ApprovalQueue` 및 `status` 필드 연동 (가장 시급한 운영 통제권).
3.  **[User/Phase 4]**: TMA 증거 제출 UI 및 선지급 UX (유저 신뢰 회복).
4.  **[Advanced]**: ROI 대시보드 및 고도화된 애니메이션 효과.

---

## 7. 변경 이력
- v1.2 (2026-01-28): Admin WebSocket 규약을 현행 구현(/api/v2/admin/ws/golden/events) 기준으로 정합화.
- v1.1 (2026-01-28): Feature-based 아키텍처, Suspense 모델, TMA SDK 연동 및 코드 템플릿 추가.
- v1.0 (2026-01-28): 최초 작성.
