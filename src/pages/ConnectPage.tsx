import React, { useState } from "react";
import { useTelegram } from "../providers/TelegramProvider";
import { useAuth } from "../auth/authStore";
import { telegramApi } from "../api/telegramApi";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/common/ToastProvider";
import { getNewUserStatus } from "../api/newUserApi";

const ConnectPage: React.FC = () => {
    const { initData, startParam } = useTelegram();
    const { login } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = async () => {
        if (!initData) {
            addToast("텔레그램 연결 정보를 찾을 수 없습니다. 텔레그램 앱 내에서 실행해 주세요.", "error");
            return;
        }

        setIsConnecting(true);
        try {
            const response = await telegramApi.auth(initData, startParam || undefined);
            login(response.access_token, response.user);
            addToast("성공적으로 연결되었습니다!", "success");
            try {
                const status = await getNewUserStatus();
                navigate(status.eligible ? "/new-user/welcome" : "/landing");
            } catch (err) {
                // eslint-disable-next-line no-console
                console.warn("[CONNECT] new-user status check failed; falling back to telegram is_new_user", err);
                navigate(response.is_new_user ? "/new-user/welcome" : "/landing");
            }
        } catch (error) {
            console.error("[CONNECT] Authentication failed", error);
            addToast("연결에 실패했습니다. 다시 시도해 주세요.", "error");
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
                계정 연결하기
            </h1>

            <p className="text-slate-400 text-center mb-10 max-w-xs">
                게임을 플레이하고 진행 상황을 안전하게 저장하려면 텔레그램 계정을 연결해 주세요.
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
                        연결 중...
                    </>
                ) : (
                    "텔레그램으로 연결"
                )}
            </button>

            <p className="mt-8 text-xs text-slate-500 text-center">
                연결 시 이용약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다.
            </p>
        </div>
    );
};

export default ConnectPage;
