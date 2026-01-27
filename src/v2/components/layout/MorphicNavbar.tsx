import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

interface MorphicNavbarProps {
  items: { id: string; label: string; emoji?: string }[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const MorphicNavbar: React.FC<MorphicNavbarProps> = ({
  items,
  activeId,
  onChange,
  className,
}) => {
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex items-center p-1.5 bg-zinc-900/50 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden",
        className
      )}
    >
      {/* Morphing Highlight */}
      {rect && (
        <motion.div
          className="absolute bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
          initial={false}
          animate={{
            left: rect.left,
            width: rect.width,
            height: rect.height,
            top: rect.top,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 35,
          }}
        />
      )}

      {items.map((item) => (
        <NavItem
          key={item.id}
          item={item}
          containerRef={containerRef}
          isActive={activeId === item.id}
          onActive={(r) => activeId === item.id && setRect(r)}
          onClick={() => onChange(item.id)}
        />
      ))}
    </div>
  );
};

interface NavItemProps {
  item: { id: string; label: string; emoji?: string };
  containerRef: React.RefObject<HTMLDivElement>;
  isActive: boolean;
  onActive: (rect: { left: number; top: number; width: number; height: number }) => void;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ item, containerRef, isActive, onActive, onClick }) => {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isActive && ref.current && containerRef.current) {
      const parentRect = containerRef.current.getBoundingClientRect();
      const itemRect = ref.current.getBoundingClientRect();
      onActive({
        left: itemRect.left - parentRect.left,
        top: itemRect.top - parentRect.top,
        width: itemRect.width,
        height: itemRect.height,
      });
    }
  }, [isActive, onActive, containerRef]);

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        "relative z-10 flex items-center gap-2 px-4 py-2 text-sm font-bold transition-colors duration-300",
        isActive ? "text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {item.emoji && <span className="opacity-80">{item.emoji}</span>}
      {item.label}
    </button>
  );
};
