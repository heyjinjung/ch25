// src/components/common/Snowfall.tsx
import React, { useEffect, useState } from "react";

interface Snowflake {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

const Snowfall: React.FC = () => {
  const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    // 저장된 설정 불러오기
    const saved = localStorage.getItem("xmas_snow_enabled");
    if (saved !== null) {
      setIsEnabled(saved === "true");
    }
  }, []);

  useEffect(() => {
    if (!isEnabled) {
      setSnowflakes([]);
      return;
    }

    // 눈송이 생성
    const flakes: Snowflake[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      size: Math.random() * 8 + 4,
      duration: Math.random() * 10 + 10,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.6 + 0.2,
    }));
    setSnowflakes(flakes);
  }, [isEnabled]);

  const toggleSnow = () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    localStorage.setItem("xmas_snow_enabled", newValue.toString());
  };

  return (
    <>
      {/* 눈 토글 버튼 */}
      <button
        onClick={toggleSnow}
        className="fixed bottom-4 left-4 z-50 flex items-center justify-center w-12 h-12 rounded-full 
          bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600/50
          shadow-lg transition-all duration-300 hover:scale-110"
        title={isEnabled ? "눈 효과 끄기" : "눈 효과 켜기"}
      >
        <span className="text-xl">{isEnabled ? "❄️" : "☀️"}</span>
      </button>

      {/* 눈송이 컨테이너 */}
      {isEnabled && (
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
          {snowflakes.map((flake) => (
            <div
              key={flake.id}
              className="absolute text-white animate-fall"
              style={{
                left: `${flake.x}%`,
                fontSize: `${flake.size}px`,
                opacity: flake.opacity,
                animation: `fall ${flake.duration}s linear ${flake.delay}s infinite`,
              }}
            >
              ❄
            </div>
          ))}
        </div>
      )}

      {/* CSS 애니메이션 */}
      <style>{`
        @keyframes fall {
          0% {
            transform: translateY(-10vh) rotate(0deg);
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
          }
        }
      `}</style>
    </>
  );
};

export default Snowfall;
