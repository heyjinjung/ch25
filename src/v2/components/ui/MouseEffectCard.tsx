import React from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { cn } from "../../lib/utils";

interface MouseEffectCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const MouseEffectCard: React.FC<MouseEffectCardProps> = ({
  children,
  className,
  onClick,
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={cn(
        "relative rounded-3xl bg-zinc-900 border border-white/10 transition-colors hover:bg-zinc-800/80 cursor-pointer overflow-hidden",
        className
      )}
    >
      <div
        style={{
          transform: "translateZ(50px)",
          transformStyle: "preserve-3d",
        }}
        className="w-full h-full"
      >
        {children}
      </div>
      
      {/* Dynamic Shine/Spotlight */}
      <motion.div
        className="absolute inset-0 z-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100"
        style={{
            background: useTransform(
              [mouseXSpring, mouseYSpring],
              ([xVal, yVal]) => `radial-gradient(circle at ${50 + (xVal as number) * 100}% ${50 + (yVal as number) * 100}%, rgba(16,185,129,0.15), transparent 80%)`
            )
        }}
      />
    </motion.div>
  );
};
