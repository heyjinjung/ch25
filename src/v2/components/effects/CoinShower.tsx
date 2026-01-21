import { useEffect, useRef } from 'react';
import gsap from 'gsap';

interface CoinShowerProps {
  active: boolean;
  coinType?: 'gold' | 'diamond' | 'normal';
  duration?: number;
  intensity?: number;
}

const CoinShower = ({ active, coinType = 'normal', duration = 2500, intensity = 30 }: CoinShowerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const coinsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    coinsRef.current = [];

    // Clear previous coins
    container.innerHTML = '';

    // Coin color based on type
    const coinConfig = {
      gold: {
        colors: ['#FFD700', '#FFA500', '#FFEB1C'],
        shadow: '0_0_20px_rgba(255,215,0,0.6)',
        glow: 'gold',
      },
      diamond: {
        colors: ['#00BFFF', '#1E90FF', '#00CED1'],
        shadow: '0_0_20px_rgba(0,191,255,0.6)',
        glow: 'cyan',
      },
      normal: {
        colors: ['#30FF75', '#00D4AA', '#D2FD9C'],
        shadow: '0_0_15px_rgba(48,255,117,0.4)',
        glow: 'lime',
      },
    };

    const config = coinConfig[coinType];

    // Create coins
    for (let i = 0; i < intensity; i++) {
      const coin = document.createElement('div');
      coin.className = 'absolute w-6 h-6 rounded-full pointer-events-none';
      coin.style.backgroundColor = config.colors[Math.floor(Math.random() * config.colors.length)];
      coin.style.boxShadow = `0 0 20px rgba(255,215,0,0.6)`;
      coin.style.left = `${Math.random() * 100}%`;
      coin.style.top = `-20px`;

      container.appendChild(coin);
      coinsRef.current.push(coin);

      // GSAP animation
      gsap.to(coin, {
        y: window.innerHeight + 100,
        x: `random(-100, 100)`,
        rotation: `random(0, 720)`,
        opacity: 0,
        duration: gsap.utils.random(1.5, 2.5),
        delay: i * 0.05,
        ease: 'power2.in',
        onComplete: () => {
          coin.remove();
        },
      });
    }

    // Cleanup
    const timer = setTimeout(() => {
      coinsRef.current.forEach((coin) => coin.remove());
      coinsRef.current = [];
    }, duration);

    return () => {
      clearTimeout(timer);
      coinsRef.current.forEach((coin) => coin.remove());
    };
  }, [active, coinType, duration, intensity]);

  if (!active) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-[9999]"
      aria-hidden="true"
    />
  );
};

export default CoinShower;
