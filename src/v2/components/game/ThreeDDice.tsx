import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import "./ThreeDDice.css";

interface ThreeDDiceProps {
  value: number; // 1 to 6
  isRolling: boolean;
  size?: number;
}

const ASSET_PATH = "/v2/assets/03dice";
const getDiceImage = (val: number) =>
  `${ASSET_PATH}/img_dice_side_${val}.png`;

const ThreeDDice: React.FC<ThreeDDiceProps> = ({
  value,
  isRolling,
  size = 100,
}) => {
  const cubeRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<gsap.Context | null>(null);

  // Target rotations to show each face
  // Face 1 (Front): 0, 0
  // Face 2 (Back): 0, 180
  // Face 3 (Right): 0, -90
  // Face 4 (Left): 0, 90
  // Face 5 (Top): -90, 0
  // Face 6 (Bottom): 90, 0
  const faceRotations: Record<number, { x: number; y: number }> = {
    1: { x: 0, y: 0 },
    2: { x: 0, y: 180 },
    3: { x: 0, y: -90 },
    4: { x: 0, y: 90 },
    5: { x: -90, y: 0 },
    6: { x: 90, y: 0 },
  };

  useEffect(() => {
    // 1) Cleanup old animations
    if (contextRef.current) contextRef.current.revert();

    contextRef.current = gsap.context(() => {
      const cube = cubeRef.current;
      const shadow = shadowRef.current;
      if (!cube || !shadow) return;


      if (!cube || !shadow) return;

      if (isRolling) {
        // === PHASE 1: TOSS & SPIN (Looping) ===
        // "Throw" the dice up and start spinning chaos

        // 1. Toss Up
        gsap.to(cube, {
          y: -150, // Throw high
          scale: 1.2, // Comes closer to camera
          duration: 0.5,
          ease: "power2.out",
        });

        // 2. Shrink Shadow
        gsap.to(shadow, {
          scale: 0.2,
          opacity: 0.1,
          duration: 0.5,
          ease: "power2.out",
        });

        // 3. Infinite Chaos Spin
        // We use a separate tween for rotation so it doesn't conflict with the 'y' movement
        gsap.to(cube, {
          rotationX: "+=720",
          rotationY: "+=1080",
          rotationZ: "+=360",
          duration: 0.8,
          repeat: -1,
          ease: "none", // Constant speed spin while in air
        });
      } else {
        // === PHASE 2: LANDING (Result) ===
        // The dice is currently high up and spinning. We need to bring it down to the target.

        // Stop the infinite spin immediately, but keep current values
        gsap.killTweensOf(cube);
        gsap.killTweensOf(shadow);

        const target = faceRotations[value] || { x: 0, y: 0 };

        // Calculate "extra" rounds so it doesn't spin backward oddly
        // We want it to land with impact.
        // Current rotation could be anything. We just force set it to a "pre-land" state relative to target
        // to ensure the landing animation looks consistent every time.
        // OR we can animate from current. Let's animate from current for smoothness, but add enough rotation to look fast.

        const curX = gsap.getProperty(cube, "rotationX") as number;
        const curY = gsap.getProperty(cube, "rotationY") as number;

        // Snap to nearest 360 multiple + target
        // This math ensures we always spin "forward" to the target
        const snap = (curr: number, dest: number) => {
          const cycle = 360;
          const currentCycle = Math.floor(curr / cycle);
          return (currentCycle + 2) * cycle + dest; // Add 2 full spins
        };

        const targetX = snap(curX, target.x);
        const targetY = snap(curY, target.y);
        // Randomize Z slightly for realism, but land at 0
        const targetZ = Math.ceil((gsap.getProperty(cube, "rotationZ") as number) / 360) * 360;

        const landDuration = 0.8;

        // 1. Land & Bounce (Y-axis)
        gsap.to(cube, {
          y: 0,
          scale: 1,
          duration: landDuration,
          ease: "bounce.out", // The heavy thud
        });

        // 2. Rotate to Target (precisely syncs with landing)
        gsap.to(cube, {
           rotationX: targetX,
           rotationY: targetY,
           rotationZ: targetZ,
           duration: landDuration,
           ease: "power2.out", // Smooth deceleration
        });

        // 3. Shadow grows back
        gsap.to(shadow, {
          scale: 1,
          opacity: 0.5,
          duration: landDuration,
          ease: "bounce.out",
        });
      }
    });

    return () => {
      if (contextRef.current) contextRef.current.revert();
    };
  }, [isRolling, value]);

  return (
    <div
      className="scene"
      style={{ "--dice-size": `${size}px` } as React.CSSProperties}
    >
      <div className="cube" ref={cubeRef}>
        <div className="cube-face face-1">
          <img src={getDiceImage(1)} alt="1" />
        </div>
        <div className="cube-face face-2">
          <img src={getDiceImage(2)} alt="2" />
        </div>
        <div className="cube-face face-3">
          <img src={getDiceImage(3)} alt="3" />
        </div>
        <div className="cube-face face-4">
          <img src={getDiceImage(4)} alt="4" />
        </div>
        <div className="cube-face face-5">
          <img src={getDiceImage(5)} alt="5" />
        </div>
        <div className="cube-face face-6">
          <img src={getDiceImage(6)} alt="6" />
        </div>
      </div>
      <div className="dice-shadow" ref={shadowRef} />
    </div>
  );
};

export default ThreeDDice;
