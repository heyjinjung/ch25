# V2 GSAP Core Reference (GSAP 핵심 기능 가이드)

이 문서는 V2 프로젝트에서 사용하는 GSAP(GreenSock Animation Platform)의 핵심 기능과 패턴을 정리한 레퍼런스입니다.

## 1. Tweens (기본 애니메이션)

가장 기본적인 애니메이션 단위입니다.

```javascript
// gsap.to(): 현재 값 -> 목표 값으로 애니메이션
gsap.to(".selector", { 
  x: 100, 
  backgroundColor: "red", // camelCase 사용
  duration: 1, 
  ease: "power2.inOut",
  stagger: 0.1, // 시차 적용 (여러 요소일 때)
  onComplete: () => console.log("완료")
});

// gsap.from(): 목표 값 -> 현재 값으로 애니메이션 (등장 효과에 유용)
gsap.from(".selector", { opacity: 0, y: 50 });

// gsap.fromTo(): 시작 값과 끝 값을 모두 지정 (가장 명확한 제어)
gsap.fromTo(".selector", 
  { opacity: 0, x: -100 }, // fromVars
  { opacity: 1, x: 0, duration: 1 } // toVars
);

// gsap.set(): 애니메이션 없이 즉시 값 설정
gsap.set(".selector", { x: 50, opacity: 0.5 });
```

## 2. Timelines (타임라인)

여러 애니메이션을 순차적으로 연결하거나 동시에 실행할 때 사용합니다.

```javascript
let tl = gsap.timeline({
  defaults: { duration: 1, ease: 'power1.out' }, // 기본 설정 공유
  repeat: -1, // 무한 반복
  yoyo: true // 왕복 재생
});

tl.to('.box1', { x: 100 })
  .to('.box2', { y: 50 }, "-=0.5") // 0.5초 겹쳐서 시작 (앞선 애니메이션 끝나기 0.5초 전)
  .to('.box3', { opacity: 0 }, "<") // 앞선 애니메이션과 동시에 시작
  .add("myLabel") // 라벨 추가
  .to('.box4', { scale: 1.5 }, "myLabel+=1"); // 라벨 기준 1초 뒤 실행
```

## 3. Control Methods (제어)

애니메이션 인스턴스를 변수에 저장하여 제어할 수 있습니다.

```javascript
let anim = gsap.to(...);

anim.play(); // 재생
anim.pause(); // 일시정지
anim.reverse(); // 역재생
anim.restart(); // 처음부터 다시 재생
anim.timeScale(2); // 2배속
anim.seek(1.5); // 1.5초 지점으로 이동
anim.progress(0.5); // 50% 지점으로 이동
anim.kill(); // 애니메이션 제거 (메모리 해제)
```

## 4. Eases (가속도 함수)

애니메이션의 느낌을 결정하는 핵심 요소입니다.
[GSAP Ease Visualizer](https://greensock.com/ease-visualizer) 참조.

*   **Core**: `none`(linear), `power1`~`power4`, `circ`, `expo`, `sine`
*   **Expressive**: `elastic`, `back`, `bounce`
*   **Usage**: `ease: "power2.out"`, `ease: "back.out(1.7)"`

## 5. ScrollTrigger (스크롤 연동)

스크롤 위치에 따라 애니메이션을 제어합니다.

```javascript
gsap.to(".box", {
  scrollTrigger: {
    trigger: ".box", // 트리거 요소
    start: "top center", // [요소 위치] [뷰포트 위치] (요소의 탑이 뷰포트 센터에 닿을 때)
    end: "bottom 100px",
    scrub: true, // 스크롤바 움직임에 맞춰 애니메이션 재생 (부드럽게: true 또는 숫자)
    pin: true, // 트리거 동안 요소 고정
    markers: true, // 개발용 가이드라인 표시
    toggleActions: "play pause resume reset" // [onEnter onLeave onEnterBack onLeaveBack]
  },
  x: 500
});
```

## 6. Performance & Utils (성능 및 유틸리티)

### QuickTo / QuickSetter (고성능)
마우스 이동 등 빈번한 업데이트가 필요한 경우 사용합니다.

```javascript
// 일반 .set() 보다 훨씬 빠름
let xTo = gsap.quickTo("#id", "x", { duration: 0.4, ease: "power3" });

window.addEventListener("mousemove", e => {
  xTo(e.pageX);
});
```

### Utility Functions
```javascript
gsap.utils.random(0, 100); // 랜덤 값
gsap.utils.clamp(0, 100, 150); // 범위 제한 (결과: 100)
gsap.utils.interpolate(0, 100, 0.5); // 보간 (결과: 50)
gsap.utils.toArray(".class"); // 배열로 변환
```

## 7. React Integration (리액트 연동)

리액트에서는 `useGSAP` 훅(또는 `useEffect`)과 `useRef`를 함께 사용해야 합니다.

```tsx
import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

function MyComponent() {
  const container = useRef();

  useGSAP(() => {
    // container 내부의 .box 선택
    gsap.to(".box", { x: 100 }); 
  }, { scope: container });

  return (
    <div ref={container}>
      <div className="box">Hello</div>
    </div>
  );
}
```
*주의: V2 프로젝트에서는 `gsap.context()` 혹은 `useGSAP`을 사용하여 언마운트 시 클린업(revert)을 보장해야 합니다.*
