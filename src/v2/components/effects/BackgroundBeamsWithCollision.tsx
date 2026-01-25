import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

interface BackgroundBeamsWithCollisionProps {
  children: React.ReactNode;
  className?: string;
}

export const BackgroundBeamsWithCollision: React.FC<BackgroundBeamsWithCollisionProps> = ({
  children,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={parentRef}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        className
      )}
    >
      {/* Background beams container */}
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 overflow-hidden"
      >
        <Beams />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full h-full">{children}</div>
    </div>
  );
};

const Beams = () => {
  const beams = [
    {
      initialX: 10,
      translateX: 10,
      duration: 7,
      repeatDelay: 3,
      delay: 2,
    },
    {
      initialX: 600,
      translateX: 600,
      duration: 3,
      repeatDelay: 3,
      delay: 4,
    },
    {
      initialX: 100,
      translateX: 100,
      duration: 7,
      repeatDelay: 7,
      className: "h-6",
    },
    {
      initialX: 400,
      translateX: 400,
      duration: 5,
      repeatDelay: 14,
      delay: 4,
    },
    {
      initialX: 800,
      translateX: 800,
      duration: 11,
      repeatDelay: 2,
      className: "h-20",
    },
    {
      initialX: 1000,
      translateX: 1000,
      duration: 4,
      repeatDelay: 2,
      className: "h-12",
    },
    {
      initialX: 1200,
      translateX: 1200,
      duration: 6,
      repeatDelay: 4,
      delay: 2,
      className: "h-6",
    },
  ];

  return (
    <>
      {beams.map((beam, idx) => (
        <CollisionMechanism
          key={`beam-${idx}`}
          beamOptions={beam}
          containerRef={null}
          parentRef={null}
        />
      ))}
    </>
  );
};

const CollisionMechanism = React.forwardRef<
  HTMLDivElement,
  {
    containerRef: React.RefObject<HTMLDivElement> | null;
    parentRef: React.RefObject<HTMLDivElement> | null;
    beamOptions?: {
      initialX?: number;
      translateX?: number;
      initialY?: number;
      translateY?: number;
      rotate?: number;
      className?: string;
      duration?: number;
      delay?: number;
      repeatDelay?: number;
    };
  }
>(({ beamOptions = {} }) => {
  const beamRef = useRef<HTMLDivElement>(null);
  const [collision, setCollision] = useState({
    detected: false,
    coordinates: { x: 0, y: 0 },
  });
  const [beamKey, setBeamKey] = useState(0);
  const [cycleCollisionDetected, setCycleCollisionDetected] = useState(false);

  useEffect(() => {
    const checkCollision = () => {
      if (
        beamRef.current &&
        !cycleCollisionDetected
      ) {
        const beamRect = beamRef.current.getBoundingClientRect();
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        const distanceFromCenter = Math.sqrt(
          Math.pow(beamRect.left + beamRect.width / 2 - centerX, 2) +
          Math.pow(beamRect.top + beamRect.height / 2 - centerY, 2)
        );

        if (distanceFromCenter < 100) {
          setCollision({
            detected: true,
            coordinates: {
              x: beamRect.left + beamRect.width / 2,
              y: beamRect.top + beamRect.height / 2,
            },
          });
          setCycleCollisionDetected(true);
        }
      }
    };

    const animationInterval = setInterval(checkCollision, 50);
    return () => clearInterval(animationInterval);
  }, [cycleCollisionDetected]);

  useEffect(() => {
    if (collision.detected && cycleCollisionDetected) {
      setTimeout(() => {
        setCollision({ detected: false, coordinates: { x: 0, y: 0 } });
        setCycleCollisionDetected(false);
        setBeamKey((prevKey) => prevKey + 1);
      }, 2000);
    }
  }, [collision, cycleCollisionDetected]);

  return (
    <>
      <motion.div
        key={beamKey}
        ref={beamRef}
        animate="animate"
        initial={{
          translateY: beamOptions.initialY || "-200px",
          translateX: beamOptions.initialX || "0px",
          rotate: beamOptions.rotate || 0,
        }}
        variants={{
          animate: {
            translateY: beamOptions.translateY || "1800px",
            translateX: beamOptions.translateX || "0px",
            rotate: beamOptions.rotate || 0,
          },
        }}
        transition={{
          duration: beamOptions.duration || 8,
          repeat: Infinity,
          repeatType: "loop",
          ease: "linear",
          delay: beamOptions.delay || 0,
          repeatDelay: beamOptions.repeatDelay || 0,
        }}
        className={cn(
          "absolute left-0 top-20 m-auto h-14 w-px rounded-full bg-gradient-to-t from-cyan-400 via-emerald-500 to-transparent",
          beamOptions.className
        )}
      />
      {collision.detected && (
        <Explosion
          key={`${collision.coordinates.x}-${collision.coordinates.y}`}
          coordinates={collision.coordinates}
        />
      )}
    </>
  );
});

CollisionMechanism.displayName = "CollisionMechanism";

const Explosion = ({
  coordinates,
}: {
  coordinates: { x: number; y: number };
}) => {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    angle: (360 / 20) * i,
  }));

  return (
    <div
      className="absolute z-50"
      style={{
        left: `${coordinates.x}px`,
        top: `${coordinates.y}px`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{
              opacity: 1,
              x: 0,
              y: 0,
            }}
            animate={{
              opacity: 0,
              x: Math.cos((particle.angle * Math.PI) / 180) * 100,
              y: Math.sin((particle.angle * Math.PI) / 180) * 100,
            }}
            transition={{
              duration: 1.5,
              ease: "easeOut",
            }}
            className="absolute h-1 w-1 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-500"
          />
        ))}
        
        {/* Center glow */}
        <motion.div
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 3, opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/50 blur-xl"
        />
      </motion.div>
    </div>
  );
};
