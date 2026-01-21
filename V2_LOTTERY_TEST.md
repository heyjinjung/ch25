# V2 복권 게임 페이지 테스트 가이드

## 🎯 구현 완료 사항

### ✅ 핵심 기능
- [x] V2 API 기반 복권 상태 조회 및 플레이
- [x] 긁기 전/중/후 상태 관리
- [x] 골드 포일 오버레이 → 결과 공개 애니메이션
- [x] 퍼즐 조각 수집 및 황금열쇠 교환 시스템

### ✅ 라우팅/표준화
- [x] `/api/v2/lottery/*` 경로로 고정
- [x] 티켓 타입 `LOTTERY_TICKET` 표준 적용
- [x] UI 텍스트를 "복권 티켓"으로 통일

### ✅ 레이아웃/헤더 표준화
- [x] V2 공통 헤더/레이아웃 통합
- [x] Telegram WebView 스크롤 최소화 (flex-col + 100dvh)

### 🎨 테마 시스템
- [x] **ThemeContext**: 동적 테마 전환 시스템 (DicePage와 동일)
- [x] **기본 테마**: 녹색 (#30FF75) 기반
- [x] **설날 테마**: 빨강/금색, 연등 파티클 (플레이스홀더)
- [x] **프리미엄 테마**: 금색, 스파클 파티클 (플레이스홀더)
- [x] 테마별 색상/아이콘/배경/사운드 분리

### ✨ 애니메이션 효과
- [x] GSAP 기반 카드 글로우 효과 (unrevealed 상태)
- [x] Framer Motion 긁기 애니메이션 (fade out + scale)
- [x] 보상 공개 애니메이션 (zoom in + fade in)
- [x] 퍼즐 조각 3D 회전 효과 (rotateY)
- [x] 승리 시 Confetti 파티클
- [x] 컬렉션 모달 spring 애니메이션

### 🎮 사용자 경험
- [x] 텔레그램 햅틱 피드백 (긁기/승리/실패)
- [x] 골드 포일 이미지 오버레이
- [x] 로또볼 아이콘 바운스 애니메이션
- [x] 테마별 파티클 효과
- [x] 반응형 모바일 최적화
- [x] 로딩/에러 상태 핸들링

### 🧩 컬렉션 시스템
- [x] V1 디자인 계승 (LotteryCollectionModal)
- [x] 퍼즐 조각 4개 (C, C, J, M)
- [x] 획득/미획득 상태 시각화
- [x] 황금열쇠 교환 기능
- [x] 교환 성공 시 Confetti 효과

---

## 🚀 테스트 방법

### 1. 개발 서버 실행

```bash
cd c:/Users/JAVIS/ch/ch25
npm run dev
```

### 2. 브라우저에서 접속

```
http://localhost:5173/v2/game/lottery
```

### 3. 테스트 시나리오

#### A. 기본 게임 플레이
1. **로또볼 잔액** 확인 (우측 상단 표시)
2. **지금 긁기 버튼** 클릭
3. 카드 긁기 애니메이션 확인 (2초)
4. 골드 포일 페이드 아웃 효과 확인
5. 보상 결과 공개 확인

#### B. 승리 케이스
1. 보상이 있는 경우 (POINT, TICKET, etc.)
2. **축하합니다!** 배지 표시
3. 보상 금액/타입 표시
4. Confetti 파티클 효과
5. 성공 햅틱 피드백 (강한 진동)

#### C. 꽝 케이스
1. 보상이 없는 경우 (NONE, 0원)
2. 💨 이모지 표시
3. **다음 기회에!** 메시지
4. 가벼운 햅틱 피드백

#### D. 퍼즐 조각 케이스
1. PUZZLE_C, PUZZLE_J, PUZZLE_M 등 획득
2. 3D 회전 효과로 조각 표시
3. 금색 그라데이션 배경
4. 컬렉션에 자동 추가

#### E. 컬렉션 모달
1. **컬렉션 버튼** 클릭 (우측 상단)
2. 퍼즐 조각 현황 확인
3. 획득한 조각: 컬러 + 체크마크
4. 미획득 조각: 흑백 + 잠김 상태
5. 4개 모두 획득 시 **황금열쇠 교환하기** 버튼 활성화
6. 교환 시 Confetti 효과 + 성공 메시지

#### F. 경품 리스트
1. 하단 경품 그리드 확인
2. 각 경품 카드 hover 효과
3. 재고 표시 (우측 상단 점)
4. 골드 포일 배경 패턴

#### G. 연속 플레이
1. **다음 복권 확인** 버튼으로 리셋
2. 카드 상태 초기화 확인
3. 잔액 차감 확인
4. 연속 긁기 테스트

#### H. 티켓 소진
1. 로또볼이 0이 되면 플레이 불가
2. 경고 메시지 표시
3. Vault 충전 안내

#### I. 테마 전환 (개발자 도구)
테마는 현재 코드에서 수동으로 변경 가능:
```typescript
// LotteryPage.tsx에서 테마 변경
<ThemeProvider initialTheme="lunar-new-year"> // 또는 "premium"
```

---

## 📁 생성된 파일 목록

### 컴포넌트
- `src/v2/components/game/LotteryCard.tsx` - 복권 카드 (긁기 전/중/후 상태)
- `src/v2/components/lottery/LotteryCollectionModal.tsx` - 퍼즐 컬렉션 모달

### 페이지
- `src/v2/pages/game/LotteryPage.tsx` - 메인 복권 게임 페이지

### API
- `src/v2/api/gameApi.ts` - V2 Lottery API 함수 추가
  - `getV2LotteryStatus()` - 복권 상태 조회
  - `playV2Lottery()` - 복권 긁기

### 라우터
- `src/v2/router/V2UserRoutes.tsx` - `/v2/game/lottery` 라우트 추가

---

## 🎨 V1 디자인 계승 요소

### LotteryCard
- **금박 이미지**: `/assets/lottery/gold_foil.jpg` (플레이스홀더)
- **로또볼 아이콘**: `/assets/lottery/icon_lotto_ball.png` (플레이스홀더)
- **프리미엄 프레임**: 외부 테두리 + 배경 글로우
- **3단계 상태**:
  - Unrevealed: 금박 + "탭하여 확인"
  - Scratching: "열리는 중..." + 회전 애니메이션
  - Revealed: 보상 표시 + 축하 메시지

### LotteryCollectionModal
- **퍼즐 조각 레이아웃**: 4개 가로 배치 (C, C, J, M)
- **획득 상태 시각화**:
  - 획득: 컬러 + 스케일 업 + 체크마크
  - 미획득: 흑백 + 흐림 효과
- **교환 버튼**: 4개 모두 획득 시 활성화
- **황금열쇠 테마**: 앰버/골드 색상 강조

---

## 🔧 V2 개선 사항

### 1. 테마 시스템 통합
V1에서 하드코딩된 색상을 테마 시스템으로 전환:
```typescript
// Before (V1)
backgroundColor: '#FFD700'

// After (V2)
style={{ backgroundColor: theme.colors.accent }}
```

### 2. 애니메이션 라이브러리 통일
- GSAP: 카드 글로우 효과
- Framer Motion: 상태 전환, 모달, 퍼즐 조각

### 3. 햅틱 피드백 체계화
```typescript
// 긁기 시작
triggerHaptic('heavy');

// 승리
triggerNotification('success');

// 실패
triggerHaptic('light');
```

### 4. API 타입 안정성
- TypeScript 인터페이스로 응답 타입 정의
- `LotteryStatusResponse`, `LotteryPlayResponse`
- 퍼즐 진행 상황 타입 안전성 보장

---

## 📱 모바일/텔레그램 햅틱 패턴

### 긁기 시작
- 강한 진동 (heavy)

### 승리
- 성공 알림 진동 (success notification)
- 패턴: [30, 50, 30]

### 실패
- 가벼운 진동 (light)
- 패턴: [10]

### 모달 열기
- 가벼운 진동 (light)

### 퍼즐 교환 성공
- 성공 알림 진동 (success notification)

---

## 🎯 애니메이션 타이밍

### 긁기 애니메이션
- Duration: 2000ms
- Type: fade out + scale up

### 결과 공개
- Delay: 0ms (긁기 완료 직후)
- Initial: scale(0.8) + opacity(0)
- Animate: scale(1) + opacity(1)
- Duration: 500ms + backOut easing

### 퍼즐 조각 3D 회전
- Initial: rotateY(-180deg) + scale(0)
- Animate: rotateY(0) + scale(1)
- Delay: 500ms
- Duration: 800ms + spring

### 카드 글로우 (GSAP)
- Infinite loop with yoyo
- Duration: 2s
- Ease: sine.inOut

---

## 🔍 API 엔드포인트
- **상태 조회**: `GET /api/v2/lottery/status`
- **플레이**: `POST /api/v2/lottery/play`
- **클라이언트**: `v2Client` (Bearer Auth)
- **티켓 타입**: `LOTTERY_TICKET` (V2 표준)

### 🛠️ 문제 해결 (Troubleshooting)
- **404 NO_FEATURE_TODAY**: 어드민에서 오늘의 복권 게임 스케줄이 등록되어 있는지 확인하세요.
- **401 Unauthorized**: V2 로그인 시스템을 통해 다시 로그인하세요.
- **잔액 미업데이트**: `v2-lottery-status` 쿼리가 무효화(invalidate)되었는지 확인하세요.
- **Dev 우회**: 로컬에서만 `FEATURE_GATE_ENABLED=false`, `TEST_MODE=true`로 진입 가능.

## ⚠️ 알려진 제한사항

### 플레이스홀더 파일
다음 에셋은 플레이스홀더로 설정되어 있습니다:
- 골드 포일 이미지: `/assets/lottery/gold_foil.jpg`
- 로또볼 아이콘: `/assets/lottery/icon_lotto_ball.png`
- 선물 아이콘: `/assets/lottery/icon_gift.png`
- 퍼즐 조각 이미지: `/assets/icons/puzzle_*.png`
- 설날/프리미엄 배경 이미지
- 테마별 사운드 파일

실제 파일을 추가하면 자동으로 적용됩니다.

### 인증 문제
개발 환경에서 401 에러 발생 시:
1. DevLogin을 통해 인증 토큰 획득
2. 또는 Mock 데이터 모드 활성화

### Craft API
현재 퍼즐 교환 API는 플레이스홀더:
```typescript
onCraft={async () => {
  // TODO: Implement craft API call
  console.log('[LotteryPage] Craft puzzle pieces');
  await new Promise((resolve) => setTimeout(resolve, 1000));
  queryClient.invalidateQueries({ queryKey: ['v2-lottery-status'] });
}}
```

실제 구현 시 `useCraftItem` hook 통합 필요.

---

## ✅ 체크리스트

### 빌드
- [ ] TypeScript 타입 에러 없음
- [ ] ESLint 경고 처리
- [ ] 컴포넌트 lazy loading

### UX
- [x] 로딩 상태 표시
- [x] 에러 핸들링
- [x] 반응형 레이아웃
- [x] 텔레그램 인앱 최적화
- [x] 티켓 소진 시 안내

### 애니메이션
- [x] 골드 포일 긁기 (Framer Motion)
- [x] 보상 공개 (zoom + fade)
- [x] 퍼즐 조각 3D 회전
- [x] Confetti 파티클
- [x] 카드 글로우 (GSAP)
- [x] 모달 spring 애니메이션

### 게임 로직
- [x] 승/패 판정
- [x] 보상 표시
- [x] 퍼즐 진행 상황 관리
- [x] 잔액 차감
- [x] 티켓 수 관리

### V1 디자인 계승
- [x] 금박 오버레이
- [x] 로또볼 아이콘
- [x] 프리미엄 프레임
- [x] 퍼즐 조각 레이아웃
- [x] 황금열쇠 교환 플로우

---

## 🎉 다음 단계

1. **에셋 추가**: 실제 금박/로또볼/퍼즐 이미지로 플레이스홀더 교체
2. **Craft API 통합**: 실제 황금열쇠 교환 엔드포인트 연결
3. **사운드 통합**: 테마별 긁기/승리/실패 효과음 추가
4. **추가 애니메이션**:
   - 카드 회전 효과
   - 더 화려한 승리 파티클
   - 퍼즐 획득 시 특수 효과

---

**작성일**: 2026-01-21
**버전**: V2.0.0
**테스트 링크**: `http://localhost:5173/v2/game/lottery`
