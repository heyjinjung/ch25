import React, { useEffect, useState, useCallback } from "react";
import { cn } from "../../lib/utils";

interface MatrixTextProps {
  text: string;
  className?: string;
  onHover?: boolean;
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890@#$%^&*()_+";

export const MatrixText: React.FC<MatrixTextProps> = ({
  text,
  className,
  onHover = false,
}) => {
  const [displayText, setDisplayText] = useState(text);

  const scramble = useCallback(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(() =>
        text
          .split("")
          .map((char, index) => {
            if (index < iteration) {
              return text[index];
            }
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("")
      );

      if (iteration >= text.length) {
        clearInterval(interval);
      }

      iteration += 1 / 3;
    }, 30);
  }, [text]);

  useEffect(() => {
    if (!onHover) {
      scramble();
    }
  }, [onHover, scramble]);

  return (
    <span
      className={cn("font-mono", className)}
      onMouseEnter={onHover ? scramble : undefined}
    >
      {displayText}
    </span>
  );
};
