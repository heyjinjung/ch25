import React, { useState } from "react";
import { Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchMyInbox } from "../../api/userMessageApi";
import InboxModal from "./InboxModal";

const InboxButton: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    // Poll every 30 seconds for new messages
    const { data: messages = [] } = useQuery({
        queryKey: ["my-inbox"],
        queryFn: fetchMyInbox,
        refetchInterval: 30000,
    });

    const unreadCount = messages.filter((m) => !m.is_read).length;

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="relative flex items-center justify-center rounded-lg border border-emerald-800 bg-slate-900 p-2 text-emerald-400 transition-colors hover:bg-emerald-900/40 hover:text-emerald-300"
                title="메시지함"
            >
                <Mail size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && <InboxModal onClose={() => setIsOpen(false)} />}
        </>
    );
};

export default InboxButton;
