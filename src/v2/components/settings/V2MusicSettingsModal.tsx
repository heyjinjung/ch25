
import React from "react";
import { useV2UIStore } from "../../store/useV2UIStore";
import { useSound } from "../../../hooks/useSound";
import { useSoundContext } from "../../../contexts/SoundContext";
import { X, Volume2, VolumeX, Music, Zap } from "lucide-react";
import clsx from "clsx";


const V2MusicSettingsModal: React.FC = () => {
  const { isMusicSettingsOpen, closeMusicSettings } = useV2UIStore();
  const { isMuted, toggleMute } = useSound();
  const { bgmVolume, setBgmVolume, sfxVolume, setSfxVolume } = useSoundContext();

  if (!isMusicSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeMusicSettings}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-sm bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Music className="w-5 h-5 text-[#25AD82]" />
            사운드 설정
          </h2>
          <button 
            onClick={closeMusicSettings}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Master Mute */}
        <div className="flex items-center justify-between mb-8 p-4 rounded-xl bg-white/5 border border-white/5 text-center">
            <div className="flex items-center gap-3">
                <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", isMuted ? "bg-red-500/20 text-red-400" : "bg-[#25AD82]/20 text-[#25AD82]")}>
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </div>
                <div className="text-left">
                    <div className="text-sm font-bold text-white">음소거</div>
                    <div className="text-xs text-white/50">{isMuted ? "소리가 꺼져있습니다" : "소리가 켜져있습니다"}</div>
                </div>
            </div>
            <button
                onClick={() => toggleMute()}
                className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-colors",
                    isMuted ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#25AD82] text-white hover:bg-[#25AD82]/90"
                )}
            >
                {isMuted ? "켜기" : "끄기"}
            </button>
        </div>

        {/* Sliders */}
        <div className="space-y-6">
            {/* BGM Slider */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-white/70 flex items-center gap-2">
                        <Music size={14} /> 배경음악
                    </span>
                    <span className="text-[#25AD82] font-mono">{Math.round(bgmVolume * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={bgmVolume}
                    onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#25AD82]"
                    disabled={isMuted}
                />
            </div>

            {/* SFX Slider */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-white/70 flex items-center gap-2">
                        <Zap size={14} /> 효과음
                    </span>
                    <span className="text-[#25AD82] font-mono">{Math.round(sfxVolume * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={sfxVolume}
                    onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#25AD82]"
                    disabled={isMuted}
                />
            </div>
        </div>
      </div>
    </div>
  );
};

export default V2MusicSettingsModal;
