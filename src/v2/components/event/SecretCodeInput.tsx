import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Gift, ExternalLink } from "lucide-react";
import { useClaimSecretCode } from "../../hooks/useValentineSeol";
import { triggerHaptic, triggerNotification } from "../../utils/haptic";
import { useToast } from "../common/ToastProvider";
import { KOREAN } from "../../pages/event/KoreanConstants";

interface SecretCodeInputProps {
  claimedCodes?: string[];
}

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE: KOREAN.ERR_INVALID_CODE,
  CODE_EXPIRED: KOREAN.ERR_CODE_EXPIRED,
  ALREADY_CLAIMED: KOREAN.ERR_ALREADY_CLAIMED,
};

export default function SecretCodeInput({ claimedCodes }: SecretCodeInputProps) {
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const claimMutation = useClaimSecretCode();
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || claimMutation.isPending) return;

    triggerHaptic("medium");
    setFeedback(null);

    try {
      const result = await claimMutation.mutateAsync(code);
      triggerNotification("success");
      setFeedback({
        type: "success",
        message: result.message || KOREAN.SECRET_SUCCESS,
      });
      addToast({
        type: "success",
        message: result.message || KOREAN.SECRET_TOAST,
      });
      setCode("");

      setTimeout(() => setFeedback(null), 4000);
    } catch (error: any) {
      triggerNotification("error");
      const detail = error?.response?.data?.detail || "";
      const message =
        ERROR_MESSAGES[detail] || KOREAN.ERR_DEFAULT;
      setFeedback({ type: "error", message });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-rose-500/10 p-5 backdrop-blur-sm"
    >
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Gift size={18} className="text-purple-400" />
          <h3 className="text-base font-black text-white">
            {KOREAN.SECRET_TITLE}
          </h3>
        </div>
        <p className="text-xs text-zinc-400">
          {KOREAN.SECRET_DESC}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex gap-3 mb-3">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="예: LOVE2026"
          maxLength={10}
          disabled={claimMutation.isPending}
          className="flex-1 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-mono text-white uppercase placeholder:text-white/30 focus:border-purple-500/50 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!code.trim() || claimMutation.isPending}
          className="rounded-xl bg-white px-5 py-3 text-sm font-black text-purple-600 transition-all hover:bg-white/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {claimMutation.isPending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            KOREAN.SECRET_BTN
          )}
        </button>
      </form>

      {/* Feedback Message */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-xl p-3 text-sm font-medium mb-3 ${
              feedback.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-rose-500/10 border border-rose-500/30 text-rose-400"
            }`}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Claimed codes indicator */}
      {claimedCodes && claimedCodes.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {claimedCodes.map((c) => (
            <span
              key={c}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
            >
              {c} ✓
            </span>
          ))}
        </div>
      )}

      {/* Telegram Link */}
      <div className="pt-3 border-t border-white/5 text-center">
        <a
          href="https://t.me/cc_jm_official"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ExternalLink size={12} />
          {KOREAN.SECRET_LINK}
        </a>
      </div>
    </motion.div>
  );
}
