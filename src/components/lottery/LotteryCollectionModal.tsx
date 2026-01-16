import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import Button from "../common/Button";
import { useCraftItem } from "../../hooks/useExchange";
import { tryHaptic } from "../../utils/haptics";
import { triggerFireworks } from "../../utils/confetti";

interface LotteryCollectionModalProps {
    open: boolean;
    onClose: () => void;
    collection: { C: number; J: number; M: number };
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

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative group perspective-500">
                <motion.div
                    initial={false}
                    animate={{
                        rotateY: isAcquired ? [0, 360] : 0,
                        scale: isAcquired ? 1 : 0.95,
                    }}
                    transition={{ duration: 0.8, type: "spring" }}
                    className={clsx(
                        "relative w-16 h-20 sm:w-20 sm:h-24 rounded-lg flex items-center justify-center text-4xl font-black shadow-xl transition-all duration-300 transform-style-3d",
                        isAcquired
                            ? "bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 text-white shadow-amber-500/50"
                            : "bg-white/10 text-white/20 border-2 border-dashed border-white/20 shadow-inner"
                    )}
                    style={{
                        // Placeholder styling: "Scrabble Tile" feel
                        boxShadow: isAcquired
                            ? "0 10px 20px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -4px 0 rgba(0,0,0,0.2)"
                            : "none"
                    }}
                >
                    {/* Placeholder Image or Text */}
                    <span className="drop-shadow-md pb-1">{char}</span>

                    {/* 3D Thickness Effect (Pseudo) */}
                    {isAcquired && (
                        <div className="absolute inset-x-0 -bottom-1 h-2 bg-amber-900/50 rounded-b-lg -z-10 transform translate-z-[-5px]" />
                    )}
                </motion.div>
            </div>

            {/* Count Badge */}
            <div className={clsx(
                "text-xs font-bold px-2 py-0.5 rounded-full transition-colors",
                isAcquired ? "bg-amber-500 text-black" : "bg-white/10 text-white/30"
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
    const REQ_C = 2;
    const REQ_J = 1;
    const REQ_M = 1;

    const canCraft =
        collection.C >= REQ_C && collection.J >= REQ_J && collection.M >= REQ_M;

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
                        className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">
                                Collection
                            </h2>
                            <p className="text-sm text-white/50 mt-1">
                                퍼즐을 모아 <span className="text-amber-400 font-bold">황금열쇠</span>를 완성하세요!
                            </p>
                        </div>

                        {/* Puzzle Grid */}
                        <div className="flex justify-center gap-4 mb-8">
                            {/* C (Requires 2) */}
                            <PuzzlePiece char="C" count={collection.C} required={REQ_C} />

                            {/* J (Requires 1) */}
                            <PuzzlePiece char="J" count={collection.J} required={REQ_J} />

                            {/* M (Requires 1) */}
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

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
                        >
                            ✕
                        </button>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default LotteryCollectionModal;
