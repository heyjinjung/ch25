import React, { useState } from "react";
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
                className="w-9 h-9 flex items-center justify-center rounded-lg border border-emerald-800 bg-slate-900 text-emerald-400 transition-colors hover:bg-emerald-900/40 hover:text-emerald-300 relative"
                title="메시지함"
                aria-label={unreadCount > 0 ? `메시지함 (읽지 않은 메시지 ${unreadCount}개)` : "메시지함"}
            >
                <img
                    src={unreadCount > 0 ? "/assets/icon_alarm_unread.png" : "/assets/icon_alarm_normal.png"}
                    className="w-5 h-5 object-contain"
                    alt="Inbox"
                />
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
