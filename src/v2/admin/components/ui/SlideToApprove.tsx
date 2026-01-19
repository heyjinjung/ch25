import React, { useState } from "react";
import { motion, useMotionValue, useTransform, useAnimation } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "../../../lib/utils";

interface SlideToApproveProps {
  onApprove: () => Promise<void>;
  className?: string;
  text?: string;
  successText?: string;
  disabled?: boolean;
}

export function SlideToApprove({
  onApprove,
  className,
  text = "Slide to Approve",
  successText = "Approved",
  disabled = false,
}: SlideToApproveProps) {
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const x = useMotionValue(0);
  const controls = useAnimation();
  const containerRef = React.useRef<HTMLDivElement>(null);

  const opacity = useTransform(x, [0, 200], [1, 0]);
  const processApproval = async () => {
    try {
      setIsLoading(true);
      await onApprove();
      setIsApproved(true);
      setIsLoading(false);
    } catch {
      // Reset on fail
      setIsLoading(false);
      x.set(0);
      controls.start({ x: 0 });
    }
  };

  const handleDragEnd = async () => {
    if (!containerRef.current) return;
    const width = containerRef.current.offsetWidth;
    const threshold = width - 56; // approximate thumb width

    if (x.get() > threshold - 20) {
      // Snap to end
      controls.start({ x: threshold });
      await processApproval();
    } else {
      // Snap back
      controls.start({ x: 0 });
    }
  };

  if (isApproved) {
    return (
      <div
        className={cn(
          "flex h-12 w-full items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-500 border border-emerald-500/50 font-medium",
          className
        )}
      >
        <Check className="mr-2 h-5 w-5" />
        {successText}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex h-12 w-full items-center rounded-lg bg-zinc-900 border border-white/10 p-1 overflow-hidden select-none",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      <motion.div
        style={{ opacity }}
        className="absolute inset-0 flex items-center justify-center text-sm font-medium text-zinc-500"
      >
        {text}
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: containerRef.current ? containerRef.current.offsetWidth - 56 : 200 }}
        dragElastic={0.05}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="relative flex h-10 w-12 cursor-grab items-center justify-center rounded-md bg-[#D2FD9C] text-black shadow-md active:cursor-grabbing hover:bg-[#bbfb6c] transition-colors"
      >
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
        ) : (
          <ChevronRight className="h-5 w-5" />
        )}
      </motion.div>
    </div>
  );
}
