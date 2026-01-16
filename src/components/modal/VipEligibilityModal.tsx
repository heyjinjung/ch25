import React from "react";
import { X, Crown, Zap, ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface VipEligibilityModalProps {
    onClose: () => void;
}

const VipEligibilityModal: React.FC<VipEligibilityModalProps> = ({ onClose }) => {
    const navigate = useNavigate();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn overflow-y-auto">
            {/* Background Textures */}
            <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" />

            {/* Modal Container */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative w-full max-w-[360px] max-h-[90vh] my-auto bg-zinc-950 border border-amber-500/30 rounded-[32px] overflow-y-auto shadow-[0_32px_64px_-16px_rgba(245,158,11,0.2)]"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all"
                    title="닫기"
                >
                    <X size={18} />
                </button>

                {/* Hero Header */}
                <div className="relative pt-12 pb-6 px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
                        <Crown size={12} className="text-amber-400" />
                        <span className="text-[10px] font-black text-amber-500 tracking-widest uppercase">VIP ELIGIBILITY</span>
                    </div>

                    <h2 className="text-[26px] font-black text-white leading-[1.1] tracking-tight mb-3 italic">
                        BECOME A <span className="text-amber-500">WHALE</span>
                    </h2>
                    <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                        상위 1%에게만 허락된<br />특별한 VIP 혜택을 누리세요.
                    </p>
                </div>

                {/* Qualification Cards */}
                <div className="px-6 space-y-3 mb-8">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 group hover:border-amber-500/30 transition-all">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                                <Zap size={20} className="text-amber-500" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[11px] font-bold text-zinc-500 mb-0.5 whitespace-nowrap uppercase">Condition 01</div>
                                <div className="text-white font-black text-base italic leading-tight">
                                    첫 입금 50만원 이상
                                </div>
                                <div className="text-[10px] text-zinc-600 font-bold mt-1">즉시 VIP 골드 테마 적용</div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 group hover:border-amber-500/30 transition-all">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                                <ShieldCheck size={20} className="text-orange-500" />
                            </div>
                            <div className="flex-1">
                                <div className="text-[11px] font-bold text-zinc-500 mb-0.5 whitespace-nowrap uppercase">Condition 02</div>
                                <div className="text-white font-black text-base italic leading-tight">
                                    7일 누적 300만원 이상
                                </div>
                                <div className="text-[10px] text-zinc-600 font-bold mt-1">특별 리워드 및 전담 케어</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="px-6 pb-8">
                    <button
                        onClick={() => {
                            navigate("/vault");
                            onClose();
                        }}
                        className="w-full py-4.5 rounded-[20px] bg-gradient-to-r from-amber-500 to-orange-600 text-black font-black text-lg shadow-[0_12px_24px_-8px_rgba(245,158,11,0.4)] active:scale-[0.97] hover:brightness-110 flex items-center justify-center gap-2 group transition-all"
                    >
                        <span>입금하고 자격 획득하기</span>
                        <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>

                    <p className="text-center mt-4 text-[11px] font-bold text-zinc-600">
                        * VIP 달성 시 고퀄리티 골드 테마가 즉시 적용됩니다.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default VipEligibilityModal;
