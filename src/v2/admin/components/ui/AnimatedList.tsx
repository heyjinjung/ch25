import React, { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "../../../lib/utils";

interface AnimatedListProps {
  className?: string;
  children: ReactNode;
}

export const AnimatedList = ({ className, children }: AnimatedListProps) => {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <AnimatePresence initial={false}>
        {React.Children.map(children, (child) => (
          <AnimatedListItem key={(child as any).key}>
            {child}
          </AnimatedListItem>
        ))}
      </AnimatePresence>
    </div>
  );
};

export function AnimatedListItem({ children }: { children: ReactNode }) {
  return (
    <motion.div
      layout
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 25, duration: 0.3 }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
