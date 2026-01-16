import React from "react";
import { X, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SeasonPassPromoModalProps {
    onClose: () => void;
}

const SeasonPassPromoModal: React.FC<SeasonPassPromoModalProps> = ({ onClose }) => {
    const navigate = useNavigate();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Content */}
            <div className="relative w-full max-w-sm bg-zinc-900 border border-amber-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-amber-900/40 scale-100 animate-scaleIn">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* Hero Section */}
                <div className="bg-gradient-to-br from-amber-600 to-amber-800 p-8 flex flex-col items-center text-center pt-12 pb-10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/[0.02] mix-blend-overlay" />

                    <div className="p-4 rounded-full bg-white/10 mb-4 backdrop-blur-md border border-white/20 shadow-lg shadow-amber-900/50">
                        <Crown size={48} className="text-white drop-shadow-md" />
                    </div>

                    <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2 drop-shadow-lg">
                        Season Pass
                    </h2>
                    <p className="text-amber-100 font-medium leading-relaxed max-w-[200px]">
                        지금 시즌패스로 업그레이드하고<br />특별한 혜택을 누리세요!
                    </p>
                </div>

                {/* Action Section */}
                <div className="p-6 bg-zinc-900 space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-xl">💎</span>
                            <span className="text-sm text-zinc-300">매일 지급되는 <b className="text-white">다이아몬드 키</b></span>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-xl">🚀</span>
                            <span className="text-sm text-zinc-300">최대 <b className="text-white">3배 빠른</b> 레벨 업</span>
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            navigate("/vault"); // Assuming vault/store path
                            onClose();
                        }}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-lg shadow-lg shadow-amber-900/50 active:scale-95 transition-all"
                    >
                        지금 확인하기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SeasonPassPromoModal;
