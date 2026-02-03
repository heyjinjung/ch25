import React, { useState } from "react";
import { motion } from "framer-motion";
import { BackgroundPaths } from "../../components/effects/BackgroundPaths";
import { MatrixText } from "../../components/ui/MatrixText";
import { BorderBeam } from "../../components/ui/BorderBeam";
import { EventModals } from "../../components/event/EventModals";
import "./EventPage.css";

const EVENT_ITEMS = [
  {
    id: "attendance",
    title: "연속출석 이벤",
    desc: "매일매일 보너스",
    icon: "🔥",
    color: "from-orange-500/20 to-amber-500/20",
    badge: "DAILY",
    isWide: true,
  },
  {
    id: "golden",
    title: "골든아워 이벤",
    desc: "계속 터지는 황금빛찬스",
    icon: "✨",
    color: "from-yellow-500/20 to-amber-600/20",
    badge: "RANDOM",
  },
  {
    id: "newuser",
    title: "신규유저 이벤",
    desc: "지민코드 웰컴이벤",
    icon: "🎁",
    color: "from-emerald-500/20 to-teal-600/20",
    badge: "WELCOME",
  },
  {
    id: "deposit",
    title: "입금지연 보상",
    desc: "이제 빠른입금반영",
    icon: "💎",
    color: "from-blue-500/20 to-indigo-600/20",
    badge: "FIXED",
  },
  {
    id: "teambattle",
    title: "팀배틀 이벤",
    desc: "승리의 영광, 함께해요",
    icon: "🏆",
    color: "from-purple-500/20 to-rose-600/20",
    badge: "COMING SOON",
  },
];

const EventPage: React.FC = () => {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  return (
    <div className="event-page relative min-h-tg bg-[#09090B] overflow-x-hidden">
      <BackgroundPaths count={30} className="fixed inset-0 opacity-40" />
      
      <div className="event-container relative z-10 px-4 max-w-lg mx-auto h-full flex flex-col">
        {/* Header */}
        <header className="mb-6 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest">
              Exclusive Benefits
            </span>
          </div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter">
            CC <span className="text-emerald-500"><MatrixText text="EVENT" /></span>
          </h1>
        </header>

        {/* Hero Banner */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 relative group"
        >
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-neutral-900/40 backdrop-blur-xl">
             <BorderBeam size={250} duration={12} colorFrom="#10b981" colorTo="#3b82f6" />
             <div className="p-1">
                <img 
                  src="/assets/06shop/banner.png" 
                  alt="Event Banner" 
                  className="event-banner-img"
                />
             </div>
          </div>
        </motion.div>

        {/* Event Grid */}
        <div className="event-grid pb-20">
          {EVENT_ITEMS.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              onClick={() => setSelectedEventId(item.id)}
              className={`event-card ${item.isWide ? 'event-grid-wide' : ''} group`}
            >
              <div className={`relative h-full overflow-hidden rounded-3xl border border-white/10 bg-neutral-900/40 backdrop-blur-md p-5 flex flex-col justify-between transition-all duration-300 group-hover:bg-neutral-800/60`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="event-card-shimmer" />
                
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black text-white/50 tracking-widest uppercase">
                      {item.badge}
                    </span>
                    <span className="text-2xl">{item.icon}</span>
                  </div>
                  <h3 className="text-[16px] font-black text-white mb-1 tracking-tight whitespace-nowrap">
                    {item.title}
                  </h3>
                  <p className="text-[10px] font-medium text-white/40 leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
                    {item.desc}
                  </p>
                </div>

                <div className="relative z-10 mt-6 flex items-center gap-1 text-[10px] font-black text-emerald-500/80 uppercase">
                  View Detail 
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <EventModals 
        selectedId={selectedEventId} 
        onClose={() => setSelectedEventId(null)} 
      />
    </div>
  );
};

export default EventPage;
