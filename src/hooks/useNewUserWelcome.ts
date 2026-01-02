import { useState, useEffect } from "react";

export const useNewUserWelcome = () => {
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        // Policy B: show to all users; keep showing until missions are completed (modal self-hides when done).
        console.log("[useNewUserWelcome] Starting timer...");
        const timer = setTimeout(() => {
            console.log("[useNewUserWelcome] Showing Modal now.");
            setShowModal(true);
        }, 1000); // 1 second delay

        return () => clearTimeout(timer);
    }, []);

    const closeModal = () => {
        setShowModal(false);
    };

    return { showModal, closeModal };
};
