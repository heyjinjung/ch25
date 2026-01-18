# GSAP Usage Guide

GSAP (GreenSock Animation Platform)이 프로젝트에 추가되었습니다.

## 설치 완료

```bash
npm install gsap
```

## React에서 GSAP 사용하기

### 기본 사용법 (useLayoutEffect + gsap.context)

```tsx
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';

function MyComponent() {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // 이 스코프 내의 모든 애니메이션은 자동으로 추적됩니다
      gsap.to('.box', {
        x: 100,
        duration: 1,
        ease: 'power2.inOut'
      });
      
      gsap.from('.title', {
        opacity: 0,
        y: -50,
        duration: 0.8
      });
    }, containerRef); // 두 번째 인자로 스코프 지정

    return () => ctx.revert(); // 클린업: 모든 애니메이션 자동 제거
  }, []);

  return (
    <div ref={containerRef}>
      <h1 className="title">Title</h1>
      <div className="box">Animated Box</div>
    </div>
  );
}
```

### useGSAP 커스텀 훅 사용

프로젝트에 `src/utils/gsapSetup.ts`에 `useGSAP` 훅이 준비되어 있습니다:

```tsx
import { useRef } from 'react';
import { useGSAP } from '@/utils/gsapSetup';
import gsap from 'gsap';

function MyComponent() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.to('.box', { x: 100, duration: 1 });
  }, containerRef);

  return (
    <div ref={containerRef}>
      <div className="box">Animate me</div>
    </div>
  );
}
```

### 프리셋 애니메이션 사용

```tsx
import { useRef } from 'react';
import { useGSAP, gsapPresets } from '@/utils/gsapSetup';
import gsap from 'gsap';

function MyComponent() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.fromTo('.card', gsapPresets.fadeInUp.from, gsapPresets.fadeInUp.to);
  }, containerRef);

  return (
    <div ref={containerRef}>
      <div className="card">I fade in from bottom</div>
    </div>
  );
}
```

## Tailwind v3와 함께 사용

GSAP는 JavaScript 기반 애니메이션 라이브러리로, Tailwind CSS와 **충돌 없이** 사용할 수 있습니다:

- **Tailwind**: 정적 스타일 및 간단한 CSS 트랜지션 (`transition-all`, `hover:scale-110` 등)
- **GSAP**: 복잡한 타임라인, 시퀀스, 인터랙티브 애니메이션

### 권장 패턴

```tsx
function Card() {
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // GSAP으로 진입 애니메이션
    gsap.from('.card-content', {
      opacity: 0,
      y: 20,
      duration: 0.6,
      stagger: 0.1
    });
  }, cardRef);

  return (
    <div ref={cardRef}>
      {/* Tailwind로 기본 스타일 + 간단한 호버 효과 */}
      <div className="card-content bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
        Content
      </div>
    </div>
  );
}
```

## 타임라인 예제

```tsx
useGSAP(() => {
  const tl = gsap.timeline();
  
  tl.from('.hero-title', { opacity: 0, y: -50, duration: 0.8 })
    .from('.hero-subtitle', { opacity: 0, y: -30, duration: 0.6 }, '-=0.4')
    .from('.hero-cta', { opacity: 0, scale: 0.8, duration: 0.5 }, '-=0.3');
}, containerRef);
```

## ScrollTrigger 플러그인 (필요시)

스크롤 기반 애니메이션이 필요한 경우:

```bash
# 이미 gsap 패키지에 포함되어 있습니다
```

```tsx
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

useGSAP(() => {
  gsap.to('.parallax', {
    y: 100,
    scrollTrigger: {
      trigger: '.parallax',
      start: 'top center',
      end: 'bottom center',
      scrub: true
    }
  });
}, containerRef);
```

## 주의사항

1. **useLayoutEffect 사용**: `useEffect` 대신 `useLayoutEffect`를 사용하여 DOM 페인트 전에 애니메이션 설정
2. **클린업 필수**: `gsap.context().revert()`로 컴포넌트 언마운트 시 애니메이션 정리
3. **스코프 지정**: `gsap.context(callback, scope)`로 애니메이션 스코프를 제한하여 충돌 방지
4. **TypeScript**: 타입 정의가 자동으로 포함되어 있습니다

## 추가 리소스

- [GSAP 공식 문서](https://gsap.com/docs/v3/)
- [GSAP React 가이드](https://gsap.com/resources/React/)
- [GSAP Easing Visualizer](https://gsap.com/docs/v3/Eases)
