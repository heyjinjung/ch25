import { useState, useEffect } from "react";

export const useNewUserWelcome = () => {
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        // Policy B: show to all users; keep showing until missions are completed (modal self-hides when done).
        console.log("[useNewUserWelcome] Starting timer...");
        const timer = setTimeout(() => {
            console.log("[useNewUserWelcome] Showing Modal now.");
            setShowModal(true);
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

    const closeModal = () => {
        setShowModal(false);
        try {
            sessionStorage.removeItem("welcome_modal_open");
        } catch {
            // ignore
        }
    };

    return { showModal, closeModal };
};
