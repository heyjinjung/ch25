// src/admin/pages/AdminDashboardPage.tsx
import React from "react";
import { Link } from "react-router-dom";

const AdminDashboardPage: React.FC = () => {
  return (
    <section className="space-y-4 rounded-xl border border-emerald-800/40 bg-slate-900/70 p-6 shadow-lg shadow-emerald-900/30">
      <div>
        <h2 className="text-xl font-bold text-emerald-100">Admin 대시보드</h2>
        <p className="text-sm text-slate-300">TODO: 운영 지표와 바로가기를 배치합니다.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/admin/seasons" className="rounded-lg border border-emerald-800/40 bg-slate-900/60 p-3 text-slate-100 transition hover:border-emerald-500">
          시즌 설정
        </Link>
        <Link to="/admin/feature-schedule" className="rounded-lg border border-emerald-800/40 bg-slate-900/60 p-3 text-slate-100 transition hover:border-emerald-500">
          Feature 스케줄
        </Link>
        <Link to="/admin/roulette" className="rounded-lg border border-emerald-800/40 bg-slate-900/60 p-3 text-slate-100 transition hover:border-emerald-500">
          룰렛 설정
        </Link>
        <Link to="/admin/dice" className="rounded-lg border border-emerald-800/40 bg-slate-900/60 p-3 text-slate-100 transition hover:border-emerald-500">
          주사위 설정
        </Link>
        <Link to="/admin/lottery" className="rounded-lg border border-emerald-800/40 bg-slate-900/60 p-3 text-slate-100 transition hover:border-emerald-500">
          복권 설정
        </Link>
        <Link to="/admin/ranking" className="rounded-lg border border-emerald-800/40 bg-slate-900/60 p-3 text-slate-100 transition hover:border-emerald-500">
          랭킹 관리
        </Link>
        <Link to="/admin/game-tokens" className="rounded-lg border border-emerald-800/40 bg-slate-900/60 p-3 text-slate-100 transition hover:border-emerald-500">
          게임 토큰 지급
        </Link>
      </div>
    </section>
  );
};

export default AdminDashboardPage;
