/**
 * GSAP Animation Example Component
 * 
 * Demonstrates GSAP usage with React + Tailwind v3
 */

import { useRef } from 'react';
import { useGSAP } from '@/utils/gsapSetup';
import gsap from 'gsap';

export function GSAPExample() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // Timeline animation
    const tl = gsap.timeline();
    
    tl.from('.gsap-title', {
      opacity: 0,
      y: -50,
      duration: 0.8,
      ease: 'power2.out'
    })
    .from('.gsap-card', {
      opacity: 0,
      y: 30,
      duration: 0.6,
      stagger: 0.15,
      ease: 'power2.out'
    }, '-=0.4');

    // Hover animation (GSAP handles the animation, Tailwind handles styling)
    const cards = gsap.utils.toArray<HTMLElement>('.gsap-card');
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        gsap.to(card, { scale: 1.05, duration: 0.3, ease: 'power2.out' });
      });
      card.addEventListener('mouseleave', () => {
        gsap.to(card, { scale: 1, duration: 0.3, ease: 'power2.out' });
      });
    });
  }, containerRef);

  return (
    <div ref={containerRef} className="p-8 bg-gradient-to-br from-gray-900 to-gray-800 min-h-screen">
      <h1 className="gsap-title text-4xl font-bold text-white mb-8 text-center">
        GSAP + React + Tailwind v3
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {[1, 2, 3].map((num) => (
          <div
            key={num}
            className="gsap-card bg-white rounded-lg shadow-lg p-6 cursor-pointer"
          >
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Card {num}</h3>
            <p className="text-gray-600">
              GSAP handles animation, Tailwind handles styling. Perfect harmony!
            </p>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center text-gray-400 text-sm">
        <p>Hover over cards to see GSAP-powered animations</p>
        <p className="mt-2">No conflicts with Tailwind v3 transitions!</p>
      </div>
    </div>
  );
}
