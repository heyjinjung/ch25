// src/pages/NewMemberDicePage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNewMemberDiceStatus, usePlayNewMemberDice } from "../hooks/useNewMemberDice";

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
    return <div className="h-16 w-16 rounded-xl border-2 border-dashed border-primary-200 bg-white/60" />;
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

const outcomeToMessage = (outcome: "WIN" | "LOSE" | null) => {
  if (outcome === "WIN") return "축하합니다! 에어드랍 이벤트 당첨 🎁";
  if (outcome === "LOSE") return "아쉽게도 이번엔 꽝! 다른 이벤트 혜택은 지민이에게 문의해주세요.";
  return null;
};

const NewMemberDicePage: React.FC = () => {
  const { data, isLoading, isError, error } = useNewMemberDiceStatus();
  const playMutation = usePlayNewMemberDice();

  const [isRolling, setIsRolling] = useState(false);
  const [userDice, setUserDice] = useState<number | null>(null);
  const [dealerDice, setDealerDice] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<"WIN" | "LOSE" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [winLink, setWinLink] = useState<string>("https://ccc-010.com");
  const [uiError, setUiError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);

  const initializedRef = useRef(false);
  const progressTimersRef = useRef<number[]>([]);

  useEffect(() => {
    if (!data) return;
    setWinLink(data.winLink);

    if (initializedRef.current) return;
    initializedRef.current = true;

    if (data.alreadyPlayed) {
      setUserDice(typeof data.lastUserDice === "number" ? data.lastUserDice : null);
      setDealerDice(typeof data.lastDealerDice === "number" ? data.lastDealerDice : null);
      setOutcome(data.lastOutcome ?? null);
      setMessage(outcomeToMessage(data.lastOutcome ?? null));
    }
  }, [data]);

  useEffect(() => {
    return () => {
      progressTimersRef.current.forEach((t) => window.clearTimeout(t));
      progressTimersRef.current = [];
    };
  }, []);

  const mapErrorMessage = (err: unknown) => {
    const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
    if (code === "NEW_MEMBER_DICE_NOT_ELIGIBLE") return "참여 대상 확인이 필요합니다. 지민이에게 문의해주세요.";
    if (code === "NEW_MEMBER_DICE_ALREADY_PLAYED") return "이미 1회 참여가 완료되었습니다.";
    return "지금은 게임을 진행할 수 없어요. 잠시 후 다시 시도해주세요.";
  };

  const canPlay = !!data?.eligible && !data.alreadyPlayed && !isRolling && !playMutation.isPending;

  const handlePlay = async () => {
    setUiError(null);
    setOutcome(null);
    setMessage(null);
    setProgressMessage(null);
    setIsRolling(true);

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
      setOutcome(resp.outcome);
      setMessage(resp.message);
      setWinLink(resp.winLink);
      setProgressMessage("게임이 완료되었습니다");
    } catch (e) {
      setUiError(mapErrorMessage(e));
      setProgressMessage(null);
    } finally {
      setIsRolling(false);
    }
  };

  if (isLoading) {
    return (
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-white/20 bg-gradient-to-br from-primary-50/50 via-white/10 to-secondary-50/50 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-400 border-t-transparent" />
          <p className="mt-4 text-lg font-semibold text-slate-700">게임 정보를 불러오는 중...</p>
        </div>
      </section>
    );
  }

  if (isError || !data) {
    const msg = mapErrorMessage(error) ?? "게임 정보를 불러오지 못했습니다.";
    return (
      <section className="mx-auto w-full max-w-3xl rounded-3xl border border-white/20 bg-gradient-to-br from-primary-50/50 via-white/10 to-secondary-50/50 p-8 text-center shadow-2xl backdrop-blur-xl">
        <p className="text-xl font-bold text-primary-800">게임 정보를 불러오지 못했습니다.</p>
        <p className="mt-2 text-sm text-slate-600">{msg}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 rounded-3xl border border-white/20 bg-gradient-to-br from-primary-50/50 via-white/10 to-secondary-50/50 p-8 shadow-2xl backdrop-blur-xl">
      <header className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary-700">New Member</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">신규회원 에어드랍 이벤트</h1>
        <p className="mt-2 text-sm font-semibold text-slate-700">가볍게 즐기는 주사위 한 판 🎲</p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-primary-900 ring-1 ring-white/20 backdrop-blur">
            무료 1회 참여
          </span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-secondary-900 ring-1 ring-white/20 backdrop-blur">
            크리스마스 시즌 🎄
          </span>
        </div>
      </header>

      <div className="grid gap-6 rounded-2xl bg-white/10 p-6 ring-1 ring-white/20 backdrop-blur sm:grid-cols-2">
        <div className="text-center">
          <p className="mb-3 text-sm font-semibold text-slate-800">나</p>
          <div className="flex justify-center">
            <DiceFace value={userDice ?? undefined} isRolling={isRolling} />
          </div>
        </div>
        <div className="text-center">
          <p className="mb-3 text-sm font-semibold text-slate-800">상대</p>
          <div className="flex justify-center">
            <DiceFace value={dealerDice ?? undefined} isRolling={isRolling} />
          </div>
        </div>
      </div>

      {uiError && (
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-primary-900 backdrop-blur">
          {uiError}
        </div>
      )}

      {!data.eligible && (
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm text-slate-700 backdrop-blur">
          참여 대상 확인이 필요합니다. 지민이에게 문의해주세요.
        </div>
      )}

      {data.alreadyPlayed && (
        <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-slate-800 backdrop-blur">
          이미 1회 참여가 완료되었습니다.
        </div>
      )}

      <div className="space-y-3">
        <button
          type="button"
          onClick={handlePlay}
          disabled={!canPlay}
          className="w-full rounded-full bg-gradient-to-r from-primary-600 to-secondary-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition hover:from-primary-500 hover:to-secondary-500 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300"
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
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-slate-800 backdrop-blur">
            {progressMessage ?? "게임을 준비 중입니다"}
          </div>
        )}

        {message && (
          <div className="rounded-2xl bg-white/10 p-5 text-center ring-1 ring-white/20 backdrop-blur">
            <p className={`text-2xl font-extrabold ${outcome === "WIN" ? "text-secondary-700" : "text-primary-700"}`}>{message}</p>
            {outcome === "WIN" && (
              <a
                href={winLink}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center justify-center rounded-full bg-gold-500 px-6 py-3 text-sm font-bold text-slate-900 shadow hover:bg-gold-400"
              >
                이벤트 확인하기
              </a>
            )}
          </div>
        )}
      </div>

      <footer className="text-center text-xs text-slate-500">
        이벤트 참여용 게임이며 시스템 보상은 지급되지 않습니다.
      </footer>
    </section>
  );
};

export default NewMemberDicePage;
