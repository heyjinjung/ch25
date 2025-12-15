import React from "react";
import { useNavigate } from "react-router-dom";
import { useActiveSurveys } from "../hooks/useSurvey";

const SurveyListPage: React.FC = () => {
  const { data, isLoading, isError, refetch } = useActiveSurveys();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-emerald-800/40 bg-slate-950/80 p-6">
        <p className="text-sm text-emerald-100">설문을 불러오는 중...</p>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="rounded-2xl border border-red-800/40 bg-slate-950/85 p-6">
        <p className="text-sm font-semibold text-red-100">설문 목록을 가져오지 못했습니다.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-3 rounded-full border border-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/40"
        >
          다시 시도
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-800/40 bg-slate-950/80 p-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-200">Survey</p>
          <h1 className="text-xl font-bold text-white">참여 가능한 설문</h1>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
        >
          새로고침
        </button>
      </header>

      {data.length === 0 ? (
        <p className="text-sm text-slate-300">현재 참여 가능한 설문이 없습니다.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((survey) => {
            const reward = survey.reward_json;
            const rewardLabel = reward?.reward_type || reward?.token_type;
            return (
            <article
              key={survey.id}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg shadow-emerald-900/20"
            >
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-200">{survey.channel}</p>
              <h2 className="mt-1 text-lg font-semibold text-white">{survey.title}</h2>
              {survey.description && <p className="mt-2 text-sm text-slate-300">{survey.description}</p>}
              {reward?.amount ? (
                <p className="mt-2 text-xs text-emerald-200">
                  보상: {reward.amount} {rewardLabel}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => navigate(`/surveys/${survey.id}`)}
                className="mt-3 inline-flex items-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400"
              >
                참여하기 →
              </button>
            </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default SurveyListPage;
