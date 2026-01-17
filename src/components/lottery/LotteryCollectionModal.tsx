import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import Button from "../common/Button";
import { useCraftItem } from "../../hooks/useExchange";
import { tryHaptic } from "../../utils/haptics";
import { triggerFireworks } from "../../utils/confetti";
import { X, Check } from "lucide-react";


interface LotteryCollectionModalProps {
    open: boolean;
    onClose: () => void;
    collection: { C1: number; C2: number; J: number; M: number };
}

// 3D Puzzle Piece Component
const PuzzlePiece = ({
    char,
    count,
    required,
}: {
    char: string;
    count: number;
    required: number;
}) => {
    const isAcquired = count >= required;

    // Map char to image file name
    const getImageSrc = (c: string) => {
        const key = c.toUpperCase();
        if (key === "C") return "/assets/icons/puzzle_c.png";
        if (key === "J") return "/assets/icons/puzzle_j.png";
        if (key === "M") return "/assets/icons/puzzle_m.png";
        return null;
    };

    const imgSrc = getImageSrc(char);

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="relative group">
                <motion.div
                    initial={false}
                    animate={{
                        scale: isAcquired ? 1.05 : 1,
                        filter: isAcquired ? "grayscale(0%) brightness(1.1)" : "grayscale(100%) brightness(0.6)",
                    }}
                    transition={{ duration: 0.5 }}
                    className={clsx(
                        "relative w-18 h-22 sm:w-20 sm:h-24 rounded-2xl flex items-center justify-center transition-all duration-300 overflow-hidden",
                        isAcquired
                            ? "shadow-[0_0_25px_-5px_rgba(245,158,11,0.4)] border border-amber-500/30 bg-amber-500/5"
                            : "bg-white/5 border border-white/5 shadow-inner"
                    )}
                >
                    {imgSrc ? (
                        <img
                            src={imgSrc}
                            alt={`Puzzle ${char}`}
                            className={clsx(
                                "w-full h-full object-contain p-2 transition-transform duration-500",
                                isAcquired ? "scale-110" : "scale-90 opacity-60"
                            )}
                        />
                    ) : (
                        <span className={clsx(
                            "text-3xl font-black drop-shadow-md pb-1",
                            isAcquired ? "text-amber-500" : "text-white/10"
                        )}>
                            {char}
                        </span>
                    )}

                    {/* Acquired Badge */}
                    {isAcquired && (
                         <motion.div
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute pointer-events-none inset-0 border-2 border-amber-400/50 rounded-2xl"
                         />
                    )}
                </motion.div>
                
                {isAcquired && (
                    <div className="absolute -top-2 -right-2 z-10">
                        <motion.div
                           initial={{ scale: 0 }}
                           animate={{ scale: 1 }}
                           className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border border-white/20"
                        >
                            <Check size={14} className="text-black stroke-[3px]" />
                        </motion.div>
                    </div>
                )}
            </div>

            {/* Count Badge */}
            <div className={clsx(
                "text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all",
                isAcquired 
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
                    : "bg-white/5 text-white/20 border-white/5"
            )}>
                {count} / {required}
            </div>
        </div>
    );
};

const LotteryCollectionModal: React.FC<LotteryCollectionModalProps> = ({
    open,
    onClose,
    collection,
}) => {
    const { mutateAsync: craft, isPending } = useCraftItem();
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Requirements
    const REQ_C1 = 1;
    const REQ_C2 = 1;
    const REQ_J = 1;
    const REQ_M = 1;

    const canCraft =
        collection.C1 >= REQ_C1 && collection.C2 >= REQ_C2 && collection.J >= REQ_J && collection.M >= REQ_M;

    const handleCraft = async () => {
        if (!canCraft || isPending) return;
        try {
            tryHaptic([15, 50, 15]);
            await craft("GOLD_KEY_FROM_PUZZLE");
            triggerFireworks();
            setSuccessMessage("황금열쇠 교환 성공!");
            setTimeout(() => {
                setSuccessMessage(null);
                onClose();
            }, 2000);
        } catch (e) {
            console.error("Craft failed", e);
            // alert("교환에 실패했습니다."); // Optional: User toast
        }
    };

    useEffect(() => {
        if (open) {
            tryHaptic(10);
        }
    }, [open]);


    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-[10050] flex items-center justify-center px-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-amber-500/20 bg-[#121212] p-8 shadow-2xl"
                    >
                         {/* Background Gradients */}
                         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-amber-500/10 blur-[60px] pointer-events-none" />

                        {/* Header */}
                        <div className="relative text-center mb-8 z-10">
                            <div className="inline-block px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-3">
                                <span className="text-[10px] font-black text-amber-500 tracking-widest uppercase">Secret Puzzle</span>
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight italic">
                                Collection
                            </h2>
                            <p className="text-sm text-zinc-500 mt-2 font-medium">
                                퍼즐을 모아 <span className="text-amber-400 font-bold underline decoration-amber-500/30 underline-offset-4">황금열쇠</span>를 완성하세요!
                            </p>
                        </div>

                        {/* Puzzle Grid */}
                        <div className="flex justify-center gap-3 sm:gap-4 mb-8">
                            {/* C1 */}
                            <PuzzlePiece
                                char="C"
                                count={collection.C1}
                                required={REQ_C1}
                            />

                            {/* C2 */}
                            <PuzzlePiece
                                char="C"
                                count={collection.C2}
                                required={REQ_C2}
                            />

                            {/* J */}
                            <PuzzlePiece char="J" count={collection.J} required={REQ_J} />

                            {/* M */}
                            <PuzzlePiece char="M" count={collection.M} required={REQ_M} />
                        </div>

                        {/* Action Area */}
                        <div className="mt-4">
                            {successMessage ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 py-4 text-center border border-amber-500/30"
                                >
                                    <p className="text-lg font-black text-amber-300">🎉 {successMessage}</p>
                                </motion.div>
                            ) : (
                                <Button
                                    onClick={handleCraft}
                                    disabled={!canCraft || isPending}
                                    variant={canCraft ? "figma-primary" : "figma-secondary"}
                                    className={clsx(
                                        "w-full py-4 text-lg font-black transition-all",
                                        canCraft ? "shadow-lg shadow-amber-500/20" : "opacity-50"
                                    )}
                                >
                                    {isPending ? "교환 중..." : canCraft ? "🔑 황금열쇠 교환하기" : "조각이 부족합니다"}
                                </Button>
                            )}
                        </div>

                        {/* Close Button - Mobile Optimized */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95 transition-all w-10 h-10 flex items-center justify-center z-50 backdrop-blur-md"
                            aria-label="닫기"
                        >
                            <X size={20} />
                        </button>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LotteryCollectionModal;
