import { useEffect, useState } from "react";
import { cn } from "../../lib/utils";

const CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";

interface EncryptedTextProps {
  text: string;
  className?: string;
  interval?: number;
  loop?: boolean;
}

export const EncryptedText = ({
  text,
  className,
  interval = 50,
  loop = false,
}: EncryptedTextProps) => {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    let iteration = 0;
    const startEncryption = () => {
      iteration = 0;
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
          if (loop) {
            setTimeout(startEncryption, 2000); // 2 second pause before restart
          }
        }

        iteration += 1 / 3;
      }, interval);
      return timer;
    };

    const timer = startEncryption();

    return () => clearInterval(timer);
  }, [text, interval, loop]);

  return <span className={cn(className)}>{displayText}</span>;
};
