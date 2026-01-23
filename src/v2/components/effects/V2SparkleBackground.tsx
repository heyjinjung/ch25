import { useLayoutEffect, useRef, useMemo } from "react";
import gsap from "gsap";

/**
 * V2SparkleBackground
 * Creates a slow, deep floating effect using sparkle.png.
 * Designed to be placed in the background of V2AppLayout.
 */
export default function V2SparkleBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Create a fixed number of particles on mount
  const particles = useMemo(() => 
    Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      size: Math.random() * 30 + 15, // 15px to 45px
      left: Math.random() * 100,
      top: Math.random() * 100,
      opacity: Math.random() * 0.12 + 0.05, // Very subtle
      rot: Math.random() * 360,
    })), []);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      // Floating motion
      gsap.to(".v2-bg-sparkle", {
        y: "random(-120, 120)",
        x: "random(-60, 60)",
        rotation: "+=180",
        duration: "random(15, 25)",
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
        stagger: {
          amount: 8,
          from: "random"
        }
      });

      // Subtle pulse
      gsap.to(".v2-bg-sparkle", {
        opacity: "+=0.08",
        duration: "random(3, 6)",
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: {
          amount: 4,
          from: "random"
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ mixBlendMode: 'screen' }}
    >
      {particles.map((p) => (
        <img
          key={p.id}
          src="/assets/sparkle.png"
          className="v2-bg-sparkle absolute object-contain"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
            opacity: p.opacity,
            transform: `rotate(${p.rot}deg)`,
            filter: 'blur(1px)'
          }}
          alt=""
        />
      ))}
    </div>
  );
}
