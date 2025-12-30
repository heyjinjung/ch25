import React, { useState } from "react";
import { useTelegram } from "../providers/TelegramProvider";
import { telegramApi } from "../api/telegramApi";
import { useAuth } from "../auth/authStore";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/common/ToastProvider";

const LinkPage: React.FC = () => {
    const { initData } = useTelegram();
    const { login } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [bridgeLink, setBridgeLink] = useState<string | null>(null);

    const handleLink = async () => {
        if (!initData) {
            // Not in Telegram: Generate a magic link to open in Telegram
            setIsLinking(true);
            try {
                const { bridge_token } = await telegramApi.getBridgeToken();
                // Replace BOT_USERNAME with the actual bot username. 
                // In production this should be in an env var.
                const botUsername = "cc_jm_2026_bot";
                const link = `https://t.me/${botUsername}/app?startapp=${bridge_token}`;
                setBridgeLink(link);
                addToast("텔레그램 연결 링크가 생성되었습니다!", "success");
            } catch (error: any) {
                console.error("[LINK] Token generation failed", error);
                addToast("링크 생성에 실패했습니다. 다시 시도해 주세요.", "error");
            } finally {
                setIsLinking(false);
            }
            return;
        }

        setIsLinking(true);
        try {
            const response = await telegramApi.link(initData);
            login(response.access_token, response.user);
            addToast("계정이 성공적으로 연결되었습니다!", "success");
            navigate("/landing");
        } catch (error: any) {
            console.error("[LINK] Linking failed", error);
            addToast(error.response?.data?.detail || "연결에 실패했습니다. 다시 시도해 주세요.", "error");
        } finally {
            setIsLinking(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] bg-slate-900 text-white p-6">
            <div className="w-20 h-20 mb-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <img src="/images/tele.svg" alt="Telegram" className="w-12 h-12" />
            </div>

            <h1 className="text-2xl font-bold mb-3 text-center">텔레그램 계정 연결</h1>

            <p className="text-slate-400 text-center mb-10 max-w-xs text-sm">
                현재 세션을 텔레그램 계정과 연결하여 게임 진행 상황을 안전하게 보호하고 보상을 수령하세요.
            </p>

            {bridgeLink ? (
                <div className="w-full max-w-sm">
                    <div className="bg-slate-800 p-4 rounded-xl mb-4 border border-indigo-500/30">
                        <p className="text-xs text-indigo-300 mb-2 uppercase tracking-wider font-bold">연결 매직 링크</p>
                        <p className="text-sm break-all font-mono text-slate-200 bg-black/30 p-3 rounded-lg border border-black/20">
                            {bridgeLink}
                        </p>
                    </div>
                    <a
                        href={bridgeLink}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full py-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-center transition-all shadow-xl shadow-indigo-500/30 animate-pulse"
                    >
                        텔레그램 앱에서 열기
                    </a>
                </div>
            ) : (
                <button
                    onClick={handleLink}
                    disabled={isLinking}
                    className={`w-full max-w-sm py-4 rounded-xl font-bold transition-all duration-300 transform active:scale-95 flex items-center justify-center gap-2 ${isLinking
                        ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-500/30"
                        }`}
                >
                    {isLinking ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            연결 중...
                        </>
                    ) : (
                        initData ? "지금 바로 텔레그램 연결" : "연결용 매직링크 생성하기"
                    )}
                </button>
            )}

            <button
                onClick={() => navigate("/landing")}
                className="mt-4 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
                나중에 하기
            </button>
        </div>
    );
};

export default LinkPage;
