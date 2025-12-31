export { };

declare global {
    interface Window {
        Telegram: {
            WebApp: {
                ready: () => void;
                expand: () => void;
                close: () => void;
                MainButton: {
                    text: string;
                    color: string;
                    textColor: string;
                    isVisible: boolean;
                    isActive: boolean;
                    show: () => void;
                    hide: () => void;
                    enable: () => void;
                    disable: () => void;
                    onClick: (callback: () => void) => void;
                    offClick: (callback: () => void) => void;
                    showProgress: (leaveActive: boolean) => void;
                    hideProgress: () => void;
                };
                BackButton: {
                    isVisible: boolean;
                    show: () => void;
                    hide: () => void;
                    onClick: (callback: () => void) => void;
                    offClick: (callback: () => void) => void;
                };
                HapticFeedback: {
                    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
                    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
                    selectionChanged: () => void;
                };
                shareToStory: (media_url: string, params?: { text?: string, widget_link?: { url: string, name: string } }) => void;
                switchInlineQuery: (query: string, choose_chat_types?: string[]) => void;
                initData: string;
                initDataUnsafe: any;
                themeParams: any;
                platform: string;
            }
        }
    }
}
