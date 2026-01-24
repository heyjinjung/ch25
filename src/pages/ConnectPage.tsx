import React, { useState } from "react";
import { useTelegram } from "../providers/TelegramProvider";
import { useAuth } from "../auth/authStore";
import { telegramApi } from "../api/telegramApi";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/common/ToastProvider";

const ConnectPage: React.FC = () => {
    const { initData, startParam } = useTelegram();
    const { login } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = async () => {
        if (!initData) {
            addToast("?”ë ˆê·¸ë¨ ?°ê²° ?•ë³´ë¥?ì°¾ì„ ???†ìŠµ?ˆë‹¤. ?”ë ˆê·¸ë¨ ???´ì—???¤í–‰??ì£¼ì„¸??", "error");
            return;
        }

        setIsConnecting(true);
        try {
            const response = await telegramApi.auth(initData, startParam || undefined);
            login(response.access_token, response.user);
            addToast("?±ê³µ?ìœ¼ë¡??°ê²°?˜ì—ˆ?µë‹ˆ??", "success");
            navigate("/landing");
        } catch (error) {
            console.error("[CONNECT] Authentication failed", error);
            addToast("?°ê²°???¤íŒ¨?ˆìŠµ?ˆë‹¤. ?¤ì‹œ ?œë„??ì£¼ì„¸??", "error");
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-6 pt-20">
            <div className="w-24 h-24 mb-6 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <img src="/images/tele.svg" alt="Telegram" className="w-16 h-16" />
            </div>

            <h1 className="text-3xl font-bold mb-3 text-center bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                ê³„ì • ?°ê²°?˜ê¸°
            </h1>

            <p className="text-slate-400 text-center mb-10 max-w-xs">
                ê²Œì„???Œë ˆ?´í•˜ê³?ì§„í–‰ ?í™©???ˆì „?˜ê²Œ ?€?¥í•˜?¤ë©´ ?”ë ˆê·¸ë¨ ê³„ì •???°ê²°??ì£¼ì„¸??
            </p>

            <button
                onClick={handleConnect}
                disabled={isConnecting}
                className={`w-full max-w-sm py-4 rounded-xl font-bold text-lg transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 ${isConnecting
                    ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-500/30"
                    }`}
            >
                {isConnecting ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ?°ê²° ì¤?..
                    </>
                ) : (
                    "?”ë ˆê·¸ë¨?¼ë¡œ ?°ê²°"
                )}
            </button>

            <p className="mt-8 text-xs text-slate-500 text-center">
                ?°ê²° ???´ìš©?½ê? ë°?ê°œì¸?•ë³´ ì²˜ë¦¬ë°©ì¹¨???™ì˜?˜ëŠ” ê²ƒìœ¼ë¡?ê°„ì£¼?©ë‹ˆ??
            </p>
        </div>
    );
};

export default ConnectPage;
