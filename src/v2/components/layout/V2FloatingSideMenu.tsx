
import React from "react";
import { Mail, Music } from "lucide-react";
import { useV2UIStore } from "../../store/useV2UIStore";
import { useV2Inbox } from "../../hooks/useV2Inbox";
import clsx from "clsx";

const V2FloatingSideMenu: React.FC = () => {
  const { toggleInbox, toggleMusicSettings, isInboxOpen, isMusicSettingsOpen } = useV2UIStore();
  const { data: inboxData } = useV2Inbox();

  const unreadCount = inboxData?.unread_count || 0;

  return (
    <div className="fixed bottom-[120px] right-2 z-50 flex flex-col gap-3">
      {/* Music Settings Toggle */}
      <button
        onClick={toggleMusicSettings}
        className={clsx(
          "w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-all shadow-lg active:scale-95",
          isMusicSettingsOpen
            ? "bg-[#25AD82] border-[#25AD82] text-white"
            : "bg-black/40 border-white/10 text-white/70 hover:bg-black/60"
        )}
        aria-label="Music Settings"
      >
        <Music size={18} />
      </button>

      {/* Inbox Toggle */}
      <button
        onClick={toggleInbox}
        className={clsx(
          "w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md border transition-all shadow-lg active:scale-95 relative",
          isInboxOpen
            ? "bg-[#25AD82] border-[#25AD82] text-white"
            : "bg-black/40 border-white/10 text-white/70 hover:bg-black/60"
        )}
        aria-label="Inbox"
      >
        <Mail size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center shadow-sm border border-black/20">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default V2FloatingSideMenu;
