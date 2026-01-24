import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

type FeedItem = {
  id: string;
  user: string;
  action: string;
  amount: number; // e.g., 50000
  type: "WIN" | "JACKPOT";
  currencyLabel?: string; // "?? or "ê°? etc.
};

const MOCK_USERS = [
  "tg_1928****", "tg_5821****", "tg_9923****", "tg_d382**", "tg_a821**",
  "tg_b103**", "tg_c928**", "tg_7312****", "tg_4482****", "tg_e912**",
  "tg_2049****", "tg_1102****", "tg_f283**", "tg_8291****", "tg_d992**",
  "tg_3382****", "tg_6721****", "tg_0029****", "tg_a112**", "tg_b823**",
  "tg_c821**", "tg_5512****", "tg_9283****", "tg_e221**", "tg_f112**",
  "tg_7721****", "tg_2281****", "tg_d102**", "tg_a923**", "tg_b441**"
];

// Simple seeded random function
const seededRandom = (seed: number) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

// Helper to format amount
const formatAmount = (num: number) => new Intl.NumberFormat().format(num);

export default function LiveFeedTicker() {
  const [feed, setFeed] = useState<FeedItem | null>(null);

  useEffect(() => {
    const INTERVAL_MS = 180000; // 3ë¶?

    const generateFeedForTime = (timestamp: number) => {
      // 3ë¶??¨ìœ„ ë²„í‚· ê³„ì‚°
      const bucket = Math.floor(timestamp / INTERVAL_MS);

      // ?œë“œ ?ì„± (ë²„í‚· + ê³ ì •???ìˆ˜ë¡??œìˆ˜???•ë³´)
      const seedBase = bucket * 9999;

      // 1. ? ì? ? íƒ
      const userRand = seededRandom(seedBase + 1);
      const userIndex = Math.floor(userRand * MOCK_USERS.length);
      const user = MOCK_USERS[userIndex];

      // 2. ?„ì´??ë¡œì§ (?•ë¥ )
      // ë°°ë? 20%, CCì½”ì¸ 20%, ?„ê¸ˆ 60%
      const typeRand = seededRandom(seedBase + 2);

      let amount = 0;
      let action = "?ë“!";
      let type: "WIN" | "JACKPOT" = "WIN";
      let currencyLabel = "??;

      if (typeRand < 0.2) {
        // 20% Chance: Baemin Gifticon
        amount = 5000;
        action = "ë°°ë? ?í’ˆê¶??ë“!";
        type = "WIN";
        currencyLabel = "??; // ?í’ˆê¶Œë„ ?ë‹¨???œì‹œ
      } else if (typeRand < 0.4) {
        // 20% Chance: CC Coin
        // ?˜ëŸ‰ 1~5ê°??œë¤ (seeded)
        const amtRand = seededRandom(seedBase + 3);
        amount = Math.floor(amtRand * 5) + 1;
        action = "?¨ì”¨ì½”ì¸ ?ë“!";
        type = "WIN";
        currencyLabel = "ê°?;
      } else {
        // 60% Chance: Cash
        const subRand = seededRandom(seedBase + 4);
        if (subRand < 0.8) {
          // 80% of Cash: 10,000 ~ 20,000 (1k steps)
          const rangeRand = seededRandom(seedBase + 5);
          amount = Math.floor(rangeRand * 11) * 1000 + 10000;
          type = "WIN";
        } else {
          // 20% of Cash: 20,000 ~ 50,000 (Jackpot feel)
          const rangeRand = seededRandom(seedBase + 6);
          amount = Math.floor(rangeRand * 31) * 1000 + 20000;
          type = "JACKPOT";
        }
        currencyLabel = "??;
      }

      return {
        id: `feed-${bucket}`, // ë²„í‚· IDë¥??¤ë¡œ ?¬ìš©???¬ë Œ?”ë§ ???ˆì •???•ë³´
        user,
        action,
        amount,
        type,
        currencyLabel
      } as FeedItem;
    };

    // ì´ˆê¸° ?¤í–‰
    setFeed(generateFeedForTime(Date.now()));

    // ì£¼ê¸°???…ë°?´íŠ¸ (1ì´ˆë§ˆ??ì²´í¬?˜ì—¬ ë²„í‚·??ë°”ë€Œë©´ ê°±ì‹ )
    const checkInterval = setInterval(() => {
      const now = Date.now();
      const currentBucket = Math.floor(now / INTERVAL_MS);

      setFeed(prev => {
        if (!prev) return generateFeedForTime(now);

        const prevBucket = parseInt(prev.id.split('-')[1]);
        if (currentBucket !== prevBucket) {
          return generateFeedForTime(now);
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(checkInterval);
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
            <span>?˜ì´</span>
            <span className={feed.type === "JACKPOT" ? "text-cc-gold font-bold" : "text-white font-bold"}>
              {formatAmount(feed.amount)}{feed.currencyLabel}
            </span>
            <span>{feed.action}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
