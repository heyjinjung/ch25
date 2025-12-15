import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCompleteSurvey, useSaveSurveyAnswers, useSurveySession } from "../hooks/useSurvey";
import { SurveyAnswerPayload, SurveyQuestion } from "../api/surveyApi";

const renderQuestion = (
  q: SurveyQuestion,
  answers: Record<number, SurveyAnswerPayload>,
  onChange: (next: SurveyAnswerPayload) => void
) => {
  const existing = answers[q.id];
  if (q.question_type === "TEXT") {
    return (
      <textarea
        className="w-full rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-100"
        placeholder={q.helper_text || "의견을 입력하세요"}
        value={existing?.answer_text || ""}
        onChange={(e) => onChange({ question_id: q.id, answer_text: e.target.value })}
      />
    );
  }
  if (q.question_type === "NUMBER") {
    return (
      <input
        type="number"
        className="w-full rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-100"
        value={existing?.answer_number ?? ""}
        onChange={(e) => onChange({ question_id: q.id, answer_number: Number(e.target.value) })}
      />
    );
  }
  return (
    <div className="space-y-2">
      {q.options.map((opt) => {
        const checked = existing?.option_id === opt.id;
        return (
          <label key={opt.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-100">
            <input
              type="radio"
              name={`q-${q.id}`}
              className="accent-emerald-500"
              checked={checked}
              onChange={() => onChange({ question_id: q.id, option_id: opt.id })}
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
};

const SurveyRunnerPage: React.FC = () => {
  const params = useParams();
  const surveyId = Number(params.surveyId);
  const { data, isLoading, isError, refetch } = useSurveySession(Number.isNaN(surveyId) ? undefined : surveyId);
  const [answerMap, setAnswerMap] = useState<Record<number, SurveyAnswerPayload>>({});
  const navigate = useNavigate();

  const responseId = data?.response.id ?? 0;
  const saveMutation = useSaveSurveyAnswers(surveyId, responseId);
  const completeMutation = useCompleteSurvey(surveyId, responseId);

  const mergedAnswers = useMemo(() => {
    const initial: Record<number, SurveyAnswerPayload> = {};
    data?.answers.forEach((a) => {
      initial[a.question_id] = a;
    });
    return { ...initial, ...answerMap };
  }, [answerMap, data?.answers]);

  const handleChange = (next: SurveyAnswerPayload) => {
    setAnswerMap((prev) => ({ ...prev, [next.question_id]: { ...prev[next.question_id], ...next } }));
  };

  const handleSave = async () => {
    const answers = Object.values(mergedAnswers);
    await saveMutation.mutateAsync({ answers, last_question_id: answers.at(-1)?.question_id });
  };

  const handleSubmit = async () => {
    await handleSave();
    await completeMutation.mutateAsync({ force_submit: true });
    navigate("/surveys");
  };

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
        <p className="text-sm font-semibold text-red-100">설문을 불러오지 못했습니다.</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full border border-emerald-600 px-3 py-2 text-xs font-semibold text-emerald-100 hover:bg-emerald-900/40"
          >
            다시 시도
          </button>
          <button
            type="button"
            onClick={() => navigate("/surveys")}
            className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
          >
            목록으로
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-2xl border border-emerald-800/40 bg-slate-950/80 p-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-200">Survey</p>
        <h1 className="text-2xl font-bold text-white">{data.survey.title}</h1>
        {data.survey.description && <p className="text-sm text-slate-300">{data.survey.description}</p>}
      </header>

      <div className="space-y-4">
        {data.survey.questions.map((q, idx) => (
          <article key={q.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400">Q{idx + 1}</p>
                <p className="text-base font-semibold text-white">{q.title}</p>
                {q.helper_text && <p className="text-xs text-slate-400">{q.helper_text}</p>}
              </div>
              {q.is_required && <span className="rounded-full bg-red-900/50 px-2 py-1 text-[10px] font-semibold text-red-100">필수</span>}
            </div>
            <div className="mt-3">{renderQuestion(q, mergedAnswers, handleChange)}</div>
          </article>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          임시 저장
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={completeMutation.isPending}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          제출하고 보상 받기
        </button>
        <button
          type="button"
          onClick={() => navigate("/surveys")}
          className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800"
        >
          목록으로
        </button>
      </div>
    </section>
  );
};

export default SurveyRunnerPage;
