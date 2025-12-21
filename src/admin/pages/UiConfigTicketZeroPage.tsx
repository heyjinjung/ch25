import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Button from "../../components/common/Button";
import { fetchAdminUiConfig, upsertAdminUiConfig } from "../api/adminUiConfigApi";

type FormState = {
  title: string;
  body: string;
  primaryLabel: string;
  primaryUrl: string;
  secondaryLabel: string;
  secondaryUrl: string;
  note: string;
};

const DEFAULT_TICKET_ZERO: FormState = {
  title: "티켓이 잠깐 부족해요",
  body: "지금 이용하면 바로 이어서 플레이 가능합니다.",
  primaryLabel: "씨씨카지노 바로가기",
  primaryUrl: "https://ccc-010.com",
  secondaryLabel: "실장 텔레 문의",
  secondaryUrl: "https://t.me/jm956",
  note: "문구는 매일 변경됩니다.",
};

const DEFAULT_COIN_ZERO: FormState = {
  title: "코인이 부족해요",
  body: "씨씨카지노 이용/충전 후 바로 이어서 플레이 가능합니다.",
  primaryLabel: "씨씨카지노 바로가기",
  primaryUrl: "https://ccc-010.com",
  secondaryLabel: "실장 텔레 문의",
  secondaryUrl: "https://t.me/jm956",
  note: "문구는 매일 변경됩니다.",
};

const coerceFormState = (value: Record<string, any> | null, defaults: FormState): FormState => {
  const title = typeof value?.title === "string" ? value.title : defaults.title;
  const body = typeof value?.body === "string" ? value.body : defaults.body;

  const primaryLabel =
    typeof value?.primaryCta?.label === "string"
      ? value.primaryCta.label
      : typeof value?.primary_cta_label === "string"
        ? value.primary_cta_label
        : defaults.primaryLabel;
  const primaryUrl =
    typeof value?.primaryCta?.url === "string"
      ? value.primaryCta.url
      : typeof value?.primary_cta_url === "string"
        ? value.primary_cta_url
        : defaults.primaryUrl;

  const secondaryLabel =
    typeof value?.secondaryCta?.label === "string"
      ? value.secondaryCta.label
      : typeof value?.secondary_cta_label === "string"
        ? value.secondary_cta_label
        : typeof value?.cta_label === "string"
          ? value.cta_label
          : defaults.secondaryLabel;
  const secondaryUrl =
    typeof value?.secondaryCta?.url === "string"
      ? value.secondaryCta.url
      : typeof value?.secondary_cta_url === "string"
        ? value.secondary_cta_url
        : typeof value?.cta_url === "string"
          ? value.cta_url
          : defaults.secondaryUrl;

  const note = typeof value?.note === "string" ? value.note : defaults.note;

  return { title, body, primaryLabel, primaryUrl, secondaryLabel, secondaryUrl, note };
};

type UiConfigEditorProps = {
  configKey: string;
  heading: string;
  description: string;
  defaults: FormState;
};

const UiConfigEditor: React.FC<UiConfigEditorProps> = ({ configKey, heading, description, defaults }) => {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "ui-config", configKey],
    queryFn: () => fetchAdminUiConfig(configKey),
  });

  const initial = useMemo<FormState>(() => {
    const raw = (data?.value ?? null) as Record<string, any> | null;
    return coerceFormState(raw, defaults);
  }, [data?.value, defaults]);

  const [form, setForm] = useState<FormState>(defaults);

  useEffect(() => {
    if (!data) return;
    setForm(initial);
  }, [data, initial]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        value: {
          title: form.title,
          body: form.body,
          primaryCta: { label: form.primaryLabel, url: form.primaryUrl },
          secondaryCta: { label: form.secondaryLabel, url: form.secondaryUrl },
          note: form.note,
        },
      };
      return upsertAdminUiConfig(configKey, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "ui-config", configKey] });
    },
  });

  const updatedAt = data?.updated_at ? new Date(data.updated_at).toLocaleString("ko-KR") : "-";

  return (
    <section className="space-y-4 rounded-xl border border-emerald-800/40 bg-slate-900/70 p-6 shadow-lg shadow-emerald-900/30">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-100">{heading}</h2>
          <p className="text-xs text-slate-400">키: {configKey} · 최근 저장: {updatedAt}</p>
        </div>
        <p className="mt-2 text-sm text-slate-300">{description}</p>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-emerald-700/40 bg-slate-900 p-4 text-slate-200">불러오는 중...</div>
      )}
      {isError && (
        <div className="rounded-lg border border-red-500/40 bg-red-950 p-4 text-red-100">
          불러오기 실패: {(error as Error).message}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm text-slate-200">제목</label>
              <input
                className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-slate-200">노트(옵션)</label>
              <input
                className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
              />
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <label className="text-sm text-slate-200">본문</label>
            <textarea
              rows={3}
              className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-slate-100">Primary CTA (씨씨카지노)</p>
              <div className="mt-3 space-y-2">
                <input
                  className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                  value={form.primaryLabel}
                  onChange={(e) => setForm((prev) => ({ ...prev, primaryLabel: e.target.value }))}
                  placeholder="버튼 라벨"
                />
                <input
                  className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                  value={form.primaryUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, primaryUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-semibold text-slate-100">Secondary CTA (실장 텔레)</p>
              <div className="mt-3 space-y-2">
                <input
                  className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                  value={form.secondaryLabel}
                  onChange={(e) => setForm((prev) => ({ ...prev, secondaryLabel: e.target.value }))}
                  placeholder="버튼 라벨"
                />
                <input
                  className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                  value={form.secondaryUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, secondaryUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "저장 중..." : "저장"}
            </Button>
            <Button variant="secondary" onClick={() => setForm(initial)} disabled={mutation.isPending}>
              되돌리기
            </Button>
          </div>

          {mutation.isError && (
            <p className="mt-3 text-sm text-red-200">저장 실패: {(mutation.error as Error).message}</p>
          )}
          {mutation.isSuccess && <p className="mt-3 text-sm text-emerald-200">저장 완료</p>}
        </>
      )}
    </section>
  );
};

const UiConfigTicketZeroPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-800/40 bg-slate-900/70 p-6 shadow-lg shadow-emerald-900/30">
        <h1 className="text-2xl font-bold text-slate-100">UI 문구/CTA (전역)</h1>
        <p className="mt-2 text-sm text-slate-300">
          유저 화면에서 “부족 상태”에 노출되는 해결 경로 문구/CTA를 키별로 운영합니다.
        </p>
      </div>

      <UiConfigEditor
        configKey="ticket_zero"
        heading="티켓 0 안내/CTA"
        description="룰렛/주사위/복권에서 티켓이 0일 때 노출되는 문구/CTA"
        defaults={DEFAULT_TICKET_ZERO}
      />

      <UiConfigEditor
        configKey="coin_zero"
        heading="코인 부족 안내/CTA"
        description="코인(CC_COIN) 부족 상태에서 노출할 해결 경로 문구/CTA (현재는 운영 키만 준비)"
        defaults={DEFAULT_COIN_ZERO}
      />
    </div>
  );
};

export default UiConfigTicketZeroPage;
