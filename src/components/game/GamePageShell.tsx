import clsx from "clsx";
import React from "react";
import { useSound } from "../../hooks/useSound";

type Props = {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
  footerNote?: string;
  px?: string;
  py?: string;
  disableMainBgm?: boolean;
};

const GamePageShell: React.FC<Props> = ({ children, footerNote, px = "p-4 sm:p-8", py, disableMainBgm }) => {
  const containerPadding = py ? `${px} ${py}` : px;
  const { startMainBgm, playEnterGame } = useSound();

  // Attempt to start BGM and play Enter sound on mount
  React.useEffect(() => {
    if (!disableMainBgm) {
      startMainBgm();
    }
    // Use a small timeout to ensure interaction overlap or just fire it
    setTimeout(() => playEnterGame(), 100);
  }, [startMainBgm, playEnterGame, disableMainBgm]);

  return (
    <div className="relative w-full text-white">
      <div className="mx-auto w-full max-w-[1040px]">
        <section className={clsx("relative overflow-hidden rounded-3xl border border-white/15 bg-black/40 shadow-2xl", containerPadding)}>

          {children}
        </section>

        {footerNote && (
          <footer className="mx-auto mt-6 max-w-[920px] text-center text-[clamp(11px,2.2vw,13px)] text-white/60">
            {footerNote}
          </footer>
        )}
      </div>
    </div>
  );
};

export default GamePageShell;
