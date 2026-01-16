import React, { useEffect, useState } from "react";
import AnimatedNumber from "../common/AnimatedNumber";
import Lottie from "lottie-react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
    open: boolean;
    onClose: () => void;
    amount: number;
    title?: string;
};

/**
 * Vault Accrual Modal - "The Most Flashy"
 * Uses Lottie animation and heavy visual effects to celebrate vault updates.
 */
const VaultAccrualModal: React.FC<Props> = ({ open, onClose, amount, title }) => {
    const [animationData, setAnimationData] = useState<any>(null);
    const isDebit = amount < 0;

    useEffect(() => {
        fetch("/assets/modals/welcome_claim_success.json")
            .then(res => res.json())
            .then(data => setAnimationData(data))
            .catch(err => console.error("Failed to load lottie", err));
    }, []);

    // Auto-dismiss logic remains, but slightly longer for the animation to play
    useEffect(() => {
        if (open) {
            const timer = setTimeout(onClose, 3500); // Extended for "Flashy" feel
            return () => clearTimeout(timer);
        }
    }, [open, onClose]);

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                    {/* Backdrop for emphasis */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <div className="relative w-full max-w-sm mx-4 flex flex-col items-center justify-center">
                        {/* Lottie Burst - Center Stage */}
                        {animationData && !isDebit && (
                            <div className="absolute inset-0 flex items-center justify-center -translate-y-12 scale-[1.8] pointer-events-none mix-blend-screen">
                                <Lottie 
                                    animationData={animationData} 
                                    loop={false}
                                    autoplay={true} 
                                />
                            </div>
                        )}

                        {/* Main Card */}
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            className="relative z-10 w-full bg-gradient-to-b from-gray-900 to-black border border-amber-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(251,191,36,0.2)] text-center overflow-hidden pointer-events-auto"
                            onClick={onClose}
                        >
                            {/* Inner Glow */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-transparent to-transparent opacity-50" />

                            <div className="relative z-10 flex flex-col items-center">
                                {/* Icon Halo */}
                                <div className="relative mb-4">
                                    <div className="absolute inset-0 bg-amber-500 blur-2xl opacity-40 animate-pulse" />
                                    <img 
                                        src="/assets/asset_coin_gold.png" 
                                        alt="Vault" 
                                        className="relative w-24 h-24 object-contain drop-shadow-2xl"
                                    />
                                </div>

                                <motion.div 
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="space-y-1"
                                >
                                    <div className="text-amber-500 font-bold tracking-widest text-[10px] uppercase shadow-amber-500/50 drop-shadow-sm">
                                        {title || (isDebit ? "VAULT DEBIT" : "VAULT DEPOSIT")}
                                    </div>
                                    
                                    <div className={`text-5xl font-black italic tracking-tighter ${isDebit ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-amber-500 to-yellow-600'}`}>
                                        {isDebit ? "-" : "+"}<AnimatedNumber value={Math.abs(amount)} />
                                        <span className="text-2xl not-italic ml-1 text-white/50">원</span>
                                    </div>
                                </motion.div>
                                
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="mt-6 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-white/40"
                                >
                                    터치하여 닫기
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default VaultAccrualModal;
