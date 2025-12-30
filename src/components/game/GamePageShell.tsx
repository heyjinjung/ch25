import clsx from "clsx";
import React from "react";
import { useSound } from "../../hooks/useSound";
import { Volume2, VolumeX } from "lucide-react";

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

const GamePageShell: React.FC<Props> = ({ title, subtitle, rightSlot, children, footerNote, px = "p-4 sm:p-8", py, disableMainBgm }) => {
  const containerPadding = py ? `${px} ${py}` : px;
  const { isMuted, toggleMute, playClick, startMainBgm, playEnterGame } = useSound();

  const handleToggleMute = () => {
    playClick(); // Feedback even if muting (or unmuting)
    if (isMuted && !disableMainBgm) {
      startMainBgm(); // Ensure BGM restarts/resumes when unmuting
    }
    toggleMute();
  };

  // Attempt to start BGM and play Enter sound on mount
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
        {rightSlot ? <div className="mb-6 flex items-center justify-end gap-3">{rightSlot}</div> : null}

        <header className="relative overflow-hidden rounded-3xl border border-white/20 bg-[#0F0E0E] px-4 py-8 sm:px-8 shadow-2xl">
          <button
            onClick={handleToggleMute}
            className="absolute top-4 right-4 z-20 rounded-full bg-white/5 p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#30FF75]/50 to-transparent" />
          {subtitle && (
            <p className="text-center text-[clamp(12px,2.6vw,14px)] font-bold uppercase tracking-[0.35em] text-[#30FF75]">
              {subtitle}
            </p>
          )}
          <h1 className="mt-3 text-center text-[clamp(22px,5.2vw,38px)] font-black leading-tight text-white tracking-tighter">
            {title}
          </h1>
          <div className="mx-auto mt-5 h-px w-full max-w-[720px] bg-white/10" />
        </header>

        <section className={clsx("relative mt-6 overflow-hidden rounded-3xl border border-white/15 bg-black/40 shadow-2xl", containerPadding)}>
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
