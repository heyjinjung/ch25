import { useState, useEffect } from "react";

type ModalState = "none" | "welcome" | "starter";

export const useNewUserWelcome = () => {
    const [modalState, setModalState] = useState<ModalState>("none");

    useEffect(() => {
        // Policy B: show to all users; keep showing until missions are completed (modal self-hides when done).
        console.log("[useNewUserWelcome] Starting timer...");
        const timer = setTimeout(() => {
            console.log("[useNewUserWelcome] Showing Welcome Modal now.");
            setModalState("welcome");
            try {
                sessionStorage.setItem("welcome_modal_open", "1");
            } catch {
                // ignore
            }
        }, 1000); // 1 second delay

        return () => {
            clearTimeout(timer);
            try {
                sessionStorage.removeItem("welcome_modal_open");
            } catch {
                // ignore
            }
        };
    }, []);

    const closeWelcomeModal = () => {
        console.log("[useNewUserWelcome] Welcome modal closed, showing Starter modal...");
        setModalState("starter");
    };

    const closeStarterModal = () => {
        console.log("[useNewUserWelcome] Starter modal closed, all modals complete.");
        setModalState("none");
        try {
            sessionStorage.removeItem("welcome_modal_open");
        } catch {
            // ignore
        }
    };

    const closeAllModals = () => {
        setModalState("none");
        try {
            sessionStorage.removeItem("welcome_modal_open");
        } catch {
            // ignore
        }
    };

    return {
        showWelcomeModal: modalState === "welcome",
        showStarterModal: modalState === "starter",
        closeWelcomeModal,
        closeStarterModal,
        closeAllModals,
    };
};
