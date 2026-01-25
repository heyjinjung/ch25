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
  const blurRef = useRef<HTMLDivElement>(null);
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
      const blur = blurRef.current;
      const shadow = shadowRef.current;
      
      if (!cube || !blur || !shadow) return;

      if (isRolling) {
         // === ROLLING STATE ===
         // Hide strict 3D cube, show Motion Blur Effect
         gsap.set(cube, { opacity: 0 });
         gsap.set(blur, { opacity: 1, scale: 0.8 });

         // Animate the blur sprite/texture to look like spinning
         // We simulate this by shaking and scaling the blur container
         gsap.to(blur, {
             rotation: "+=360", 
             duration: 0.4, 
             repeat: -1, 
             ease: "none" 
         });
         
         // Add "Shake" to the blur to feel chaotic
         gsap.to(blur, {
             x: "random(-10, 10)",
             y: "random(-10, 10)",
             duration: 0.1,
             repeat: -1,
             yoyo: true
         });

         // Shadow fades
         gsap.to(shadow, { scale: 0.5, opacity: 0.3, duration: 0.3 });

      } else {
         // === LANDING STATE ===
         // 1. Instant swap: Hide Blur, Show Cube
         gsap.set(blur, { opacity: 0 });
         gsap.set(cube, { opacity: 1 });

         const target = faceRotations[value] || { x: 0, y: 0 };
         
         // Start from a random "wild" angle to make the snap feel impactful
         gsap.set(cube, {
             rotationX: target.x + (Math.random() * 60 - 30), 
             rotationY: target.y + (Math.random() * 60 - 30),
             z: 100 // Slightly up
         });

         const landTl = gsap.timeline();

         // 2. Slam down and snap to face
         landTl.to(cube, {
             rotationX: target.x,
             rotationY: target.y,
             rotationZ: 0,
             z: 0,
             duration: 0.5,
             ease: "back.out(1.7)", // Heavy impact
         });

         // 3. Shadow restores with impact
         landTl.to(shadow, {
             scale: 1,
             opacity: 0.6,
             duration: 0.3,
             ease: "power2.out"
         }, 0);
      }
    });

    return () => {
       if (contextRef.current) contextRef.current.revert();
    };
  }, [isRolling, value]);

  return (
    <div className="scene" style={{ "--dice-size": `${size}px` } as React.CSSProperties}>
      {/* 3D Cube for Result */}
      <div className="cube" ref={cubeRef}>
        <div className="cube-face face-1"><img src={getDiceImage(1)} alt="1" /></div>
        <div className="cube-face face-2"><img src={getDiceImage(2)} alt="2" /></div>
        <div className="cube-face face-3"><img src={getDiceImage(3)} alt="3" /></div>
        <div className="cube-face face-4"><img src={getDiceImage(4)} alt="4" /></div>
        <div className="cube-face face-5"><img src={getDiceImage(5)} alt="5" /></div>
        <div className="cube-face face-6"><img src={getDiceImage(6)} alt="6" /></div>
      </div>

      {/* Motion Blur Placeholder (Visible only during rolling) */}
      <div className="dice-blur" ref={blurRef}>
        <img src={getDiceImage(1)} className="blur-img" alt="rolling" />
        <div className="blur-overlay" />
      </div>

      <div className="dice-shadow" ref={shadowRef} />
    </div>
  );
};

export default ThreeDDice;
