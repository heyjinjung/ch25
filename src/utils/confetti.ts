import confetti from "canvas-confetti";

/**
 * Triggers a premium-feel firework effect.
 * Uses multiple confetti bursts with different origins and delays.
 */
export const triggerFireworks = () => {
  const duration = 2500;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 100, zIndex: 9999 };

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  const interval: any = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 40 * (timeLeft / duration);

    // Random bursts from different X positions to create a "show"
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ["#FFD700", "#FF0000", "#FFFFFF", "#00FF00"], // Gold, Red, White, Green
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ["#00FFFF", "#FF00FF", "#FFFF00"], // CMY
    });
  }, 250);
};

/**
 * Triggers a "Jackpot" style intense confetti blast.
 * Fills the screen from both sides.
 */
export const triggerJackpotExplosion = () => {
  const end = Date.now() + 1000;

  (function frame() {
    confetti({
      particleCount: 7,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ["#ffd700", "#ffffff"], // Gold & White
    });
    confetti({
      particleCount: 7,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ["#ffd700", "#ffffff"], // Gold & White
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
};
