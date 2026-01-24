// src/pages/RankingPage.tsx
import { useTodayRanking } from "../hooks/useRanking";
import FeatureGate from "../components/feature/FeatureGate";
import { AnimatePresence, motion } from "framer-motion";

const getMedalEmoji = (rank: number): string => {
  if (rank === 1) return "?¥‡";
  if (rank === 2) return "?¥ˆ";
  if (rank === 3) return "?¥‰";
  return `#${rank}`;
};

const RankingPage: React.FC = () => {
  const { data, isLoading, isError, error } = useTodayRanking(100);

  const content = (() => {
    if (isLoading) {
      return (
        <section className="flex flex-col items-center justify-center rounded-3xl border border-emerald-800/40 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="mt-4 text-lg font-semibold text-emerald-200">??‚¹ ë¶ˆëŸ¬?¤ëŠ” ì¤?..</p>
        </section>
      );
    }

    if (isError || !data) {
      return (
        <section className="rounded-3xl border border-red-800/40 bg-gradient-to-br from-red-950 to-slate-900 p-8 text-center shadow-2xl">
          <div className="mb-4 text-5xl">?˜¢</div>
          <p className="text-xl font-bold text-red-100">{error ? String(error) : "??‚¹??ë¶ˆëŸ¬?¤ì? ëª»í–ˆ?µë‹ˆ??"}</p>
          <p className="mt-2 text-sm text-red-200/70">? ì‹œ ???¤ì‹œ ?œë„?´ì£¼?¸ìš”</p>
        </section>
      );
    }

    const externalEntries = data.external_entries ?? [];
    const myExternal = data.my_external_entry;

    return (
      <section className="space-y-8 rounded-3xl border border-gold-600/30 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 shadow-2xl">
        <header className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-gold-400">?¤ëŠ˜??CC??‚¹</p>
          <h1 className="mt-2 text-3xl font-bold text-white">{data.date} CC ?°ì´??/h1>
          <p className="mt-2 text-sm text-slate-400">?…ê¸ˆ??/ ê²Œì„?Ÿìˆ˜ ê¸°ì??¼ë¡œ ?•ë ¬?©ë‹ˆ??</p>
        </header>

        {myExternal && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-900/60 to-slate-900/80 p-6 shadow-lg"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl font-bold text-white shadow-lg">
                {getMedalEmoji(myExternal.rank)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">???œìœ„</p>
                <p className="text-lg font-bold text-white">User #{myExternal.user_id}</p>
                <p className="text-sm text-gold-300">
                  ?…ê¸ˆ {myExternal.deposit_amount.toLocaleString()} / ê²Œì„ {myExternal.play_count.toLocaleString()}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="space-y-3">
          <h3 className="text-center text-sm font-semibold uppercase tracking-wider text-gold-400">
            CC??‚¹ ë¦¬ìŠ¤??          </h3>

          {externalEntries.length === 0 ? (
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-8 text-center text-slate-300">
              ?„ì§ CC??‚¹ ?°ì´?°ê? ?†ìŠµ?ˆë‹¤.
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {externalEntries.map((entry) => (
                  <motion.div
                    key={entry.rank}
                    layout
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                    className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-900/70 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-slate-100">
                        {getMedalEmoji(entry.rank)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">User #{entry.user_id}</p>
                        {entry.memo && <p className="text-xs text-slate-400">{entry.memo}</p>}
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-200">
                      <p>?…ê¸ˆ: {entry.deposit_amount.toLocaleString()}</p>
                      <p>ê²Œì„?Ÿìˆ˜: {entry.play_count.toLocaleString()}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>
    );
  })();

  return <FeatureGate feature="RANKING">{content}</FeatureGate>;
};

export default RankingPage;
