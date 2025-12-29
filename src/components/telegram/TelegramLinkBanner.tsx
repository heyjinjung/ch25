import React, { useState } from 'react';
import { useAuth } from '../../auth/authStore';
import { useTelegram } from '../../providers/TelegramProvider';
import { telegramApi } from '../../api/telegramApi';

export const TelegramLinkBanner: React.FC = () => {
    const { user, login } = useAuth();
    const { initData, haptic } = useTelegram();
    const [isLoading, setIsLoading] = useState(false);
    const [islinked, setIsLinked] = useState(false);

    // Only show if:
    // 1. We are in Telegram (initData exists)
    // 2. User is logged in
    // 3. User is NOT already linked (telegram_id is null/undefined)
    if (!initData || !user || user.telegram_id || islinked) {
        return null;
    }

    const handleLink = async () => {
        setIsLoading(true);
        haptic.impact('medium');
        try {
            const response = await telegramApi.link(initData);
            login(response.access_token, response.user);
            setIsLinked(true);
            haptic.notification('success');
            alert('텔레그램 계정이 성공적으로 연결되었습니다!');
        } catch (error) {
            console.error('[TELEGRAM] Linking failed', error);
            haptic.notification('error');
            alert('계정 연결에 실패했습니다. 다시 시도해 주세요.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="rounded-2xl border border-blue-500/30 bg-blue-900/20 backdrop-blur-xl p-4 shadow-lg mb-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🔗</span>
                    <div>
                        <p className="text-sm font-bold text-white">텔레그램 계정 연결</p>
                        <p className="text-xs text-blue-200">현재 계정을 텔레그램과 연결하여 더 안전하게 이용하세요.</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={handleLink}
                    disabled={isLoading}
                    className="w-full sm:w-auto rounded-xl bg-blue-600 px-5 py-2 text-sm font-extrabold text-white transition hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed"
                >
                    {isLoading ? '연결 중...' : '지금 연결하기'}
                </button>
            </div>
        </div>
    );
};
