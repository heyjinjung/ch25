import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, RefreshCw, Settings2 } from "lucide-react";
import { fetchAdminUiConfig, upsertAdminUiConfig } from "../api/adminUiConfigApi";
import { useToast } from "../../components/common/ToastProvider";
import {
  DEFAULT_EVENT_MODALS_CONFIG,
  EventModalsConfig,
  mergeEventModalsConfig,
  ModalKey,
} from "../../config/eventModalsConfig";

const CONFIG_KEY = "event_modals_hub";

const EventModalsHubPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [config, setConfig] = useState<EventModalsConfig>(DEFAULT_EVENT_MODALS_CONFIG);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["adminUiConfig", CONFIG_KEY],
    queryFn: () => fetchAdminUiConfig(CONFIG_KEY),
  });

  useEffect(() => {
    if (data?.value) {
      setConfig(mergeEventModalsConfig(data.value));
    } else {
      setConfig(DEFAULT_EVENT_MODALS_CONFIG);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (nextValue: EventModalsConfig) => upsertAdminUiConfig(CONFIG_KEY, { value: nextValue }),
    onSuccess: () => {
      addToast("저장되었습니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["adminUiConfig", CONFIG_KEY] });
    },
    onError: () => addToast("저장 실패", "error"),
  });

  const sectionOptions = useMemo(
    () => [...config.sections].sort((a, b) => a.order - b.order),
    [config.sections]
  );

  const updateConfigField = (field: keyof EventModalsConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const updateSection = (id: string, changes: Partial<EventModalsConfig["sections"][number]>) => {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => (section.id === id ? { ...section, ...changes } : section)),
    }));
  };

  const updateCard = (key: ModalKey, changes: Partial<EventModalsConfig["cards"][number]>) => {
    setConfig((prev) => ({
      ...prev,
      cards: prev.cards.map((card) => (card.key === key ? { ...card, ...changes } : card)),
    }));
  };

  const handleSave = () => {
    mutation.mutate(config);
  };

  if (isLoading) {
    return <div className="p-8 text-admin-text-primary">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto text-admin-text-primary space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="text-admin-brand" />
          이벤트모음 관리
        </h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-admin-card-hover rounded hover:bg-white/10 text-sm flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={16} /> 새로고침
          </button>
          <button
            onClick={() => setConfig(DEFAULT_EVENT_MODALS_CONFIG)}
            className="px-4 py-2 bg-admin-card-hover rounded hover:bg-white/10 text-sm transition-colors"
          >
            기본값 복원
          </button>
          <button
            onClick={handleSave}
            disabled={mutation.isPending}
            className="btn-admin-primary flex items-center gap-2 px-6 py-2"
          >
            <Save size={16} /> 변경사항 저장
          </button>
        </div>
      </div>

      <div className="bg-admin-card rounded-xl p-6 border border-admin-border shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-admin-text-primary">헤더 설정</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            페이지 제목
            <input
              value={config.title}
              onChange={(e) => updateConfigField("title", e.target.value)}
              className="rounded-lg bg-admin-bg border border-admin-border px-3 py-2 text-admin-text-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            킥커(소제목)
            <input
              value={config.kicker}
              onChange={(e) => updateConfigField("kicker", e.target.value)}
              className="rounded-lg bg-admin-bg border border-admin-border px-3 py-2 text-admin-text-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            메인 문구
            <input
              value={config.subtitle}
              onChange={(e) => updateConfigField("subtitle", e.target.value)}
              className="rounded-lg bg-admin-bg border border-admin-border px-3 py-2 text-admin-text-primary"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm md:col-span-2">
            안내 문구
            <input
              value={config.note}
              onChange={(e) => updateConfigField("note", e.target.value)}
              className="rounded-lg bg-admin-bg border border-admin-border px-3 py-2 text-admin-text-primary"
            />
          </label>
        </div>
      </div>

      <div className="bg-admin-card rounded-xl p-6 border border-admin-border shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-admin-text-primary">섹션 설정</h2>
        <div className="grid gap-3">
          {sectionOptions.map((section) => (
            <div key={section.id} className="grid gap-3 rounded-lg border border-admin-border bg-admin-bg/60 p-4 md:grid-cols-6">
              <div className="md:col-span-2">
                <div className="text-xs text-admin-text-muted">ID</div>
                <div className="font-semibold text-admin-text-primary">{section.id}</div>
              </div>
              <label className="flex flex-col gap-1 text-sm md:col-span-2">
                제목
                <input
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  className="rounded-lg bg-admin-bg border border-admin-border px-3 py-2 text-admin-text-primary"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm md:col-span-2">
                설명
                <input
                  value={section.subtitle}
                  onChange={(e) => updateSection(section.id, { subtitle: e.target.value })}
                  className="rounded-lg bg-admin-bg border border-admin-border px-3 py-2 text-admin-text-primary"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                순서
                <input
                  type="number"
                  value={section.order}
                  onChange={(e) => updateSection(section.id, { order: Number(e.target.value) })}
                  className="rounded-lg bg-admin-bg border border-admin-border px-3 py-2 text-admin-text-primary"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={section.enabled !== false}
                  onChange={(e) => updateSection(section.id, { enabled: e.target.checked })}
                />
                노출
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-admin-card rounded-xl p-6 border border-admin-border shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-admin-text-primary">모달 카드 설정</h2>
        <div className="grid gap-3">
          {config.cards.map((card) => (
            <div key={card.key} className="grid gap-3 rounded-lg border border-admin-border bg-admin-bg/60 p-4 md:grid-cols-6">
              <div className="md:col-span-2">
                <div className="text-xs text-admin-text-muted">KEY</div>
                <div className="font-semibold text-admin-text-primary">{card.key}</div>
              </div>
              <label className="flex flex-col gap-1 text-sm md:col-span-2">
                제목
                <input
                  value={card.title}
                  onChange={(e) => updateCard(card.key, { title: e.target.value })}
                  className="rounded-lg bg-admin-bg border border-admin-border px-3 py-2 text-admin-text-primary"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm md:col-span-2">
                설명
                <input
                  value={card.description}
                  onChange={(e) => updateCard(card.key, { description: e.target.value })}
                  className="rounded-lg bg-admin-bg border border-admin-border px-3 py-2 text-admin-text-primary"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm md:col-span-2">
                뱃지(선택)
                <input
                  value={card.badge ?? ""}
                  onChange={(e) => updateCard(card.key, { badge: e.target.value || undefined })}
                  className="rounded-lg bg-admin-bg border border-admin-border px-3 py-2 text-admin-text-primary"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm md:col-span-2">
                섹션
                <select
                  value={card.sectionId}
                  onChange={(e) => updateCard(card.key, { sectionId: e.target.value })}
                  className="rounded-lg bg-admin-bg border border-admin-border px-3 py-2 text-admin-text-primary"
                >
                  {sectionOptions.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                순서
                <input
                  type="number"
                  value={card.order}
                  onChange={(e) => updateCard(card.key, { order: Number(e.target.value) })}
                  className="rounded-lg bg-admin-bg border border-admin-border px-3 py-2 text-admin-text-primary"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={card.enabled !== false}
                  onChange={(e) => updateCard(card.key, { enabled: e.target.checked })}
                />
                노출
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventModalsHubPage;
