import React from "react";
import { motion } from "framer-motion";
import { X, Bell } from "lucide-react";

interface LimitedOfferModalProps {
    onClose: () => void;
}

const LimitedOfferModal: React.FC<LimitedOfferModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
            <div
                className="absolute inset-0"
                onClick={onClose}
            />

            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl"
            >
                {/* Background Image Layer */}
                <div className="absolute inset-0 z-0">
                    <img 
                        src="/assets/modals/bg_limited_offer.jpg" 
                        onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?q=80&w=1000&auto=format&fit=crop";
                        }}
                        className="w-full h-full object-cover opacity-60"
                        alt="Background"
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/95 mix-blend-multiply" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/50 to-transparent" />
                </div>

                {/* Animated Particles/Effects */}
                <div className="absolute inset-0 z-0 opacity-30">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] animate-pulse" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />
                </div>

                {/* Content Container */}
                <div className="relative z-10 p-1">
                    <div className="relative rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl p-6 overflow-hidden">
                        
                        {/* Status Badge */}
                        <div className="flex justify-between items-start mb-8">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-md shadow-lg">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                                <span className="text-[11px] font-black text-white tracking-wide uppercase">Limited Edition</span>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 -mt-2 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Main Visual */}
                        <div className="flex flex-col items-center text-center mb-8">
                            <div className="relative mb-6 group">
                                <div className="absolute inset-0 bg-gradient-to-b from-purple-500/20 to-blue-500/20 rounded-3xl blur-2xl transform group-hover:scale-110 transition-transform duration-700" />
                                <motion.div 
                                    className="relative w-32 h-32 flex items-center justify-center"
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                >
                                    <div className="absolute inset-0 bg-[url('/assets/icons/gift-dynamic-color.png')] bg-contain bg-center bg-no-repeat drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]" 
                                         style={{ backgroundImage: "url('/assets/icons/gift-dynamic-color.png')" }} />
                                    {/* Fallback Icon */}
                                    <Bell size={64} className="text-white/20 absolute inset-0 m-auto" style={{ opacity: 0.1 }} /> 
                                </motion.div>
                            </div>

                            <h2 className="text-3xl font-black text-white tracking-tight mb-3">
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-white to-blue-300">특별 패키지</span>
                                <span className="block mt-1">준비중입니다</span>
                            </h2>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-[240px]">
                                오직 당신만을 위한 한정판 혜택,<br/>
                                더 강력해진 구성으로 곧 찾아옵니다.
                            </p>
                        </div>

                        {/* Disabled Action Area */}
                        <div className="space-y-3">
                            <button
                                disabled
                                className="w-full py-4 rounded-xl bg-slate-800/50 border border-white/5 text-slate-400 font-bold text-base flex items-center justify-center gap-2 cursor-not-allowed group transition-all"
                            >
                                <span className="w-2 h-2 rounded-full bg-slate-600 group-disabled:opacity-50" />
                                Coming Soon
                            </button>
                            
                            <p className="text-center text-[11px] text-slate-500 font-medium">
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
