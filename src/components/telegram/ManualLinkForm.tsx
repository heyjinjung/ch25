import React, { useState } from "react";
import { telegramApi } from "../../api/telegramApi";
import { useAuth } from "../../auth/authStore";
import { useTelegram } from "../../providers/TelegramProvider";
import { useToast } from "../common/ToastProvider";

interface ManualLinkFormProps {
    onSuccess?: () => void;
}

const ManualLinkForm: React.FC<ManualLinkFormProps> = ({ onSuccess }) => {
    const { initData } = useTelegram();
    const { login } = useAuth();
    const { addToast } = useToast();
    const [nickname, setNickname] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleManualLink = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!initData) return;
        if (!nickname || !password) {
            addToast("닉네임과 비밀번호를 입력해주세요.", "error");
            return;
        }

        setIsLoading(true);
        try {
            const response = await telegramApi.manualLink(initData, nickname, password);
            login(response.access_token, response.user);
            addToast("계정이 성공적으로 연결되었습니다!", "success");
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error("[ManualLink] Failed", error);
            addToast(error.response?.data?.detail || "연결 실패: 정보를 다시 확인해주세요.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm bg-slate-800/50 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2 text-center">기존 계정 연결</h3>
            <p className="text-slate-400 text-xs text-center mb-6">
                외부 CC 서비스에서 사용하던 닉네임과 비밀번호를 입력하면 현재 텔레그램 계정과 즉시 연동됩니다.
            </p>

            <form onSubmit={handleManualLink} className="space-y-4">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                        닉네임 / ID
                    </label>
                    <input
                        type="text"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        placeholder="닉네임 입력"
                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-figma-accent/50 transition-colors"
                    />
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-1 block">
                        비밀번호
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-figma-accent/50 transition-colors"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-figma-accent hover:bg-emerald-400 text-black font-black py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-figma-accent/20 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : (
                        "지금 연동하기"
                    )}
                </button>
            </form>
        </div>
    );
};

export default ManualLinkForm;
