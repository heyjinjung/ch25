import React from "react";
import Modal from "../common/Modal";
import AnimatedNumber from "../common/AnimatedNumber";

type Props = {
    open: boolean;
    onClose: () => void;
    amount: number;
};

const VaultAccrualModal: React.FC<Props> = ({ open, onClose, amount }) => {
    return (
        <Modal title="금고 적립 완료" open={open} onClose={onClose}>
            <div className="flex flex-col items-center gap-6 py-4 text-center">
                <div className="relative">
                    <div className="absolute inset-0 animate-ping rounded-full bg-figma-accent/20" />
                    <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-black/40 border-2 border-figma-accent/30 shadow-[0_0_30px_rgba(48,255,117,0.2)]">
                        <img src="/assets/asset_coin_gold.png" alt="Coin" className="w-16 h-16 drop-shadow-2xl" />
                    </div>
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-figma-accent">Vault Secured</p>
                    <h3 className="text-4xl font-black text-white">
                        +<AnimatedNumber value={amount} /> <span className="text-white/40 italic">원</span>
                    </h3>
                    <p className="text-sm font-bold text-white/60 leading-relaxed">
                        축하합니다! 게임 보상이<br />
                        금고에 안전하게 보관되었습니다.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 w-full rounded-2xl bg-figma-primary py-4 font-black text-white shadow-lg active:scale-95 transition-transform uppercase tracking-widest italic"
                >
                    확인
                </button>
            </div>
        </Modal>
    );
};

export default VaultAccrualModal;
