import React from "react";
import { X, Zap, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LimitedOfferModalProps {
    onClose: () => void;
}

const LimitedOfferModal: React.FC<LimitedOfferModalProps> = ({ onClose }) => {
    const navigate = useNavigate();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fadeIn">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Content */}
            <div className="relative w-full max-w-sm bg-zinc-900 border border-indigo-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-900/40 scale-100 animate-scaleIn">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full bg-black/40 text-white/70 hover:bg-black/60 hover:text-white transition-colors z-10"
                >
                    <X size={20} />
                </button>

                {/* Hero Section */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-800 p-8 flex flex-col items-center text-center pt-12 pb-10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('/assets/pattern_noise.png')] opacity-20 mix-blend-overlay" />

                    <div className="absolute top-4 left-4 px-2 py-1 bg-red-500/90 text-white text-[10px] font-black rounded-md animate-pulse">
                        LIMITED TIME
                    </div>

                    <div className="p-4 rounded-full bg-white/10 mb-4 backdrop-blur-md border border-white/20 shadow-lg shadow-indigo-900/50">
                        <Zap size={48} className="text-yellow-300 drop-shadow-md" />
                    </div>

                    <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2 drop-shadow-lg">
                        Special Offer
                    </h2>
                    <p className="text-indigo-100 font-medium leading-relaxed max-w-[200px]">
                        지금만 만날 수 있는<br />한정판 패키지 출시!
                    </p>
                </div>

                {/* Action Section */}
                <div className="p-6 bg-zinc-900 space-y-4">
                    <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center gap-2">
                        <Clock size={16} className="text-indigo-400" />
                        <span className="text-sm font-bold text-indigo-300">남은 시간: 23:59:59</span>
                    </div>

                    <button
                        onClick={() => {
                            navigate("/inventory"); // Or shop path
                            onClose();
                        }}
                        className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-black text-lg shadow-lg shadow-indigo-900/50 active:scale-95 transition-all"
                    >
                        상품 보러가기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LimitedOfferModal;
