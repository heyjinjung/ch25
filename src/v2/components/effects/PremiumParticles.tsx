import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface PremiumParticlesProps {
  type: 'gold' | 'diamond' | 'none';
  intensity?: number;
}

const PremiumParticles = ({ type, intensity = 15 }: PremiumParticlesProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const animationRef = useRef<(gsap.core.Timeline | gsap.core.Tween)[]>([]);

  useEffect(() => {
    if (type === 'none' || !containerRef.current) return;

    const container = containerRef.current;
    particlesRef.current = [];
    animationRef.current = [];

    // Clear previous particles
    container.innerHTML = '';

    // Particle config
    const config = {
      gold: {
        colors: ['#FFD700', '#FFA500', '#FFEB1C', '#FFB347'],
        size: [4, 8],
        glow: 'rgba(255, 215, 0, 0.6)',
      },
      diamond: {
        colors: ['#00BFFF', '#87CEEB', '#1E90FF', '#00CED1', '#4169E1'],
        size: [3, 6],
        glow: 'rgba(0, 191, 255, 0.7)',
      },
    };

    const particleConfig = config[type];

    // Create floating particles
    for (let i = 0; i < intensity; i++) {
      const particle = document.createElement('div');
      const size = gsap.utils.random(particleConfig.size[0], particleConfig.size[1]);

      particle.className = 'absolute rounded-full pointer-events-none';
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.backgroundColor = particleConfig.colors[Math.floor(Math.random() * particleConfig.colors.length)];
      particle.style.boxShadow = `0 0 ${size * 2}px ${particleConfig.glow}`;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.opacity = `${gsap.utils.random(0.3, 0.7)}`;

      container.appendChild(particle);
      particlesRef.current.push(particle);

      // Floating animation
      const tl = gsap.timeline({ repeat: -1, yoyo: true });

      tl.to(particle, {
        y: gsap.utils.random(-50, 50),
        x: gsap.utils.random(-50, 50),
        opacity: gsap.utils.random(0.2, 0.8),
        scale: gsap.utils.random(0.8, 1.4),
        duration: gsap.utils.random(3, 6),
        ease: 'sine.inOut',
      });

      animationRef.current.push(tl);
    }

    return () => {
      // Kill all animations
      animationRef.current.forEach((tl) => tl.kill());
      particlesRef.current.forEach((p) => p.remove());
      particlesRef.current = [];
      animationRef.current = [];
    };
  }, [type, intensity]);

  if (type === 'none') return null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    />
  );
};

export default PremiumParticles;
