import clsx from "clsx";
import React from "react";
import { useSound } from "../../hooks/useSound";
import LiveFeedTicker from "../common/LiveFeedTicker";

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
  const { startMainBgm, stopBgm, playEnterGame } = useSound();

  React.useEffect(() => {
    if (!disableMainBgm) return;
    stopBgm();
    return () => {
      startMainBgm();
    };
  }, [disableMainBgm, startMainBgm, stopBgm]);

  // Play Enter sound on mount
  React.useEffect(() => {
    const t = setTimeout(() => playEnterGame(), 100);
    return () => clearTimeout(t);
  }, [playEnterGame]);

  return (
    <div className="relative w-full text-white">
      <div className="mx-auto w-full max-w-[1040px]">
        {/* Live Feed Ticker - Top of Game Zone */}
        <div className="mb-4 flex justify-center">
          <LiveFeedTicker />
        </div>

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
