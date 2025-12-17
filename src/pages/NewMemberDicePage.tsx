// src/pages/NewMemberDicePage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useNewMemberDiceStatus, usePlayNewMemberDice } from "../hooks/useNewMemberDice";
import { useToast } from "../components/common/ToastProvider";
import { getVaultStatus } from "../api/vaultApi";

const VAULT_SEED_AMOUNT = 10000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

const DiceFace: React.FC<{ value?: number; isRolling?: boolean }> = ({ value, isRolling }) => {
  const dots = useMemo(() => {
    const positions: Record<number, string[]> = {
      1: ["col-start-2 row-start-2"],
      2: ["col-start-1 row-start-1", "col-start-3 row-start-3"],
      3: ["col-start-1 row-start-1", "col-start-2 row-start-2", "col-start-3 row-start-3"],
      4: ["col-start-1 row-start-1", "col-start-3 row-start-1", "col-start-1 row-start-3", "col-start-3 row-start-3"],
      5: [
        "col-start-1 row-start-1",
        "col-start-3 row-start-1",
        "col-start-2 row-start-2",
        "col-start-1 row-start-3",
        "col-start-3 row-start-3",
      ],
      6: [
        "col-start-1 row-start-1",
        "col-start-1 row-start-2",
        "col-start-1 row-start-3",
        "col-start-3 row-start-1",
        "col-start-3 row-start-2",
        "col-start-3 row-start-3",
      ],
    };
    if (!value) return [];
    return positions[value] || [];
  }, [value]);

  if (!value) {
    return <div className="h-16 w-16 rounded-xl border-2 border-dashed border-white/50 bg-white/10" />;
  }

  return (
    <div
      className={`grid h-16 w-16 grid-cols-3 grid-rows-3 gap-1 rounded-xl border-2 border-gold-300 bg-gradient-to-br from-white to-gold-50 p-2 shadow-lg ${
        isRolling ? "animate-spin-fast" : ""
      }`}
      aria-label={`주사위 ${value}`}
    >
      {dots.map((pos, i) => (
        <div key={i} className={`${pos} flex items-center justify-center`}>
          <div className="h-2.5 w-2.5 rounded-full bg-slate-900 shadow-inner" />
        </div>
      ))}
    </div>
  );
};

type TransferStage = "idle" | "overlay" | "fly" | "vault" | "done";

const outcomeToUiMessage = (outcome: "WIN" | "LOSE" | null) => {
  if (outcome === "WIN") return "🎁 잭팟 성공! 이벤트 확인하기";
  if (outcome === "LOSE") return "🚨 잭팟 당첨 실패… 하지만!";
  return null;
};

const NewMemberDicePage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { data, isLoading, isError, error } = useNewMemberDiceStatus();
  const playMutation = usePlayNewMemberDice();

  const [isRolling, setIsRolling] = useState(false);
  const [isDiceSpinning, setIsDiceSpinning] = useState(false);
  const [userDice, setUserDice] = useState<number | null>(null);
  const [dealerDice, setDealerDice] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<"WIN" | "LOSE" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [winLink, setWinLink] = useState<string>("https://ccc-010.com");
  const [uiError, setUiError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  const [vaultTargetAmount, setVaultTargetAmount] = useState<number>(0);
  const [vaultDisplayedAmount, setVaultDisplayedAmount] = useState<number>(0);
  const [vaultFlashPositive, setVaultFlashPositive] = useState(false);
  const [transferStage, setTransferStage] = useState<TransferStage>("idle");

  const initializedRef = useRef(false);
  const progressTimersRef = useRef<number[]>([]);
  const numberAnimRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!data) return;
    setWinLink(data.winLink);

    if (initializedRef.current) return;
    initializedRef.current = true;

    // Sync vault amount from server so the displayed value matches actual vault_balance
    // (e.g., already unlocked, already filled, or seeded by backend status).
    let cancelled = false;
    void (async () => {
      try {
        const vault = await getVaultStatus();
        if (cancelled) return;
        const amount = typeof vault.vaultBalance === "number" ? vault.vaultBalance : 0;
        setVaultTargetAmount(amount);
        setVaultDisplayedAmount(amount);
      } catch {
        // Keep existing UI value if vault status cannot be loaded.
      }
    })();

    if (data.alreadyPlayed) {
      setUserDice(typeof data.lastUserDice === "number" ? data.lastUserDice : null);
      setDealerDice(typeof data.lastDealerDice === "number" ? data.lastDealerDice : null);
      setOutcome(data.lastOutcome ?? null);
      setMessage(outcomeToUiMessage(data.lastOutcome ?? null));
    }

    return () => {
      cancelled = true;
    };
  }, [data]);

  useEffect(() => {
    return () => {
      progressTimersRef.current.forEach((t) => window.clearTimeout(t));
      progressTimersRef.current = [];
      if (numberAnimRafRef.current) window.cancelAnimationFrame(numberAnimRafRef.current);
    };
  }, []);

  useEffect(() => {
    if (vaultTargetAmount === vaultDisplayedAmount) return;
    if (numberAnimRafRef.current) window.cancelAnimationFrame(numberAnimRafRef.current);

    const start = performance.now();
    const durationMs = 800;
    const from = vaultDisplayedAmount;
    const to = vaultTargetAmount;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeOutCubic(t);
      setVaultDisplayedAmount(Math.round(from + (to - from) * eased));
      if (t < 1) {
        numberAnimRafRef.current = window.requestAnimationFrame(tick);
      }
    };

    numberAnimRafRef.current = window.requestAnimationFrame(tick);
  }, [vaultDisplayedAmount, vaultTargetAmount]);

  const mapErrorMessage = (err: unknown) => {
    const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
    if (code === "NEW_MEMBER_DICE_NOT_ELIGIBLE") return "참여 대상 확인이 필요합니다. 지민이에게 문의해주세요.";
    if (code === "NEW_MEMBER_DICE_ALREADY_PLAYED") return "이미 1회 참여가 완료되었습니다.";
    return "지금은 게임을 진행할 수 없어요. 잠시 후 다시 시도해주세요.";
  };

  const canPlay = !!data?.eligible && !data.alreadyPlayed && !isRolling && !playMutation.isPending;

  const handlePlay = async () => {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        (navigator as Navigator & { vibrate?: (pattern: number | number[]) => boolean }).vibrate?.(10);
      } catch {
        // ignore
      }
    }

    setUiError(null);
    setOutcome(null);
    setMessage(null);
    setProgressMessage(null);
    setTransferStage("idle");
    setIsRolling(true);
    setIsDiceSpinning(true);

    progressTimersRef.current.forEach((t) => window.clearTimeout(t));
    progressTimersRef.current = [];
    setProgressMessage("게임을 시작하겠습니다");
    progressTimersRef.current.push(
      window.setTimeout(() => {
        setProgressMessage("카케쿠루이마쇼우");
      }, 500),
    );

    try {
      const resp = await playMutation.mutateAsync();
      await new Promise((r) => setTimeout(r, 1200));
      setUserDice(resp.userDice[0] ?? null);
      setDealerDice(resp.dealerDice[0] ?? null);
      setIsDiceSpinning(false);
      setWinLink(resp.winLink);

      if (resp.outcome === "LOSE") {
        setProgressMessage(null);

        // 1) 전환 오버레이(짧게)
        setTransferStage("overlay");
        await sleep(900);

        // 2) 금고로 슝 이동(Fly-to-vault)
        setTransferStage("fly");
        await sleep(50);
        setTransferStage("vault");
        await sleep(650);

        // 3) 숫자 드르륵 + 플래시 + 결과 카드
        setTransferStage("done");
        setVaultFlashPositive(true);
        setVaultTargetAmount(VAULT_SEED_AMOUNT);
        addToast(`임시 금고에 +${formatWon(VAULT_SEED_AMOUNT)} 보관 완료`, "success");
        window.setTimeout(() => setVaultFlashPositive(false), 650);

        setOutcome("LOSE");
        setMessage(outcomeToUiMessage("LOSE"));
      } else {
        setOutcome(resp.outcome);
        setMessage(outcomeToUiMessage(resp.outcome));
        setProgressMessage("게임이 완료되었습니다");
      }
    } catch (e) {
      setUiError(mapErrorMessage(e));
      setProgressMessage(null);
    } finally {
      setIsRolling(false);
      setIsDiceSpinning(false);
    }
  };

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-white/15 bg-christmas-gradient p-8 text-dark-900 shadow-2xl">
        <div className="flex flex-col items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-400 border-t-transparent" />
          <p className="mt-4 text-lg font-semibold text-dark-800">게임 정보를 불러오는 중...</p>
        </div>
      </section>
    );
  }

  if (isError || !data) {
    const msg = mapErrorMessage(error) ?? "게임 정보를 불러오지 못했습니다.";
    return (
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-white/15 bg-christmas-gradient p-8 text-center text-dark-900 shadow-2xl">
        <p className="text-xl font-bold text-dark-900">게임 정보를 불러오지 못했습니다.</p>
        <p className="mt-2 text-sm text-dark-700">{msg}</p>
      </section>
    );
  }

  return (
    <LayoutGroup>
      <section className="relative mx-auto w-full max-w-3xl space-y-6 rounded-3xl border border-white/15 bg-christmas-gradient p-8 text-dark-900 shadow-2xl">
        <AnimatePresence>
          {transferStage === "overlay" && (
            <motion.div
              className="absolute inset-0 z-40 flex items-center justify-center rounded-3xl bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-full max-w-sm rounded-2xl border border-white/20 bg-white/10 p-5 text-center text-slate-50 shadow-xl">
                <p className="text-sm font-semibold text-slate-100">신규 유저 보호 시스템 가동 중…</p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full w-1/3 rounded-full bg-white/60"
                    initial={{ x: "-120%" }}
                    animate={{ x: "320%" }}
                    transition={{ duration: 0.9, ease: "easeInOut" }}
                  />
                </div>
                <p className="mt-3 text-xs text-slate-200">자산을 안전하게 이동 중입니다</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-start justify-between gap-4">
          <header className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-gold-200">New Member</p>
            <h1 className="mt-2 text-3xl font-bold text-dark-900">신규회원 주사위 이벤트</h1>
            <p className="mt-2 text-sm font-semibold text-dark-700">잭팟에 실패해도, 내 자산은 안전하게 보관됩니다</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-dark-900 ring-1 ring-white/25">무료 1회 참여</span>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-dark-900 ring-1 ring-white/25">크리스마스 시즌</span>
            </div>
          </header>

          <aside className="shrink-0 rounded-3xl border border-white/15 bg-black/40 px-5 py-4 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <div className="relative">
                {vaultTargetAmount > 0 && (
                  <span className="absolute inset-0 rounded-full bg-gold-300/20 blur-sm animate-pulse" aria-hidden="true" />
                )}
                <span className="relative text-xl text-gold-200" aria-label="금고">
                  🔒
                </span>
              </div>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-slate-200">임시 금고 보관금</p>
                <p className={`tabular-nums text-2xl font-extrabold ${vaultFlashPositive ? "text-emerald-200" : "text-gold-200"}`}>
                  {formatWon(vaultDisplayedAmount)}
                </p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-200">인증 충전 1콩 → 즉시 합산</p>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="rounded-full bg-gold-500 px-3.5 py-1.5 text-sm font-bold text-dark-900 active:scale-95 transition"
              >
                금고 확인
              </button>
            </div>
            <AnimatePresence>
              {transferStage === "vault" && (
                <motion.div className="mt-2 inline-flex" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                  <motion.div
                    layoutId="vault-token"
                    className="rounded-full bg-gold-500/20 px-2 py-1 text-[10px] font-extrabold text-gold-100 ring-1 ring-gold-300/30"
                  >
                    +{formatWon(VAULT_SEED_AMOUNT)}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </aside>
        </div>

      <div className="grid gap-6 rounded-2xl bg-white/20 p-6 ring-1 ring-white/20 backdrop-blur-sm sm:grid-cols-2">
        <div className="text-center">
          <p className="mb-3 text-sm font-semibold text-dark-800">나</p>
          <div className="flex justify-center">
            <DiceFace value={userDice ?? undefined} isRolling={isDiceSpinning} />
          </div>
        </div>
        <div className="text-center">
          <p className="mb-3 text-sm font-semibold text-dark-800">상대</p>
          <div className="flex justify-center">
            <DiceFace value={dealerDice ?? undefined} isRolling={isDiceSpinning} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {transferStage === "fly" && (
          <motion.div
            className="pointer-events-none flex justify-center"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            <motion.div layoutId="vault-token" className="rounded-full bg-gold-500 px-3 py-1.5 text-xs font-extrabold text-dark-900 shadow-lg">
              {formatWon(VAULT_SEED_AMOUNT)}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {uiError && (
        <div className="rounded-xl border border-white/25 bg-white/20 px-4 py-3 text-center text-sm font-semibold text-dark-900 backdrop-blur-sm">
          {uiError}
        </div>
      )}

      {!data.eligible && (
        <div className="rounded-xl border border-white/25 bg-white/20 px-4 py-3 text-center text-sm text-dark-800 backdrop-blur-sm">
          참여 대상 확인이 필요합니다. 지민이에게 문의해주세요.
        </div>
      )}

      {data.alreadyPlayed && (
        <div className="rounded-xl border border-white/25 bg-white/20 px-4 py-3 text-center text-sm font-semibold text-dark-900 backdrop-blur-sm">
          이미 1회 참여가 완료되었습니다.
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={handlePlay}
          disabled={!canPlay}
          className="w-full rounded-full bg-gradient-to-r from-primary-600 to-secondary-600 px-8 py-4 text-lg font-bold text-dark-900 shadow-lg transition hover:from-primary-500 hover:to-secondary-500 disabled:cursor-not-allowed disabled:from-dark-200 disabled:to-dark-200 disabled:text-dark-500"
        >
          {isRolling || playMutation.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              굴리는 중...
            </span>
          ) : (
            "🎲 게임 시작(1회)"
          )}
        </button>

        {(isRolling || playMutation.isPending || progressMessage) && (
          <div className="rounded-xl border border-white/25 bg-white/20 px-4 py-3 text-center text-sm font-semibold text-dark-900 backdrop-blur-sm">
            {progressMessage ?? "게임을 준비 중입니다"}
          </div>
        )}

        {message && (
          <div className="rounded-2xl bg-white/20 p-5 text-center ring-1 ring-white/20 backdrop-blur-sm">
            <p className={`text-2xl font-extrabold ${outcome === "WIN" ? "text-secondary-200" : "text-primary-200"}`}>{message}</p>
            {outcome === "LOSE" && (
              <>
                <p className="mt-3 text-sm font-semibold text-dark-800">시스템상 신규 정착 지원금이 임시 금고에 보관되었습니다.</p>
                <p className="mt-1 text-xs text-dark-700">그냥 두면 소멸될 수 있어요. 금고에서 바로 확인하세요.</p>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-gold-500 px-6 py-3 text-sm font-bold text-dark-50 shadow hover:bg-gold-400 active:scale-95 transition"
                >
                  💰 내 금고 확인하러 가기
                </button>
              </>
            )}
            {outcome === "WIN" && (
              <a
                href={winLink}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center justify-center rounded-full bg-gold-500 px-6 py-3 text-sm font-bold text-dark-50 shadow hover:bg-gold-400"
              >
                이벤트 확인하기
              </a>
            )}
          </div>
        )}
      </div>

      <footer className="text-center text-xs text-dark-600">신규회원 전용 이벤트 게임이며, 안내된 정책에 따라 처리됩니다.</footer>
      </section>
    </LayoutGroup>
  );
};

export default NewMemberDicePage;
