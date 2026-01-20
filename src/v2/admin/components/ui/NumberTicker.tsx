
import React, { useEffect, useState } from "react";
import { animate } from "framer-motion";
import { cn } from "../../../lib/utils";

export const NumberTicker = ({
  value,
  className,
  delay = 0,
}: {
  value: number;
  className?: string;
  delay?: number;
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 1,
      delay,
      onUpdate(latest) {
        setDisplayValue(Math.floor(latest));
      },
    });
    return () => controls.stop();
  }, [value, delay]);

  return (
    <span className={cn("inline-block tabular-nums", className)}>
      {displayValue.toLocaleString()}
    </span>
  );
};
