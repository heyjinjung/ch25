import React, { useState } from "react";
import { useV2UIStore } from "../../store/useV2UIStore";
import { useV2Inbox, useV2MarkInboxRead } from "../../hooks/useV2Inbox";
import {
  X,
  MailOpen,
  Mail,
  Clock,
  ChevronRight,
  ChevronDown,
  CheckCheck,
} from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const V2InboxDrawer: React.FC = () => {
  const { isInboxOpen, closeInbox } = useV2UIStore();
  const { data: inboxData, isLoading } = useV2Inbox();
  const { mutate: markRead } = useV2MarkInboxRead();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const messages = inboxData?.messages || [];

  const handleMessageClick = (msg: { id: number; is_read: boolean }) => {
    if (expandedId === msg.id) {
      setExpandedId(null);
    } else {
      setExpandedId(msg.id);
      if (!msg.is_read) {
        markRead({ inbox_ids: [msg.id] });
      }
    }
  };

  const handleMarkAllRead = () => {
    if ((inboxData?.unread_count || 0) > 0) {
      markRead({ mark_all: true });
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          "fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] transition-opacity duration-300",
          isInboxOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        onClick={closeInbox}
      />

      {/* Drawer */}
      <div
        className={clsx(
          "fixed top-0 right-0 bottom-0 w-[85%] max-w-[340px] bg-black/85 backdrop-blur-xl border-l border-white/10 z-[100] transition-transform duration-300 ease-out flex flex-col shadow-2xl",
          isInboxOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">우편함</h2>
            {inboxData?.unread_count ? (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {inboxData.unread_count}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {inboxData?.unread_count ? (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-zinc-300 hover:text-[#25AD82] transition-colors flex items-center gap-1 mr-2 font-medium"
              >
                <CheckCheck size={14} />
                모두 읽음
              </button>
            ) : null}
            <button
              onClick={closeInbox}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-white/30">
              <div className="animate-spin mb-2">
                <Clock size={24} />
              </div>
              <p>로딩중...</p>
            </div>
          )}

          {!isLoading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-white/30">
              <MailOpen size={48} strokeWidth={1} className="mb-4 opacity-50" />
              <p>도착한 메시지가 없습니다.</p>
            </div>
          )}

          {messages.map((msg) => {
            const isExpanded = expandedId === msg.id;
            return (
              <div
                key={msg.id}
                onClick={() => handleMessageClick(msg)}
                className={clsx(
                  "rounded-xl border transition-all cursor-pointer overflow-hidden group",
                  msg.is_read
                    ? "bg-white/5 border-white/5 hover:border-white/10"
                    : "bg-[#25AD82]/10 border-[#25AD82]/30 hover:bg-[#25AD82]/15",
                )}
              >
                <div className="p-4 flex gap-3 items-start relative">
                  {/* Status Dot */}
                  {!msg.is_read && (
                    <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  )}

                  <div
                    className={clsx(
                      "mt-1 min-w-[32px] w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      msg.is_read
                        ? "bg-white/5 text-white/30"
                        : "bg-[#25AD82] text-white shadow-lg shadow-[#25AD82]/30",
                    )}
                  >
                    {msg.is_read ? <MailOpen size={14} /> : <Mail size={14} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start pr-4">
                      <h3
                        className={clsx(
                          "font-bold text-sm truncate pr-2",
                          msg.is_read ? "text-white/70" : "text-white",
                        )}
                      >
                        {msg.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-400">
                      <Clock size={10} />
                      {format(new Date(msg.created_at), "yyyy.MM.dd HH:mm", {
                        locale: ko,
                      })}
                    </div>

                    {!isExpanded && (
                      <p className="text-xs text-zinc-400 mt-2 line-clamp-1">
                        {msg.content}
                      </p>
                    )}
                  </div>

                  <div className="mt-1 text-zinc-500 group-hover:text-zinc-300 transition-colors">
                    {isExpanded ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                <div
                  className={clsx(
                    "transition-all duration-300 ease-in-out border-t border-white/5 bg-black/20",
                    isExpanded
                      ? "max-h-[500px] opacity-100 p-4"
                      : "max-h-0 opacity-0 overflow-hidden",
                  )}
                >
                  <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                    {msg.content}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default V2InboxDrawer;
