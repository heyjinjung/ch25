// src/admin/pages/SegmentRulesPage.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Users,
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  Save,
  X,
  CheckCircle2,
  Settings,
  ChevronUp,
  ChevronDown
} from "lucide-react";
import {
  fetchSegmentRules,
  createSegmentRule,
  updateSegmentRule,
  deleteSegmentRule,
  AdminSegmentRule
} from "../api/adminSegmentRulesApi";

type SortKey = "id" | "name" | "segment" | "priority" | "enabled" | "created_at";

const ruleSchema = z.object({
  name: z.string().min(1, "규칙 이름은 필수입니다"),
  segment: z.string().min(1, "세그먼트는 필수입니다"),
  priority: z.number().min(0, "우선순위는 0 이상이어야 합니다"),
  enabled: z.boolean(),
  condition_json: z.object({}).passthrough(),
});

type RuleFormData = z.infer<typeof ruleSchema>;

const SegmentRulesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<RuleFormData>({
    name: "",
    segment: "",
    priority: 0,
    enabled: true,
    condition_json: {},
  });
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: "asc" | "desc" } | null>(null);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["admin", "segment-rules"],
    queryFn: fetchSegmentRules,
  });

  const sortedRules = rules ? [...rules].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;

    const aValue = a[key as keyof AdminSegmentRule];
    const bValue = b[key as keyof AdminSegmentRule];

    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    const result = aValue < bValue ? -1 : 1;
    return direction === "asc" ? result : -result;
  }) : [];

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" };
        return null;
      }
      return { key, direction: "asc" };
    });
  };

  const getSortIcon = (key: SortKey) => {
    if (sortConfig?.key !== key) return <RefreshCw className="h-3 w-3 opacity-0 group-hover:opacity-30" />;
    return sortConfig.direction === "asc" ? <ChevronUp className="h-3 w-3 text-admin-brand" /> : <ChevronDown className="h-3 w-3 text-admin-brand" />;
  };

  const createMutation = useMutation({
    mutationFn: createSegmentRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "segment-rules"] });
      setIsCreating(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) => updateSegmentRule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "segment-rules"] });
      setEditingId(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSegmentRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "segment-rules"] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      segment: "",
      priority: 0,
      enabled: true,
      condition_json: {},
    });
  };

  const handleEdit = (rule: AdminSegmentRule) => {
    setEditingId(rule.id);
    setFormData({
      name: rule.name,
      segment: rule.segment,
      priority: rule.priority,
      enabled: rule.enabled,
      condition_json: rule.condition_json,
    });
  };

  const handleSave = () => {
    const validation = ruleSchema.safeParse(formData);
    if (!validation.success) {
      alert(validation.error.errors[0].message);
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: formData });
    } else if (isCreating) {
      createMutation.mutate({
        name: formData.name,
        segment: formData.segment,
        priority: formData.priority,
        enabled: formData.enabled,
        condition_json: formData.condition_json,
      });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsCreating(false);
    resetForm();
  };

  return (
    <section className="admin-page-container space-y-10 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-admin-accent">
            <Settings className="h-5 w-5" />
            <span className="text-admin-meta font-black uppercase tracking-[0.2em]">Segment Rules Management</span>
          </div>
          <h1 className="text-admin-title text-admin-text-primary">세그먼트 규칙 관리</h1>
          <p className="text-admin-body text-admin-text-secondary font-medium">
            회원 세그먼트 자동 분류 규칙을 생성하고 관리합니다.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin", "segment-rules"] })}
            disabled={isLoading}
            className="btn-admin-secondary flex items-center gap-2 px-5 py-2.5 h-auto disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> 새로고침
          </button>
          {!isCreating && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="btn-admin-primary flex items-center gap-2 px-5 py-2.5 h-auto shadow-admin-glow"
            >
              <Plus className="h-4 w-4" /> 규칙 생성
            </button>
          )}
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card-premium p-6 flex flex-col justify-between h-32">
          <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">총 규칙 수</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-admin-text-primary">{rules?.length || 0}</p>
            <Settings className="h-5 w-5 text-admin-brand mb-1" />
          </div>
        </div>
        <div className="admin-card-premium p-6 flex flex-col justify-between h-32">
          <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">활성 규칙</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-admin-accent">{rules?.filter(r => r.enabled).length || 0}</p>
            <CheckCircle2 className="h-5 w-5 text-admin-accent mb-1" />
          </div>
        </div>
        <div className="admin-card-premium p-6 flex flex-col justify-between h-32 border-l-4 border-admin-warning">
          <p className="text-[10px] font-black text-admin-text-muted uppercase tracking-widest">비활성 규칙</p>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-black text-admin-warning">{rules?.filter(r => !r.enabled).length || 0}</p>
            <Users className="h-5 w-5 text-admin-warning mb-1" />
          </div>
        </div>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="admin-card-premium p-8">
          <div className="flex items-center gap-3 border-b border-admin-border pb-6 mb-6">
            <Plus className="h-6 w-6 text-admin-accent" />
            <div>
              <h2 className="text-admin-subtitle font-black text-admin-text-primary">새 규칙 생성</h2>
              <p className="text-xs text-admin-text-secondary mt-1">세그먼트 자동 분류 규칙을 만듭니다</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest block mb-2">
                규칙 이름
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: VIP 회원 자동 분류"
                className="admin-input h-11 w-full"
              />
            </div>

            <div>
              <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest block mb-2">
                세그먼트
              </label>
              <select
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                className="admin-input h-11 w-full"
              >
                <option value="">선택...</option>
                <option value="VIP">VIP</option>
                <option value="WHALE">WHALE</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="CHURN">CHURN</option>
              </select>
            </div>

            <div>
              <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest block mb-2">
                우선순위
              </label>
              <input
                type="number"
                min="0"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                className="admin-input h-11 w-full"
              />
            </div>

            <div>
              <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest block mb-2">
                활성 상태
              </label>
              <select
                value={formData.enabled ? "true" : "false"}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.value === "true" })}
                className="admin-input h-11 w-full"
              >
                <option value="true">활성</option>
                <option value="false">비활성</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-admin-secondary flex items-center gap-2 px-5 py-2.5"
            >
              <X className="h-4 w-4" /> 취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={createMutation.isPending}
              className="btn-admin-primary flex items-center gap-2 px-5 py-2.5 shadow-admin-glow disabled:opacity-50"
            >
              {createMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> 저장 중...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> 저장
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Rules Table */}
      <div className="admin-card-premium overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <RefreshCw className="h-8 w-8 text-admin-brand animate-spin" />
            <p className="text-admin-meta text-admin-text-secondary">데이터 로딩 중...</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="admin-table">
              <thead>
                <tr className="admin-th">
                  <th className="px-4 py-3.5 text-left cursor-pointer group" onClick={() => handleSort("id")}>
                    <div className="flex items-center gap-1">
                      ID {getSortIcon("id")}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left cursor-pointer group" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1">
                      규칙 이름 {getSortIcon("name")}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-center cursor-pointer group" onClick={() => handleSort("segment")}>
                    <div className="flex items-center justify-center gap-1">
                      세그먼트 {getSortIcon("segment")}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-center cursor-pointer group" onClick={() => handleSort("priority")}>
                    <div className="flex items-center justify-center gap-1">
                      우선순위 {getSortIcon("priority")}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-center cursor-pointer group" onClick={() => handleSort("enabled")}>
                    <div className="flex items-center justify-center gap-1">
                      상태 {getSortIcon("enabled")}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-center cursor-pointer group" onClick={() => handleSort("created_at")}>
                    <div className="flex items-center justify-center gap-1">
                      생성일 {getSortIcon("created_at")}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-center">액션</th>
                </tr>
              </thead>
              <tbody>
                {sortedRules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-admin-text-muted text-sm">
                      규칙이 없습니다. 새 규칙을 생성해주세요.
                    </td>
                  </tr>
                ) : (
                  sortedRules.map((rule: AdminSegmentRule) => (
                    <tr key={rule.id} className="admin-td group">
                      <td className="px-4 py-4 font-mono text-admin-text-primary">{rule.id}</td>
                      <td className="px-4 py-4">
                        <span className="text-admin-text-primary font-bold">{rule.name}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-admin-brand/20 text-admin-brand">
                          {rule.segment}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-admin-text-primary font-black tabular-nums">{rule.priority}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${rule.enabled ? "bg-admin-accent/20 text-admin-accent" : "bg-admin-text-muted/20 text-admin-text-muted"
                          }`}>
                          {rule.enabled ? "활성" : "비활성"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center text-admin-text-secondary text-xs tabular-nums">
                        {new Date(rule.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(rule)}
                            className="p-2 rounded-lg hover:bg-admin-brand/10 text-admin-brand transition-colors"
                            aria-label="규칙 수정"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`"${rule.name}" 규칙을 삭제하시겠습니까?`)) {
                                deleteMutation.mutate(rule.id);
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-admin-danger/10 text-admin-danger transition-colors"
                            aria-label="규칙 삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal (simplified inline form shown when editing) */}
      {editingId && (
        <div className="admin-card-premium p-8">
          <div className="flex items-center gap-3 border-b border-admin-border pb-6 mb-6">
            <Edit3 className="h-6 w-6 text-admin-brand" />
            <div>
              <h2 className="text-admin-subtitle font-black text-admin-text-primary">규칙 수정</h2>
              <p className="text-xs text-admin-text-secondary mt-1">기존 규칙을 수정합니다</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest block mb-2">
                규칙 이름
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="admin-input h-11 w-full"
              />
            </div>

            <div>
              <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest block mb-2">
                세그먼트
              </label>
              <select
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                className="admin-input h-11 w-full"
              >
                <option value="VIP">VIP</option>
                <option value="WHALE">WHALE</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
                <option value="CHURN">CHURN</option>
              </select>
            </div>

            <div>
              <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest block mb-2">
                우선순위
              </label>
              <input
                type="number"
                min="0"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                className="admin-input h-11 w-full"
              />
            </div>

            <div>
              <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest block mb-2">
                활성 상태
              </label>
              <select
                value={formData.enabled ? "true" : "false"}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.value === "true" })}
                className="admin-input h-11 w-full"
              >
                <option value="true">활성</option>
                <option value="false">비활성</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-admin-secondary flex items-center gap-2 px-5 py-2.5"
            >
              <X className="h-4 w-4" /> 취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="btn-admin-primary flex items-center gap-2 px-5 py-2.5 shadow-admin-glow disabled:opacity-50"
            >
              {updateMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> 저장 중...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" /> 저장
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default SegmentRulesPage;
