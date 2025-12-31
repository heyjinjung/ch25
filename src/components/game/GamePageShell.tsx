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

const GamePageShell: React.FC<Props> = ({ children, footerNote, px = "p-4 sm:p-8", py, disableMainBgm }) => {
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
          {/* Sound Toggle Button */}
          <button
            onClick={handleToggleMute}
            className="absolute top-4 right-4 z-20 rounded-full bg-white/5 p-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
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
