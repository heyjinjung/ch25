import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface LimitedOfferModalProps {
    onClose: () => void;
}

const LimitedOfferModal: React.FC<LimitedOfferModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div
                className="absolute inset-0"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl mb-4 sm:mb-0"
            >
                {/* Background Image Layer */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[#121212]" />
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10" />

                    {/* Background Bell (Faint) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] scale-150 pointer-events-none">
                        <img src="/assets/icon_alarm_normal.png" alt="" className="w-64 h-64 object-contain" />
                    </div>
                </div>

                {/* Content Container */}
                <div className="relative z-10 p-1">
                    <div className="relative rounded-[28px] border border-white/5 bg-white/[0.02] backdrop-blur-xl px-6 py-8 overflow-hidden">

                        {/* Limited Badge */}
                        <div className="absolute top-6 left-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                            </span>
                            <span className="text-[10px] font-black text-white/90 tracking-wide uppercase">LIMITED EDITION</span>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-1 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                            aria-label="닫기"
                        >
                            <X size={20} />
                        </button>

                        {/* Main Visual */}
                        <div className="flex flex-col items-center text-center mt-6">
                            <motion.div
                                className="relative w-32 h-32 mb-4"
                                animate={{ y: [0, -6, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <img
                                    src="/assets/icon_alarm_normal.png"
                                    alt="Notification Bell"
                                    className="w-full h-full object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                                />

                                {/* Glow effect behind bell */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-purple-500/30 rounded-full blur-[40px] -z-10" />
                            </motion.div>

                            <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-white to-purple-200">특별 패키지</span>
                                <br />
                                <span>준비중입니다</span>
                            </h2>
                            <p className="text-white/40 text-sm font-medium leading-relaxed max-w-[240px] mb-8">
                                오직 당신만을 위한 한정판 혜택,<br />
                                더 강력해진 구성으로 곧 찾아옵니다.
                            </p>
                        </div>

                        {/* Disabled Action Area */}
                        <div className="space-y-3">
                            <button
                                disabled
                                className="w-full py-3.5 rounded-xl bg-white/5 border border-white/5 text-white/30 font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                                Coming Soon
                            </button>

                            <p className="text-center text-[10px] text-white/20 font-medium">
                                ※ 알림 신청 기능 준비중
                            </p>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default LimitedOfferModal;
