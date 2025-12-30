import React, { useEffect } from "react";
import AnimatedNumber from "../common/AnimatedNumber";

type Props = {
    open: boolean;
    onClose: () => void;
    amount: number;
};

/**
 * Compact, auto-dismissing vault accrual toast notification.
 * Designed to be less intrusive for Korean users (20-60 male demographic).
 */
const VaultAccrualModal: React.FC<Props> = ({ open, onClose, amount }) => {
    // Auto-dismiss after 2.5 seconds
    useEffect(() => {
        if (open) {
            const timer = setTimeout(onClose, 2500);
            return () => clearTimeout(timer);
        }
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
            <div
                className="flex items-center gap-3 rounded-full border border-figma-accent/40 bg-black/90 px-5 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl pointer-events-auto cursor-pointer"
                onClick={onClose}
            >
                <img src="/assets/asset_coin_gold.png" alt="Coin" className="w-10 h-10 drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]" />
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-figma-accent">금고 적립</span>
                    <span className="text-lg font-black text-white">
                        +<AnimatedNumber value={amount} /> <span className="text-white/40 text-sm">원</span>
                    </span>
                </div>
            </div>
        </div>
    );
};

export default VaultAccrualModal;
