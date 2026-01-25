import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import './ThreeDDice.css';

interface ThreeDDiceProps {
  value: number; // 1 to 6
  isRolling: boolean;
  size?: number;
}

// Map dice values to the generic face images available in the assets
// Checked directory: public/v2/assets/03dice
const ASSET_PATH = "/v2/assets/03dice";
const getDiceImage = (val: number) => `${ASSET_PATH}/img_dice_side_{[${val}]}.png`;

const ThreeDDice: React.FC<ThreeDDiceProps> = ({ value, isRolling, size = 100 }) => {
  const cubeRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const contextRef = useRef<gsap.Context | null>(null);

  // Define rotations for each face to face strictly front
  const faceRotations: Record<number, { x: number; y: number }> = {
     1: { x: 0, y: 0 },
     2: { x: 0, y: 180 }, // Back
     3: { x: 0, y: -90 }, // Right
     4: { x: 0, y: 90 },  // Left
     5: { x: -90, y: 0 }, // Top
     6: { x: 90, y: 0 },  // Bottom
  };

  useEffect(() => {
    if (contextRef.current) contextRef.current.revert();
    
    contextRef.current = gsap.context(() => {
      const cube = cubeRef.current;
      const shadow = shadowRef.current;
      if (!cube || !shadow) return;

      if (isRolling) {
         // Rolling / Throwing Animation
         const tl = gsap.timeline();

         // 1. Initial Pop (Throw)
         tl.to(cube, {
            z: 200, // Move closer to camera (pop up)
            duration: 0.4,
            ease: "back.out(1.2)",
         }, 0);
         
         // 2. Continuous Spin (High Energy)
         // Randomize direction slightly for realism
         const randX = Math.random() < 0.5 ? 1080 : -1080;
         const randY = Math.random() < 0.5 ? 720 : -720;

         tl.to(cube, {
             rotationX: `+=${randX}`,
             rotationY: `+=${randY}`,
             rotationZ: "+=360", // Add Z rotation for 3D tumbling
             duration: 1.2,
             repeat: -1,
             ease: "none",
         }, 0);

         // 3. Shadow logic (fades out when dice pops up)
         tl.to(shadow, {
             scale: 0.5,
             opacity: 0.2,
             duration: 0.4,
             ease: "power2.out"
         }, 0);

      } else {
         // Landing Animation
         const currentX = (gsap.getProperty(cube, "rotationX") as number) || 0;
         const currentY = (gsap.getProperty(cube, "rotationY") as number) || 0;
         
         const target = faceRotations[value] || { x: 0, y: 0 };
         
         // Calculate nearest multiple of 360 to minimize travel but ensure spin
         // Adding extra spins (720) ensures it doesn't just "snap" if close
         const xMulti = Math.ceil(currentX / 360) * 360 + (360 * 2); 
         const yMulti = Math.ceil(currentY / 360) * 360 + (360 * 2);
         
         const finalX = xMulti + target.x;
         const finalY = yMulti + target.y;

         const landTl = gsap.timeline();

         // 1. Snap to face with elastic finish
         landTl.to(cube, {
             rotationX: finalX,
             rotationY: finalY,
             rotationZ: 0, // Reset Z tilt
             z: 0, // Return to base position
             duration: 0.8,
             ease: "elastic.out(1, 0.6)", // Bouncy landing
         });

         // 2. Shadow restores as dice lands
         landTl.to(shadow, {
             scale: 1,
             opacity: 0.6,
             duration: 0.5,
             ease: "bounce.out"
         }, 0.2); // Sync with dice landing
      }
    });

    return () => {
       if (contextRef.current) contextRef.current.revert();
    };
  }, [isRolling, value]);

  return (
    <div className="scene" style={{ "--dice-size": `${size}px` } as React.CSSProperties}>
      <div className="cube" ref={cubeRef}>
        <div className="cube-face face-1"><img src={getDiceImage(1)} alt="Face 1" /></div>
        <div className="cube-face face-2"><img src={getDiceImage(2)} alt="Face 2" /></div>
        <div className="cube-face face-3"><img src={getDiceImage(3)} alt="Face 3" /></div>
        <div className="cube-face face-4"><img src={getDiceImage(4)} alt="Face 4" /></div>
        <div className="cube-face face-5"><img src={getDiceImage(5)} alt="Face 5" /></div>
        <div className="cube-face face-6"><img src={getDiceImage(6)} alt="Face 6" /></div>
      </div>
      <div className="dice-shadow" ref={shadowRef} />
    </div>
  );
};

export default ThreeDDice;
