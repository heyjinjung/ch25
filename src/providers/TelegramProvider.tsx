import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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
    startParam: string;
    user: any;
    isReady: boolean;
    haptic: {
        impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        notification: (type: 'error' | 'success' | 'warning') => void;
        selection: () => void;
    };
}

const TelegramContext = createContext<TelegramContextType | null>(null);

const TelegramNavigationHandler = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { webApp } = useTelegram();

    useEffect(() => {
        if (!webApp) return;

        // 1. BackButton Logic
        const handleBack = () => {
            console.log('[Telegram] BackButton clicked');
            navigate(-1);
        };

        webApp.BackButton.onClick(handleBack);

        // 2. MainButton Logic - Force Hide as per requirements
        webApp.MainButton.hide();

        return () => {
            webApp.BackButton.offClick(handleBack);
        };
    }, [webApp, navigate]);

    useEffect(() => {
        if (!webApp) return;

        // Show BackButton if not on home/root
        const isRoot = location.pathname === '/' || location.pathname === '/home';
        if (isRoot) {
            webApp.BackButton.hide();
        } else {
            webApp.BackButton.show();
        }
    }, [webApp, location]);

    return null;
};

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
        startParam: webApp?.initDataUnsafe?.start_param || '',
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
            <TelegramNavigationHandler />
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
