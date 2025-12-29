import React, { createContext, useContext, useEffect, useState } from 'react';

declare global {
    interface Window {
        Telegram: {
            WebApp: any;
        };
    }
}

interface TelegramContextType {
    webApp: any;
    initData: string;
    user: any;
    isReady: boolean;
    haptic: {
        impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notification: (type: 'error' | 'success' | 'warning') => void;
        selection: () => void;
    };
}

const TelegramContext = createContext<TelegramContextType | null>(null);

export const TelegramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isReady, setIsReady] = useState(false);
    const [webApp, setWebApp] = useState<any>(null);

    useEffect(() => {
        // Check if running inside Telegram
        const tg = window.Telegram?.WebApp;
        if (tg && tg.initData) {
            tg.ready();
            tg.expand();
            setWebApp(tg);
            setIsReady(true);

            // Apply theme
            const colorScheme = tg.colorScheme;
            document.documentElement.setAttribute('data-theme', colorScheme);
        } else {
            // Not in Telegram
            setIsReady(true);
        }
    }, []);

    const value = {
        webApp,
        initData: webApp?.initData || '',
        user: webApp?.initDataUnsafe?.user || null,
        isReady,
        haptic: {
            impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
                webApp?.HapticFeedback?.impactOccurred(style);
            },
            notification: (type: 'error' | 'success' | 'warning') => {
                webApp?.HapticFeedback?.notificationOccurred(type);
            },
            selection: () => {
                webApp?.HapticFeedback?.selectionChanged();
            },
        },
    };

    return (
        <TelegramContext.Provider value={value}>
            {children}
        </TelegramContext.Provider>
    );
};

export const useTelegram = () => {
    const context = useContext(TelegramContext);
    if (!context) {
        throw new Error('useTelegram must be used within a TelegramProvider');
    }
    return context;
};
