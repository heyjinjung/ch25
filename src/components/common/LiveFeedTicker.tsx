import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type FeedItem = {
  id: string;
  user: string;
  action: string;
  amount: number; // e.g., 50000
  type: "WIN" | "JACKPOT";
};

const MOCK_USERS = [
  "tg_1928****", "tg_5821****", "tg_9923****", "tg_d382**", "tg_a821**",
  "tg_b103**", "tg_c928**", "tg_7312****", "tg_4482****", "tg_e912**",
  "tg_2049****", "tg_1102****", "tg_f283**", "tg_8291****", "tg_d992**",
  "tg_3382****", "tg_6721****", "tg_0029****", "tg_a112**", "tg_b823**",
  "tg_c821**", "tg_5512****", "tg_9283****", "tg_e221**", "tg_f112**",
  "tg_7721****", "tg_2281****", "tg_d102**", "tg_a923**", "tg_b441**"
];

// Helper to format amount
const formatAmount = (num: number) => new Intl.NumberFormat().format(num);

export default function LiveFeedTicker() {
  const [feed, setFeed] = useState<FeedItem | null>(null);

  useEffect(() => {
    const generateFeed = () => {
      const isJackpot = Math.random() < 0.1; // 10% chance
      const baseAmount = isJackpot ? 10000 : 1000;
      const randomValue = Math.floor(Math.random() * 50) * 1000 + baseAmount;

      return {
        id: Math.random().toString(36).substring(7),
        user: MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)],
        action: "획득!",
        amount: randomValue,
        type: isJackpot ? "JACKPOT" : "WIN",
      } as FeedItem;
    };

    // Initial feed
    setFeed(generateFeed());

    const interval = setInterval(() => {
      setFeed(generateFeed());
    }, 4500); // Update every 4.5s

    return () => clearInterval(interval);
  }, []);

  if (!feed) return null;

  return (
    <div className="relative flex h-8 items-center justify-center overflow-hidden rounded-full bg-black/40 px-4 backdrop-blur-md border border-white/5">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <AnimatePresence mode="wait">
          <motion.div
            key={feed.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-1.5 text-xs font-medium text-white/90"
          >
            <span className="text-white/60">{feed.user}</span>
            <span>님이</span>
            <span className={feed.type === "JACKPOT" ? "text-cc-gold font-bold" : "text-white font-bold"}>
              {formatAmount(feed.amount)}원
            </span>
            <span>{feed.action}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
