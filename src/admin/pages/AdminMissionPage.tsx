// src/admin/pages/AdminMissionPage.tsx
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus, Trash2, X } from "lucide-react";
import { fetchMissions, createMission, updateMission, deleteMission, AdminMission, AdminMissionPayload } from "../api/adminMissionApi";
import { useToast } from "../../components/common/ToastProvider";
import type { AdminRewardType } from "../types/adminReward";
import { REWARD_TYPES } from "../constants/rewardTypes";

const toTimeInputValue = (value?: string | null) => {
    if (!value) return "";
    // API returns HH:MM or HH:MM:SS; HTML time input expects HH:MM.
    return value.slice(0, 5);
};

const AdminMissionPage: React.FC = () => {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const { data: missions, isLoading, error } = useQuery({
        queryKey: ["admin", "missions"],
        queryFn: fetchMissions,
    });

    const createMutation = useMutation({
        mutationFn: createMission,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "missions"] });
            addToast("미션이 생성되었습니다.", "success");
            setIsAdding(false);
        },
        onError: (err: any) => {
            addToast(`생성 실패: ${err.response?.data?.detail || err.message}`, "error");
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: number; payload: Partial<AdminMissionPayload> }) => updateMission(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "missions"] });
            addToast("미션이 수정되었습니다.", "success");
            setEditingId(null);
        },
        onError: (err: any) => {
            addToast(`수정 실패: ${err.response?.data?.detail || err.message}`, "error");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteMission,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "missions"] });
            addToast("미션이 영구 삭제되었습니다.", "success");
        },
        onError: (err: any) => {
            addToast(`삭제 실패: ${err.response?.data?.detail || err.message}`, "error");
        }
    });

    const emptyForm: AdminMissionPayload = {
        title: "",
        description: "",
        category: "DAILY",
        target_value: 1,
        reward_type: "DIAMOND",
        reward_amount: 5,
        xp_reward: 0,
        logic_key: "",
        action_type: "PLAY_GAME",
        start_time: "",
        end_time: "",
        auto_claim: false,
        is_active: true
    };

    const [form, setForm] = useState<AdminMissionPayload>(emptyForm);

    const handleEdit = (mission: AdminMission) => {
        setEditingId(mission.id);
        setForm({
            title: mission.title,
            description: mission.description,
            category: mission.category,
            target_value: mission.target_value,
            reward_type: mission.reward_type,
            reward_amount: mission.reward_amount,
            xp_reward: mission.xp_reward,
            logic_key: mission.logic_key,
            action_type: mission.action_type,
            start_time: toTimeInputValue(mission.start_time),
            end_time: toTimeInputValue(mission.end_time),
            auto_claim: mission.auto_claim ?? false,
            is_active: mission.is_active
        });
    };

    const handleSave = () => {
        const payload = {
            ...form,
            start_time: form.start_time ? form.start_time : null,
            end_time: form.end_time ? form.end_time : null,
            auto_claim: Boolean(form.auto_claim)
        };
        if (editingId) {
            updateMutation.mutate({ id: editingId, payload });
        } else {
            createMutation.mutate(payload as AdminMissionPayload);
        }
    };

    if (isLoading) return <div className="p-8 text-white">Loading missions...</div>;
    if (error) return <div className="p-8 text-red-500">Error loading missions</div>;

    return (
        <section className="space-y-5">
            <header>
                <h2 className="text-2xl font-bold text-[#91F402]">미션 관리 시스템</h2>
                <p className="mt-1 text-sm text-gray-400">
                    사용자 데일리/주간/특별 미션 설정 및 관리
                </p>
            </header>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                    onClick={() => { setIsAdding(true); setEditingId(null); setForm(emptyForm); }}
                    className="flex w-full items-center justify-center rounded-md bg-[#2D6B3B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#91F402] hover:text-black sm:w-auto"
                >
                    <Plus size={18} className="mr-2" /> 새 미션 추가
                </button>
            </div>

            {/* Form Overlay */}
            {(isAdding || editingId) && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111111] rounded-lg w-full max-w-2xl border border-[#333333] shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-[#333333]">
                            <h2 className="text-xl font-bold text-[#91F402]">
                                {editingId ? "미션 수정" : "새 미션 추가"}
                            </h2>
                            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">미션 제목</label>
                                <input
                                    className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">설명</label>
                                <textarea
                                    className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B] h-20"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">카테고리</label>
                                <select
                                    className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                                    value={form.category}
                                    onChange={e => setForm({ ...form, category: e.target.value as any })}
                                >
                                    <option value="DAILY">일일 (Daily)</option>
                                    <option value="WEEKLY">주간 (Weekly)</option>
                                    <option value="SPECIAL">특별 (Special)</option>
                                    <option value="NEW_USER">신규가입 (New User)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Logic Key (고유)</label>
                                <input
                                    className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                                    value={form.logic_key}
                                    placeholder="e.g. daily_login_v1"
                                    onChange={e => setForm({ ...form, logic_key: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">Action Type</label>
                                <select
                                    className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                                    value={form.action_type}
                                    onChange={e => setForm({ ...form, action_type: e.target.value })}
                                >
                                    <option value="PLAY_GAME">플레이 1회</option>
                                    <option value="LOGIN">로그인</option>
                                    <option value="JOIN_CHANNEL">채널 구독</option>
                                    <option value="SHARE">공유 (일반)</option>
                                    <option value="SHARE_STORY">스토리 공유</option>
                                    <option value="SHARE_WALLET">지갑 공유 (In-App)</option>
                                    <option value="CASH_OUT">출금</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">시작 시간 (HH:MM)</label>
                                <input
                                    type="time"
                                    className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                                    value={form.start_time || ""}
                                    onChange={e => setForm({ ...form, start_time: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">종료 시간 (HH:MM)</label>
                                <input
                                    type="time"
                                    className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                                    value={form.end_time || ""}
                                    onChange={e => setForm({ ...form, end_time: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">목표 수치</label>
                                <input
                                    type="number"
                                    className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                                    value={form.target_value}
                                    onChange={e => setForm({ ...form, target_value: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">보상 유형</label>
                                <select
                                    className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                                    value={form.reward_type}
                                    onChange={e => setForm({ ...form, reward_type: e.target.value as AdminRewardType })}
                                >
                                    {REWARD_TYPES.map(rt => (
                                        <option key={rt.value} value={rt.value}>{rt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1 uppercase">보상 수량</label>
                                <input
                                    type="number"
                                    className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] p-2 text-white focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]"
                                    value={form.reward_amount}
                                    onChange={e => setForm({ ...form, reward_amount: parseInt(e.target.value) })}
                                />
                            </div>
                            <div className="col-span-2 flex items-center gap-3 rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2">
                                <input
                                    id="auto_claim"
                                    type="checkbox"
                                    className="h-4 w-4 accent-[#2D6B3B]"
                                    checked={Boolean(form.auto_claim)}
                                    onChange={e => setForm({ ...form, auto_claim: e.target.checked })}
                                />
                                <label htmlFor="auto_claim" className="text-sm text-gray-200">조건 달성 시 자동 수령</label>
                            </div>
                        </div>
                        <div className="p-6 border-t border-[#333333] flex justify-end gap-3">
                            <button
                                onClick={() => { setIsAdding(false); setEditingId(null); }}
                                className="rounded-md border border-[#333333] bg-[#1A1A1A] px-4 py-2 text-sm text-gray-200 hover:bg-[#2C2C2E]"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="rounded-md bg-[#2D6B3B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#91F402] hover:text-black disabled:opacity-60"
                            >
                                {editingId ? "수정 완료" : "미션 생성"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mission List Table */}
            <div className="rounded-lg border border-[#333333] bg-[#111111] shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="border-b border-[#333333] bg-[#1A1A1A]">
                            <tr>
                                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-400">ID / Logic Key</th>
                                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-400">제목 / 카테고리</th>
                                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-400">조건 (Action / Target)</th>
                                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-400">시간 / 자동</th>
                                <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-400">보상</th>
                                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-400">상태</th>
                                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-400">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#333333]">
                            {missions?.map((mission, index) => (
                                <tr key={mission.id} className={index % 2 === 0 ? "bg-[#111111]" : "bg-[#1A1A1A]"}>
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-medium text-white">#{mission.id}</div>
                                        <div className="text-xs text-gray-500 font-mono">{mission.logic_key}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm font-medium text-white">{mission.title}</div>
                                        <div className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[10px] uppercase font-bold ${mission.category === 'DAILY' ? 'bg-blue-900/40 text-blue-400' :
                                            mission.category === 'WEEKLY' ? 'bg-purple-900/40 text-purple-400' :
                                                'bg-amber-900/40 text-amber-400'
                                            }`}>
                                            {mission.category}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-gray-300">{mission.action_type}</div>
                                        <div className="text-xs text-gray-500">Target: <span className="text-white">{mission.target_value}</span></div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="text-sm text-white">{mission.start_time && mission.end_time ? `${mission.start_time.slice(0, 5)} ~ ${mission.end_time.slice(0, 5)}` : "-"}</div>
                                        {mission.auto_claim && (
                                            <div className="mt-1 inline-flex rounded-full bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#91F402]">
                                                Auto-Claim
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {/* Icon Logic based on reward type */}
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${mission.reward_type === 'POINT' ? 'bg-[#91F402]/20 text-[#91F402]' :
                                                mission.reward_type === 'GAME_XP' ? 'bg-purple-500/20 text-purple-400' :
                                                    mission.reward_type === 'DIAMOND' ? 'bg-amber-400/20 text-amber-400' :
                                                        'bg-gray-700 text-gray-400'
                                                }`}>
                                                {mission.reward_type === 'POINT' ? 'P' :
                                                    mission.reward_type === 'GAME_XP' ? 'XP' :
                                                        mission.reward_type === 'DIAMOND' ? '💎' : '🎁'}
                                            </div>
                                            <span className={`text-sm font-bold ${mission.reward_type === 'POINT' ? 'text-[#91F402]' :
                                                mission.reward_type === 'GAME_XP' ? 'text-purple-400' :
                                                    'text-gray-200'
                                                }`}>
                                                {mission.reward_amount > 0 ? mission.reward_amount.toLocaleString() : mission.xp_reward > 0 ? mission.xp_reward.toLocaleString() : 0}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {REWARD_TYPES.find(r => r.value === mission.reward_type)?.label || mission.reward_type}
                                                {mission.xp_reward > 0 && mission.reward_type !== 'GAME_XP' && ` (+${mission.xp_reward} XP)`}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => {
                                                updateMutation.mutate({
                                                    id: mission.id,
                                                    payload: { is_active: !mission.is_active }
                                                });
                                            }}
                                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-all ${mission.is_active
                                                ? 'bg-[#2D6B3B] text-[#91F402] hover:bg-red-900/60 hover:text-red-200'
                                                : 'bg-red-900/60 text-red-200 hover:bg-[#2D6B3B] hover:text-[#91F402]'
                                                }`}
                                        >
                                            {mission.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(mission)}
                                                className="rounded p-1.5 text-gray-400 hover:bg-[#2D6B3B] hover:text-white"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm("정말 이 미션을 영구 삭제하시겠습니까? (복구 불가)")) {
                                                        deleteMutation.mutate(mission.id);
                                                    }
                                                }}
                                                className="rounded p-1.5 text-gray-400 hover:bg-red-900/60 hover:text-red-200"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {missions?.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        등록된 미션이 없습니다.
                    </div>
                )}
            </div>
        </section>
    );
};

export default AdminMissionPage;
