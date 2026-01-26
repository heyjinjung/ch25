import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";

interface EncryptedTextProps {
  text: string;
  className?: string;
  interval?: number;
}

export const EncryptedText = ({
  text,
  className,
  interval = 50,
}: EncryptedTextProps) => {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    let iteration = 0;
    const timer = setInterval(() => {
      setDisplayText(() =>
        text
          .split("")
          .map((_, index) => {
            if (index < iteration) {
              return text[index];
            }
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join(""),
      );

      if (iteration >= text.length) {
        clearInterval(timer);
      }

      iteration += 1 / 3;
    }, interval);

    return () => clearInterval(timer);
  }, [text, interval]);

  return <span className={cn(className)}>{displayText}</span>;
};
