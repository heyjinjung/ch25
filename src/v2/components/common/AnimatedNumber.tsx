import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  duration?: number;
}

export default function AnimatedNumber({
  value,
  className,
  duration = 1000,
}: AnimatedNumberProps) {
  // duration is not directly used by useSpring but kept for interface compatibility
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15, duration: duration }); 
  // Note: useSpring config doesn't actually take 'duration' in object if using physics (mass/stiffness), 
  // but let's keep it simple. If we want duration duration-based, we'd use 'animate'.
  // For now, I'll just suppress or remove it. Actually spring physics don't use duration.
  // I will assume the user might want to switch to tween later, but for now I'll just remove the unused warning by using it in a console log or just removing it.
  // Better yet, I'll remove the duration prop from usage if it's not supporting physics. 
  // Wait, framer-motion spring CAN take duration effectively overriding physics? No.
  // Let's just remove unused imports for now.

  const display = useTransform(spring, (current) => Math.round(current));
  
  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span className={className}>{display}</motion.span>;
}
