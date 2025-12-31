// src/dev-mock-telegram.ts
// Telegram WebApp Mock for local browser development
// This file is loaded only in development mode

const mockUser = {
    id: 123456789,
    first_name: "Dev",
    last_name: "User",
    username: "devuser",
    language_code: "ko",
};

const mockInitDataUnsafe = {
    user: mockUser,
    auth_date: Math.floor(Date.now() / 1000),
    hash: "mock_hash_for_dev",
    start_param: "",
};

// Create mock Telegram WebApp object
window.Telegram = window.Telegram || {};
window.Telegram.WebApp = {
    // Basic info
    colorScheme: "dark" as const,
    themeParams: {
        bg_color: "#0a0a0a",
        text_color: "#ffffff",
        hint_color: "#999999",
        link_color: "#30FF75",
        button_color: "#30FF75",
        button_text_color: "#000000",
    },
    isExpanded: true,
    viewportHeight: window.innerHeight,
    viewportStableHeight: window.innerHeight,

    // Init data
    initData: "",
    initDataUnsafe: mockInitDataUnsafe,

    // Methods
    ready: () => console.log("[TG Mock] ready()"),
    expand: () => console.log("[TG Mock] expand()"),
    close: () => console.log("[TG Mock] close()"),

    // Main Button
    MainButton: {
        text: "",
        color: "#30FF75",
        textColor: "#000000",
        isVisible: false,
        isActive: true,
        isProgressVisible: false,
        setText: (text: string) => { console.log(`[TG Mock] MainButton.setText("${text}")`); },
        show: () => { console.log("[TG Mock] MainButton.show()"); },
        hide: () => { console.log("[TG Mock] MainButton.hide()"); },
        enable: () => { },
        disable: () => { },
        showProgress: () => { },
        hideProgress: () => { },
        onClick: (_callback: () => void) => { console.log("[TG Mock] MainButton.onClick registered"); },
        offClick: () => { },
    },

    // Back Button
    BackButton: {
        isVisible: false,
        show: () => { console.log("[TG Mock] BackButton.show()"); },
        hide: () => { console.log("[TG Mock] BackButton.hide()"); },
        onClick: (_callback: () => void) => { console.log("[TG Mock] BackButton.onClick registered"); },
        offClick: () => { },
    },

    // Haptic Feedback
    HapticFeedback: {
        impactOccurred: (style: string) => console.log(`[TG Mock] HapticFeedback.impactOccurred("${style}")`),
        notificationOccurred: (type: string) => console.log(`[TG Mock] HapticFeedback.notificationOccurred("${type}")`),
        selectionChanged: () => console.log("[TG Mock] HapticFeedback.selectionChanged()"),
    },

    // Popup
    showPopup: (params: any, callback?: () => void) => {
        console.log("[TG Mock] showPopup:", params);
        if (callback) callback();
    },
    showAlert: (message: string, callback?: () => void) => {
        alert(message);
        if (callback) callback();
    },
    showConfirm: (message: string, callback?: (confirmed: boolean) => void) => {
        const result = confirm(message);
        if (callback) callback(result);
    },

    // Links
    openLink: (url: string) => {
        console.log(`[TG Mock] openLink("${url}")`);
        window.open(url, "_blank");
    },
    openTelegramLink: (url: string) => {
        console.log(`[TG Mock] openTelegramLink("${url}")`);
        window.open(url, "_blank");
    },

    // Sharing
    shareToStory: (mediaUrl: string, params?: any) => {
        console.log("[TG Mock] shareToStory:", mediaUrl, params);
        alert(`[Mock] Share to Story: ${mediaUrl}`);
    },

    // Data
    sendData: (data: string) => console.log("[TG Mock] sendData:", data),

    // Platform
    platform: "web",
    version: "6.0",
};

console.log("🔧 Telegram WebApp Mock loaded for development");

// Export to make it a valid module
export { };
