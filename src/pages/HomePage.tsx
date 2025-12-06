// src/pages/HomePage.tsx
import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTodayFeature } from "../hooks/useTodayFeature";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useTodayFeature();

  useEffect(() => {
    if (!data) return;
    switch (data.feature_type) {
      case "ROULETTE":
        navigate("/roulette", { replace: true });
        break;
      case "DICE":
        navigate("/dice", { replace: true });
        break;
      case "LOTTERY":
        navigate("/lottery", { replace: true });
        break;
      case "RANKING":
        navigate("/ranking", { replace: true });
        break;
      default:
        break;
    }
  }, [data, navigate]);

  if (isLoading) {
    return (
      <section className="flex flex-col items-center justify-center rounded-xl border border-emerald-800/40 bg-slate-900/60 p-6 text-center shadow-lg shadow-emerald-900/30">
        <p className="text-lg font-semibold text-emerald-200">오늘 이용 가능한 이벤트를 불러오는 중입니다…</p>
        <div className="mt-4 h-10 w-10 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" aria-label="loading" />
      </section>
    );
  }

  if (isError) {
    return (
      <section className="space-y-4 rounded-xl border border-red-800/40 bg-red-950/60 p-6 text-center text-red-100 shadow-lg shadow-red-900/30">
        <p className="text-lg font-semibold">이벤트 정보를 불러오지 못했습니다.</p>
        <button
          type="button"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
          onClick={() => refetch()}
        >
          다시 시도
        </button>
      </section>
    );
  }

  if (data && data.feature_type !== "NONE") {
    return (
      <section className="rounded-xl border border-emerald-800/40 bg-slate-900/60 p-6 text-center shadow-lg shadow-emerald-900/30">
        <p className="text-lg font-semibold text-emerald-100">오늘의 이벤트로 이동 중입니다…</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-emerald-800/40 bg-slate-900/60 p-6 shadow-lg shadow-emerald-900/30">
        <h2 className="text-xl font-bold text-emerald-100">🎄 오늘은 진행 중인 이벤트가 없습니다.</h2>
        <p className="mt-2 text-sm text-slate-300">다른 게임을 둘러보거나 시즌 패스 진행도를 확인해 보세요.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/roulette" className="rounded-lg border border-emerald-800/40 bg-slate-900/70 p-4 text-slate-100 transition hover:border-emerald-500">
          <h3 className="text-lg font-semibold">룰렛</h3>
          <p className="text-sm text-slate-300">룰렛 게임으로 이동</p>
        </Link>
        <Link to="/dice" className="rounded-lg border border-emerald-800/40 bg-slate-900/70 p-4 text-slate-100 transition hover:border-emerald-500">
          <h3 className="text-lg font-semibold">주사위</h3>
          <p className="text-sm text-slate-300">주사위 게임 플레이</p>
        </Link>
        <Link to="/lottery" className="rounded-lg border border-emerald-800/40 bg-slate-900/70 p-4 text-slate-100 transition hover:border-emerald-500">
          <h3 className="text-lg font-semibold">복권</h3>
          <p className="text-sm text-slate-300">복권 추첨 참여</p>
        </Link>
        <Link to="/ranking" className="rounded-lg border border-emerald-800/40 bg-slate-900/70 p-4 text-slate-100 transition hover:border-emerald-500">
          <h3 className="text-lg font-semibold">랭킹</h3>
          <p className="text-sm text-slate-300">오늘의 랭킹 확인</p>
        </Link>
        <Link to="/season-pass" className="rounded-lg border border-emerald-800/40 bg-slate-900/70 p-4 text-slate-100 transition hover:border-emerald-500">
          <h3 className="text-lg font-semibold">시즌 패스</h3>
          <p className="text-sm text-slate-300">시즌 패스 진행 상황</p>
        </Link>
      </div>
    </section>
  );
};

export default HomePage;
