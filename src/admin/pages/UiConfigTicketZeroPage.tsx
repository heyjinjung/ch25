import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAdminUiConfig, upsertAdminUiConfig } from "../api/adminUiConfigApi";
import { formatKstDateTime } from "../../utils/kstTime";

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
  body: "지금 이용하시면 바로 충전/구매로 연결됩니다.",
  primaryLabel: "씨카드 바로가기",
  primaryUrl: "https://ccc-010.com",
  secondaryLabel: "실장 텔레 문의",
  secondaryUrl: "https://t.me/jm956",
  note: "문구는 매일 변경될 수 있습니다.",
};

const DEFAULT_COIN_ZERO: FormState = {
  title: "코인이 부족해요",
  body: "씨카드 이용/충전으로 바로 연결됩니다.",
  primaryLabel: "씨카드 바로가기",
  primaryUrl: "https://ccc-010.com",
  secondaryLabel: "실장 텔레 문의",
  secondaryUrl: "https://t.me/jm956",
  note: "문구는 매일 변경될 수 있습니다.",
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

  const inputClass = "admin-input w-full";
  const labelClass = "admin-label";
  const panelClass = "admin-card p-4";

  const PrimaryButton = ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button
      type="button"
      className="btn-admin-primary disabled:opacity-60"
      {...props}
    >
      {children}
    </button>
  );

  const SecondaryButton = ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button
      type="button"
      className="btn-admin-secondary disabled:opacity-60"
      {...props}
    >
      {children}
    </button>
  );

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

  const updatedAt = formatKstDateTime(data?.updated_at);

  return (
    <section className="admin-card space-y-4 p-6">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-admin-subtitle text-admin-text-primary">{heading}</h2>
          <p className="text-admin-meta text-admin-text-muted">키: {configKey} · 최근 수정: {updatedAt}</p>
        </div>
        <p className="mt-2 text-admin-body text-admin-text-secondary">{description}</p>
      </div>

      {isLoading && (
        <div className="admin-card p-4 text-admin-text-primary">불러오는 중...</div>
      )}
      {isError && (
        <div className="admin-card p-4 border-admin-danger/40 bg-admin-danger/10 text-admin-text-primary">
          불러오기 실패: {(error as Error).message}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className={labelClass} htmlFor={`${configKey}-title`}>제목</label>
              <input
                id={`${configKey}-title`}
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="제목을 입력하세요"
                title="제목"
              />
            </div>
            <div className="space-y-1">
              <label className={labelClass} htmlFor={`${configKey}-note`}>노트(옵션)</label>
              <input
                id={`${configKey}-note`}
                className={inputClass}
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="운영 메모(선택)"
                title="노트"
              />
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <label className={labelClass} htmlFor={`${configKey}-body`}>본문</label>
            <textarea
              id={`${configKey}-body`}
              className="admin-textarea w-full"
              value={form.body}
              onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
              placeholder="본문을 입력하세요"
              title="본문"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className={panelClass}>
              <p className="text-admin-body font-bold text-admin-text-primary">Primary CTA (씨카드)</p>
              <div className="mt-3 space-y-2">
                <input
                  className={inputClass}
                  value={form.primaryLabel}
                  onChange={(e) => setForm((prev) => ({ ...prev, primaryLabel: e.target.value }))}
                  placeholder="버튼 ?�벨"
                />
                <input
                  className={inputClass}
                  value={form.primaryUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, primaryUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className={panelClass}>
              <p className="text-admin-body font-bold text-admin-text-primary">Secondary CTA (실장 텔레)</p>
              <div className="mt-3 space-y-2">
                <input
                  className={inputClass}
                  value={form.secondaryLabel}
                  onChange={(e) => setForm((prev) => ({ ...prev, secondaryLabel: e.target.value }))}
                  placeholder="버튼 ?�벨"
                />
                <input
                  className={inputClass}
                  value={form.secondaryUrl}
                  onChange={(e) => setForm((prev) => ({ ...prev, secondaryUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <PrimaryButton onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              {mutation.isPending ? "저장 중..." : "저장"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setForm(initial)} disabled={mutation.isPending}>
              되돌리기
            </SecondaryButton>
          </div>

          {mutation.isError && (
            <p className="mt-3 text-admin-body text-admin-danger">저장 실패: {(mutation.error as Error).message}</p>
          )}
          {mutation.isSuccess && <p className="mt-3 text-admin-body text-admin-accent">저장 완료</p>}
        </>
      )}
    </section>
  );
};

const UiConfigTicketZeroPage: React.FC = () => {
  return (
    <section className="admin-page-container space-y-8">
      <header>
        <h2 className="text-admin-title text-admin-text-primary">UI 문구/CTA (티켓/코인 부족)</h2>
        <p className="mt-1 text-admin-body text-admin-text-secondary">티켓/코인이 부족한 상태에서 노출되는 안내 문구와 CTA를 운영자가 관리합니다.</p>
      </header>

      <UiConfigEditor
        configKey="ticket_zero"
        heading="티켓 0 안내/CTA"
        description="룰렛/주사위/복권에서 티켓이 0일 때 노출되는 문구/CTA"
        defaults={DEFAULT_TICKET_ZERO}
      />

      <UiConfigEditor
        configKey="coin_zero"
        heading="코인 부족 안내/CTA"
        description="코인(CC_COIN)이 부족한 상태에서 노출되는 문구/CTA (현재 운영 정책 기준)"
        defaults={DEFAULT_COIN_ZERO}
      />
    </section>
  );
};

export default UiConfigTicketZeroPage;
