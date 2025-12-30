import React from "react";
import { useAuth } from "../../auth/authStore";
import { useNavigate } from "react-router-dom";
import { useToast } from "../common/ToastProvider";

const LogoutButton: React.FC<{ className?: string }> = ({ className }) => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();

    const handleLogout = () => {
        logout();
        addToast("Logged out successfully.", "info");
        navigate("/connect", { replace: true });
    };

    return (
        <button
            onClick={handleLogout}
            className={`px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30 rounded-lg transition-colors duration-200 text-sm font-medium ${className}`}
        >
            Logout
        </button>
    );
};

export default LogoutButton;
