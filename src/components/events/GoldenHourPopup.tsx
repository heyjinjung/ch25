import React, { useEffect, useState } from "react";
import { X, Zap, Trophy, Timer } from "lucide-react";
import clsx from "clsx";

interface GoldenHourPopupProps {
    isOpen: boolean;
    onClose: () => void;
    multiplier: number;
    remainingSeconds: number;
}

const GoldenHourPopup: React.FC<GoldenHourPopupProps> = ({
    isOpen,
    onClose,
    multiplier,
    remainingSeconds,
}) => {
    const [shouldRender, setShouldRender] = useState(isOpen);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
        }
    }, [isOpen]);

    if (!shouldRender) return null;

    return (
        <div
            className={clsx(
                "fixed inset-0 z-[100] flex items-center justify-center px-6 transition-all duration-500",
                isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
            onTransitionEnd={() => !isOpen && setShouldRender(false)}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

            {/* Content Card */}
            <div className="relative w-full max-w-sm rounded-[2rem] border border-emerald-500/30 bg-slate-900 shadow-2xl shadow-emerald-500/20 overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Glow Effect */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/20 blur-[80px] rounded-full" />
                <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/20 blur-[80px] rounded-full" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* Header Section */}
                <div className="relative pt-12 pb-8 px-6 flex flex-col items-center text-center">
                    <div className="mb-6 relative">
                        <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse" />
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center p-0.5 shadow-lg shadow-emerald-500/20">
                            <div className="w-full h-full rounded-[14px] bg-slate-900 flex items-center justify-center">
                                <Zap className="w-10 h-10 text-emerald-400 animate-bounce" />
                            </div>
                        </div>
                    </div>

                    <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                        🌙 골든 아워 시작!
                    </h2>
                    <p className="text-emerald-400 font-bold mb-4">
                        GOLDEN HOUR ACTIVE
                    </p>

                    <div className="w-full space-y-3">
                        {/* Multiplier Badge */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-emerald-500/20">
                                    <Trophy size={18} className="text-emerald-400" />
                                </div>
                                <span className="text-sm font-bold text-white/70">금고적립 혜택</span>
                            </div>
                            <span className="text-xl font-black text-emerald-400">{multiplier.toFixed(1)}x Boost</span>
                        </div>

                        {/* Note */}
                        <p className="text-[11px] text-white/40 leading-relaxed px-2">
                            * 기본게임 금고적립 조건이 200원인 게임들만 <br />
                            자동으로 {multiplier.toFixed(1)}배 적립이 적용됩니다.
                        </p>
                    </div>
                </div>

                {/* Action Section */}
                <div className="px-6 pb-8 space-y-3">
                    <button
                        onClick={onClose}
                        className="w-full h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-black text-lg shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all"
                    >
                        지금 바로 플레이
                    </button>

                    <div className="flex items-center justify-center gap-2 text-white/30">
                        <Timer size={14} />
                        <span className="text-xs font-bold uppercase tracking-wider">
                            {remainingSeconds > 0 ? "종료까지 1시간 미만" : "곧 종료됩니다"}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GoldenHourPopup;
