import { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy, Zap, Dice5 } from 'lucide-react';
import { useFeedStore } from '../../stores/feedStore';
import { JackpotWin } from '../../types/feed';

export const LiveFeedTicker = () => {
  const { connect, messages } = useFeedStore();
  const [displayMsg, setDisplayMsg] = useState<JackpotWin | null>(null);
  const processedTimestamps = useRef<Set<string>>(new Set());
  
  // Connect on mount
  useEffect(() => {
    connect();
  }, [connect]);

  // Queue processing logic
  useEffect(() => {
    if (messages.length === 0) return;

    // We only care about the newest message derived from the store
    const newest = messages[0];
    
    // If we haven't shown this exact message timestamp yet
    if (!processedTimestamps.current.has(newest.timestamp)) {
      processedTimestamps.current.add(newest.timestamp);
      setDisplayMsg(newest);

      // Cleanup old timestamps to prevent memory leak
      if (processedTimestamps.current.size > 50) {
        processedTimestamps.current = new Set(Array.from(processedTimestamps.current).slice(-20));
      }

      // Auto hide after 5 seconds? Optional. 
      // For now, let it stay until replaced.
      const timer = setTimeout(() => {
         setDisplayMsg(prev => (prev?.timestamp === newest.timestamp ? null : prev));
      }, 5000); // 5 seconds visibility
      
      return () => clearTimeout(timer);
    }
  }, [messages]);

  if (!displayMsg) return null;

  // Determine icon based on game type
  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'dice': return <Dice5 className="w-4 h-4 text-purple-200" />;
      case 'roulette': return <Zap className="w-4 h-4 text-yellow-200" />;
      case 'lottery': return <Trophy className="w-4 h-4 text-amber-200" />;
      default: return <Trophy className="w-4 h-4 text-white" />;
    }
  };

  const getBgColor = (isMega: boolean) => {
    return isMega 
      ? "bg-gradient-to-r from-purple-600 via-pink-600 to-red-500 border-purple-300" 
      : "bg-gray-800/90 border-gray-600";
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-50 pointer-events-none flex justify-center px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={displayMsg.timestamp}
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className={`
            pointer-events-auto
            flex items-center gap-3 px-4 py-2 rounded-full shadow-xl border
            backdrop-blur-md text-white font-medium text-sm md:text-base
            ${getBgColor(displayMsg.is_mega)}
          `}
        >
          <div className="p-1 bg-white/20 rounded-full">
            {getIcon(displayMsg.game_type)}
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:gap-2">
            <span className="opacity-90">{displayMsg.nickname}</span>
            <span className="hidden md:inline text-white/40">|</span>
            <span className="text-yellow-300 font-bold">
              {displayMsg.reward_amount.toLocaleString()} P
            </span>
            <span className="text-xs text-white/70 uppercase">
              Won in {displayMsg.game_type}
            </span>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
