import { motion } from "framer-motion";
import { useMemo } from "react";
import { cn } from "../../lib/utils";

interface BackgroundPathsProps {
  className?: string;
  count?: number;
}

export const BackgroundPaths = ({ className, count = 12 }: BackgroundPathsProps) => {
  const paths = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      d: `M${Math.random() * 100} ${100 + Math.random() * 20} Q${
        Math.random() * 100
      } ${Math.random() * 50} ${Math.random() * 100} ${-20 - Math.random() * 20}`,
      duration: 10 + Math.random() * 20,
      delay: Math.random() * -20,
      opacity: 0.1 + Math.random() * 0.2,
      strokeWidth: 0.5 + Math.random() * 1.5,
    }));
  }, [count]);

  return (
    <div
      className={cn(
        "fixed inset-0 pointer-events-none overflow-hidden z-[-1]",
        className
      )}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full opacity-60"
      >
        <defs>
          <linearGradient id="path-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0)" />
            <stop offset="50%" stopColor="rgba(16, 185, 129, 0.4)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
          </linearGradient>
        </defs>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="url(#path-gradient)"
            strokeWidth={path.strokeWidth}
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: [0, 1, 0],
              opacity: [0, path.opacity, 0],
              transition: {
                duration: path.duration,
                repeat: Infinity,
                delay: path.delay,
                ease: "linear",
              },
            }}
          />
        ))}
      </svg>
    </div>
  );
};
