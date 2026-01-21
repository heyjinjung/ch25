# V2 주사위 게임 페이지 테스트 가이드

## 🎯 구현 완료 사항

### ✅ 핵심 기능
- [x] V2 API 기반 주사위 상태 조회 및 플레이
- [x] 유저 vs 딜러 주사위 대결 시스템
- [x] 실시간 잔액 및 플레이 횟수 표시
- [x] 승/패/무승부 판정 및 보상 시스템

### ✅ 라우팅/표준화
- [x] `/api/v2/dice/*` 경로로 고정
- [x] 티켓 타입 `DICE_TICKET` 표준 적용

### ✅ 레이아웃/헤더 표준화
- [x] V2 공통 헤더/레이아웃 통합
- [x] Telegram WebView 스크롤 최소화 (flex-col + 100dvh)

### 🎨 테마 시스템
- [x] **ThemeContext**: 동적 테마 전환 시스템
- [x] **기본 테마**: 녹색 (#30FF75) 기반
- [x] **설날 테마**: 빨강/금색, 연등 파티클 (플레이스홀더)
- [x] **프리미엄 테마**: 금색, 스파클 파티클 (플레이스홀더)
- [x] 테마별 색상/아이콘/배경/사운드 분리

### ✨ 애니메이션 효과
- [x] GSAP 기반 주사위 굴림 (720도 회전, 탄성 효과)
- [x] Framer Motion 흔들림 효과 (승자/패자)
- [x] 승리 시 Confetti 파티클
- [x] 결과 배지 애니메이션 (scale + back.out)
- [x] 주사위 값 표시 애니메이션

### 🎮 사용자 경험
- [x] 텔레그램 햅틱 피드백 (굴림/승리/패배)
- [x] 결과별 차별화된 진동 패턴
- [x] 테마별 파티클 효과
- [x] 반응형 모바일 최적화
- [x] 로딩/에러 상태 핸들링

---

## 🚀 테스트 방법

### 1. 개발 서버 실행

```bash
cd c:/Users/JAVIS/ch/ch25
npm run dev
```

### 2. 브라우저에서 접속

```
http://localhost:5173/v2/game/dice
```

### 3. 테스트 시나리오

#### A. 기본 게임 플레이
1. **주사위 굴리기 버튼** 클릭
2. 주사위 롤링 애니메이션 확인 (2초)
3. 유저/딜러 주사위 결과 표시 확인
4. 합계 계산 및 승패 판정 확인
5. 결과 배지 표시 확인

#### B. 승리 케이스
1. 유저 합 > 딜러 합
2. 🎉 승리 배지 표시
3. 딜러 쪽 흔들림 애니메이션
4. Confetti 파티클 효과
5. 성공 햅틱 피드백 (강한 진동)
6. 보상 금액 표시

#### C. 패배 케이스
1. 유저 합 < 딜러 합
2. 😢 패배 배지 표시
3. 유저 쪽 흔들림 애니메이션
4. 가벼운 햅틱 피드백

#### D. 무승부 케이스
1. 유저 합 = 딜러 합
2. 🤝 무승부 배지 표시
3. 중간 햅틱 피드백

#### E. 테마 전환 (개발자 도구)
테마는 현재 코드에서 수동으로 변경 가능:
```typescript
// DicePage.tsx에서 테마 변경
<ThemeProvider initialTheme="lunar-new-year"> // 또는 "premium"
```

---

## 📁 생성된 파일 목록

### 테마 시스템
- `src/v2/contexts/ThemeContext.tsx` - 테마 관리 Context

### 컴포넌트
- `src/v2/components/game/DiceRoll.tsx` - 주사위 굴림 애니메이션

### 페이지
- `src/v2/pages/game/DicePage.tsx` - 메인 주사위 게임 페이지

### 라우터
- `src/v2/router/V2UserRoutes.tsx` - `/v2/game/dice` 라우트 추가

---

## 🎨 테마 상세

### 기본 테마 (Default)
```typescript
colors: {
  primary: '#30FF75',    // 녹색
  secondary: '#00D4AA',  // 청록
  accent: '#FFD700',     // 금색
  win: '#30FF75',
  lose: '#FF4444',
  draw: '#FFA500',
}
```

### 설날 테마 (Lunar New Year)
```typescript
colors: {
  primary: '#FF4444',    // 빨강
  secondary: '#FFD700',  // 금색
  accent: '#FF6B6B',     // 밝은 빨강
}
assets: {
  particleType: 'lantern',  // 연등 파티클
  background: '/assets/bg_lunar_new_year.jpg', // 플레이스홀더
}
animations: {
  diceRollDuration: 2500,
  shakeIntensity: 15,
  particleCount: 50,
}
```

### 프리미엄 테마 (Premium)
```typescript
colors: {
  primary: '#FFD700',    // 금색
  secondary: '#FFA500',  // 주황금
}
assets: {
  particleType: 'sparkle',  // 반짝임 파티클
  diceIcon: '/assets/icon_dice_gold.png', // 플레이스홀더
}
animations: {
  diceRollDuration: 3000,
  shakeIntensity: 20,
  particleCount: 60,
}
```

---

## 🔧 테마 확장 방법

### 1. 새 테마 추가

`src/v2/contexts/ThemeContext.tsx`에서:

```typescript
const NEW_THEME: ThemeConfig = {
  name: '새 테마',
  colors: { /* 색상 설정 */ },
  assets: {
    diceIcon: '/assets/icon_dice_new.png',
    background: '/assets/bg_new.jpg',
    particleType: 'sparkle',
  },
  sounds: { /* 사운드 설정 */ },
  animations: { /* 애니메이션 설정 */ },
};

const THEMES: Record<ThemeType, ThemeConfig> = {
  // ...
  'new-theme': NEW_THEME,
};
```

### 2. 배경 이미지 추가

1. 이미지를 `/public/assets/` 폴더에 추가
2. ThemeConfig에서 `assets.background` 경로 설정

### 3. 주사위 아이콘 교체

1. PNG 이미지를 `/public/assets/` 폴더에 추가
2. ThemeConfig에서 `assets.diceIcon` 경로 설정

### 4. 사운드 추가

1. MP3 파일을 `/public/sounds/` 폴더에 추가
2. ThemeConfig에서 `sounds` 설정

---

## 📱 모바일/텔레그램 햅틱 패턴

### 주사위 굴림 시작
- 강한 진동 (heavy)

### 승리
- 성공 알림 진동 (success notification)
- 패턴: [30, 50, 30]

### 패배
- 가벼운 진동 (light)
- 패턴: [10]

### 무승부
- 중간 진동 (medium)
- 패턴: [20]

---

## 🎯 애니메이션 타이밍

### 주사위 굴림
- 기본: 2000ms
- 설날: 2500ms
- 프리미엄: 3000ms

### 롤링 애니메이션
- GSAP rotate: 720도 (2바퀴)
- Scale: 1 → 1.3 → 1
- Easing: power2.out → back.out

### 결과 표시
- Delay: 300ms
- Scale: 0 → 1
- Easing: back.out(2)

### 흔들림 효과
- Duration: 500ms
- Pattern: [-10, 10, -10, 10, 0]

---

## 🔍 API 엔드포인트
- **상태 조회**: `GET /api/v2/dice/status`
- **플레이**: `POST /api/v2/dice/play`
- **클라이언트**: `v2Client` (Bearer Auth)
- **티켓 타입**: `DICE_TICKET` (V2 표준)

### 🛠️ 문제 해결 (Troubleshooting)
- **404 NO_FEATURE_TODAY**: 어드민에서 오늘의 주사위 게임 스케줄이 등록되어 있는지 확인하세요.
- **401 Unauthorized**: V2 로그인 시스템을 통해 다시 로그인하세요.
- **잔액 미업데이트**: `v2-dice-status` 쿼리가 무효화(invalidate)되었는지 확인하세요.
- **Dev 우회**: 로컬에서만 `FEATURE_GATE_ENABLED=false`, `TEST_MODE=true`로 진입 가능.

## ⚠️ 알려진 제한사항

### 플레이스홀더 파일
다음 에셋은 플레이스홀더로 설정되어 있습니다:
- 설날 배경 이미지
- 설날 주사위 아이콘
- 프리미엄 주사위 아이콘
- 한정 쿠폰 이미지
- 테마별 사운드 파일

실제 파일을 추가하면 자동으로 적용됩니다.

### 인증 문제
개발 환경에서 401 에러 발생 시:
1. DevLogin을 통해 인증 토큰 획득
2. 또는 Mock 데이터 모드 활성화

---

## ✅ 체크리스트

### 빌드
- [x] TypeScript 타입 에러 없음
- [x] ESLint 경고 처리
- [x] 컴포넌트 lazy loading

### UX
- [x] 로딩 상태 표시
- [x] 에러 핸들링
- [x] 반응형 레이아웃
- [x] 텔레그램 인앱 최적화

### 애니메이션
- [x] 주사위 굴림 (GSAP)
- [x] 결과 흔들림 (Framer Motion)
- [x] Confetti 파티클
- [x] 배지 애니메이션
- [x] 테마별 파티클

### 게임 로직
- [x] 승/패/무 판정
- [x] 보상 계산
- [x] 잔액 차감
- [x] 플레이 횟수 관리

---

## 🎉 다음 단계

1. **배경 이미지/아이콘 추가**: 실제 에셋으로 플레이스홀더 교체
2. **더블업 기능**: 승리 후 베팅 금액 2배로 재도전
3. **사운드 통합**: 테마별 효과음 추가
4. **애니메이션 고도화**: 주사위 3D 회전, 더 화려한 파티클

---

**작성일**: 2026-01-21
**버전**: V2.0.0
**테스트 링크**: `http://localhost:5173/v2/game/dice`
