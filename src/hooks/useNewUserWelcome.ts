import { useState, useEffect } from "react";

export const useNewUserWelcome = () => {
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        // Check if user has dismissed the modal
        const hideWelcome = localStorage.getItem("hideNewUserWelcome");

        // Show modal after a short delay if not dismissed
        if (!hideWelcome) {
            console.log("[useNewUserWelcome] Modal eligible, starting timer...");
            const timer = setTimeout(() => {
                console.log("[useNewUserWelcome] Showing Modal now.");
                setShowModal(true);
            }, 1000); // 1 second delay

            return () => clearTimeout(timer);
        }
    }, []);

    const closeModal = () => {
        setShowModal(false);
    };

    return { showModal, closeModal };
};
