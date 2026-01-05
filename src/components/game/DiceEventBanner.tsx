import React from "react";
import { Zap, Lock, Info } from "lucide-react";

interface DiceEventBannerProps {
    active: boolean;
    progress?: number;
    max?: number;
    ineligibleReason?: string;
}

const DiceEventBanner: React.FC<DiceEventBannerProps> = ({ active, progress, max, ineligibleReason }) => {
    // If not active and no reason (or event disabled), hide entirely
    if (!active && (!ineligibleReason || ineligibleReason === "EVENT_DISABLED")) return null;

    if (!active) {
        const getReasonText = () => {
            switch (ineligibleReason) {
                case "LOW_DEPOSIT": return "오늘 30만원 이상 입금 시 참여 가능";
                case "NO_STAKE": return "금고에 자산(Stake)이 있어야 참여 가능";
                case "CAP_REACHED": return "오늘의 이벤트 참여 횟수 소진 (30/30)";
                case "BLOCKLISTED": return "이벤트 참여 제한 대상입니다";
                default: return "현재 이벤트 참여 조건 미달";
            }
        };

        return (
            <div className="relative mb-6 overflow-hidden rounded-xl bg-white/5 border border-white/10 p-[1px]">
                <div className="relative flex items-center gap-3 bg-black/40 px-4 py-3 backdrop-blur-md">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-white/40">
                        <Lock className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-[10px] font-black tracking-widest text-white/30 uppercase">
                            PEAK TIME EVENT
                        </h3>
                        <p className="text-xs font-bold text-white/60">
                            {getReasonText()}
                        </p>
                    </div>
                    <Info className="h-4 w-4 text-white/20" />
                </div>
            </div>
        );
    }

    return (
        <div className="relative mb-6 overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 p-[1px]">
            <div className="relative flex items-center justify-between overflow-hidden rounded-[11px] bg-black/60 px-4 py-3 backdrop-blur-md">

                {/* Animated Background Glow */}
                <div className="absolute inset-0 animate-pulse-slow bg-amber-500/10" />

                <div className="relative flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]">
                        <Zap className="h-6 w-6 fill-current animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black italic tracking-wider text-white uppercase drop-shadow-md">
                            PEAK TIME EVENT
                        </h3>
                        <p className="text-xs font-bold text-amber-400">
                            Win up to 7,777 Points!
                        </p>
                    </div>
                </div>

                <div className="relative flex flex-col items-end gap-1">
                    <div className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1">
                        <span className="text-[10px] font-bold text-amber-300 animate-pulse">
                            LIVE NOW
                        </span>
                    </div>
                    {max !== undefined && progress !== undefined && (
                        <span className="text-[10px] font-mono font-bold text-white/50">
                            {progress} / {max}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DiceEventBanner;
