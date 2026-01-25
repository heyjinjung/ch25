import React from "react";

const RouletteFrame: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <div className="relative w-full aspect-[292/293] flex items-center justify-center">
      {/* Vector Frame (Figma: 1189:616) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img
          src="/assets/roulette/Vector.svg"
          alt="Frame"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img
          src="/assets/roulette/Vector2.svg"
          alt="Frame Inner"
          className="w-[98.46%] h-[98.46%] object-contain"
          draggable={false}
        />
      </div>

      {/* Wheel content area (matches Vector3 ring size) */}
      <div className="relative z-10 w-[84.87%] h-[84.87%] flex items-center justify-center rounded-full overflow-hidden">
        {children}
      </div>

      {/* Overlay ring (on top of wheel content) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <img
          src="/assets/roulette/Vector3.svg"
          alt="Frame Ring"
          className="w-[84.87%] h-[84.87%] object-contain"
          draggable={false}
        />
      </div>
    </div>
  );
};

export default RouletteFrame;
