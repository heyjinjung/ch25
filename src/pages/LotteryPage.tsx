// src/pages/LotteryPage.tsx
import React, { useMemo } from "react";
import { usePlayLottery, useLotteryStatus } from "../hooks/useLottery";
import FeatureGate from "../components/feature/FeatureGate";

const LotteryPage: React.FC = () => {
  const { data, isLoading, isError, error } = useLotteryStatus();
  const playMutation = usePlayLottery();

  const mapErrorMessage = (err: unknown) => {
    const code = (err as any)?.response?.data?.error?.code as string | undefined;
    if (code === "NO_FEATURE_TODAY") return "오늘 활성화된 이벤트가 없습니다.";
    if (code === "INVALID_FEATURE_SCHEDULE") return "이벤트 스케줄이 잘못되었습니다. 관리자에게 문의하세요.";
    if (code === "FEATURE_DISABLED") return "이벤트가 비활성화되었습니다.";
    return "복권 정보를 불러올 수 없습니다.";
  };

  const errorMessage = useMemo(() => {
    if (isLoading) return "";
    if (isError || !data) {
      return mapErrorMessage(error);
    }
    return "";
  }, [data, error, isError, isLoading]);

  const playErrorMessage = useMemo(() => {
    if (!playMutation.error) return undefined;
    return mapErrorMessage(playMutation.error);
  }, [playMutation.error]);

  const remainingLabel = useMemo(() => {
    if (!data) return "-";
    return data.remaining_plays === 0 ? "무제한" : `${data.remaining_plays}회`;
  }, [data]);
  const isUnlimited = data?.remaining_plays === 0;

  const handlePlay = async () => {
    try {
      await playMutation.mutateAsync();
    } catch (mutationError) {
      console.error("Lottery play failed", mutationError);
    }
  };

  const content = (() => {
    if (isLoading) {
      return (
        <section className="rounded-xl border border-emerald-800/40 bg-slate-900/60 p-6 text-center text-emerald-100 shadow-lg shadow-emerald-900/30">
          복권 정보를 불러오는 중입니다...
        </section>
      );
    }

    if (isError || !data) {
      return (
        <section className="rounded-xl border border-red-800/40 bg-red-950/60 p-6 text-center text-red-100 shadow-lg shadow-red-900/30">
          {errorMessage || String(error)}
        </section>
      );
    }

    return (
      <section className="space-y-6 rounded-xl border border-emerald-800/40 bg-slate-900/70 p-6 text-slate-100 shadow-lg shadow-emerald-900/30">
        <header className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-300">오늘의 이벤트</p>
          <h1 className="text-2xl font-bold text-emerald-100">오늘 복권 1회 뽑기</h1>
          <p className="text-sm text-slate-300">남은 횟수: {remainingLabel}</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.prizes.map((prize) => (
            <article key={prize.id} className="rounded-xl border border-emerald-800/40 bg-slate-900/60 p-4">
              <h3 className="text-lg font-semibold text-emerald-100">{prize.label}</h3>
              <p className="text-sm text-slate-200">
                보상: {prize.reward_type} {prize.reward_value}
              </p>
              {prize.stock !== undefined && prize.stock !== null && (
                <p className="text-xs text-slate-400">재고: {prize.stock}</p>
              )}
              {prize.is_active === false && <p className="text-xs text-red-300">비활성화된 상품</p>}
            </article>
          ))}
          {data.prizes.length === 0 && (
            <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-center text-slate-200">
              현재 당첨 가능 상품이 없습니다.
            </div>
          )}
        </div>

        <div className="space-y-3 text-center">
          {playErrorMessage && <p className="text-sm text-red-200">{playErrorMessage}</p>}
          <button
            type="button"
            disabled={playMutation.isPending || (!isUnlimited && data.remaining_plays <= 0)}
            onClick={handlePlay}
            className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-emerald-900"
          >
            {playMutation.isPending ? "뽑는 중..." : "복권 뽑기"}
          </button>
          {playMutation.data && (
            <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/40 px-4 py-3 text-emerald-50">
              <p className="text-lg font-semibold">당첨 상품: {playMutation.data.prize.label}</p>
              <p className="text-sm text-emerald-100">
                보상: {playMutation.data.prize.reward_type} {playMutation.data.prize.reward_value}
              </p>
              {playMutation.data.message && <p className="text-xs text-emerald-200">{playMutation.data.message}</p>}
              <p className="text-xs text-emerald-200">
                남은 횟수: {playMutation.data.remaining_plays === 0 ? "무제한" : `${playMutation.data.remaining_plays}회`}
              </p>
            </div>
          )}
          <p className="text-xs text-slate-400">일일 제한이 0이면 무제한으로 간주합니다.</p>
        </div>
      </section>
    );
  })();

  return <FeatureGate feature="LOTTERY">{content}</FeatureGate>;
};

export default LotteryPage;
