/**
 * GSAP Setup & Utilities for React
 * 
 * GSAP (GreenSock Animation Platform) integration with React
 * Uses useLayoutEffect + gsap.context for proper cleanup and SSR safety
 */

import { useLayoutEffect, MutableRefObject } from 'react';
import gsap from 'gsap';

/**
 * Hook for GSAP animations with automatic cleanup
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   
 *   useGSAP(() => {
 *     gsap.to('.box', { x: 100, duration: 1 });
 *   }, containerRef);
 *   
 *   return <div ref={containerRef}><div className="box">Animate me</div></div>;
 * }
 * ```
 */
export function useGSAP(
  callback: (context: gsap.Context) => void | (() => void),
  scope?: MutableRefObject<HTMLElement | null> | HTMLElement | string
) {
  useLayoutEffect(() => {
    const ctx = gsap.context(callback, scope);
    return () => ctx.revert(); // Cleanup animations
  }, [callback, scope]);
}

/**
 * Common GSAP animation presets
 */
export const gsapPresets = {
  // Fade in from bottom
  fadeInUp: {
    from: { opacity: 0, y: 30 },
    to: { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
  },
  
  // Fade in from top
  fadeInDown: {
    from: { opacity: 0, y: -30 },
    to: { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' },
  },
  
  // Scale in
  scaleIn: {
    from: { scale: 0, opacity: 0 },
    to: { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.7)' },
  },
  
  // Slide in from left
  slideInLeft: {
    from: { x: -100, opacity: 0 },
    to: { x: 0, opacity: 1, duration: 0.6, ease: 'power2.out' },
  },
  
  // Slide in from right
  slideInRight: {
    from: { x: 100, opacity: 0 },
    to: { x: 0, opacity: 1, duration: 0.6, ease: 'power2.out' },
  },
};

/**
 * Stagger animation helper
 */
export const staggerAnimation = (
  selector: string,
  animation: { from: gsap.TweenVars; to: gsap.TweenVars },
  staggerDelay = 0.1
) => {
  gsap.set(selector, animation.from);
  gsap.to(selector, {
    ...animation.to,
    stagger: staggerDelay,
  });
};
