import { useCallback } from 'react';

// Define feedback types for better DX
type ImpactStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft';
type NotificationType = 'error' | 'success' | 'warning';

export const useHaptic = () => {

    // Check if running in Telegram WebApp
    const isTelegram = typeof window !== 'undefined' && !!window.Telegram?.WebApp;

    const impact = useCallback((style: ImpactStyle) => {
        if (isTelegram && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
        } else {
            // Fallback or dev log
            // console.log(`[Haptic] Impact: ${style}`);
        }
    }, [isTelegram]);

    const notification = useCallback((type: NotificationType) => {
        if (isTelegram && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
        } else {
            // console.log(`[Haptic] Notification: ${type}`);
        }
    }, [isTelegram]);

    const selection = useCallback(() => {
        if (isTelegram && window.Telegram?.WebApp?.HapticFeedback) {
            window.Telegram.WebApp.HapticFeedback.selectionChanged();
        }
    }, [isTelegram]);

    return { impact, notification, selection };
};
