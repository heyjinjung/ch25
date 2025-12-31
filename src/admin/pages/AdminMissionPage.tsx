// src/admin/pages/AdminMissionPage.tsx
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Plus, Trash2, X } from "lucide-react";
import { fetchMissions, createMission, updateMission, deleteMission, AdminMission, AdminMissionPayload } from "../api/adminMissionApi";
import { useToast } from "../../components/common/ToastProvider";

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
            addToast("미션이 비활성화되었습니다.", "success");
        },
        onError: (err: any) => {
            addToast(`비활성화 실패: ${err.response?.data?.detail || err.message}`, "error");
        }
    });

    const [form, setForm] = useState<AdminMissionPayload>({
        title: "",
        description: "",
        category: "DAILY",
        target_value: 1,
        reward_type: "DIAMOND",
        reward_amount: 5,
        xp_reward: 0,
        logic_key: "",
        action_type: "PLAY_GAME",
        is_active: true
    });

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
            is_active: mission.is_active
        });
    };

    const handleSave = () => {
        if (editingId) {
            updateMutation.mutate({ id: editingId, payload: form });
        } else {
            createMutation.mutate(form);
        }
    };

    if (isLoading) return <div className="p-8 text-white">Loading missions...</div>;
    if (error) return <div className="p-8 text-red-500">Error loading missions</div>;

    return (
        <div className="p-6 bg-[#1C1C1E] min-h-screen text-white">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[#91F402] flex items-center gap-2">
                        🎯 미션 관리 시스템
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">사용자 데일리/주간/특별 미션 설정 및 관리</p>
                </div>
                <button
                    onClick={() => { setIsAdding(true); setEditingId(null); }}
                    className="flex items-center gap-2 bg-[#91F402] text-black px-4 py-2 rounded-lg font-bold hover:brightness-110"
                >
                    <Plus size={18} /> 새 미션 추가
                </button>
            </div>

            {/* Form Overlay */}
            {(isAdding || editingId) && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#2C2C2E] rounded-2xl w-full max-w-2xl border border-white/10 shadow-2xl">
                        <div className="flex justify-between items-center p-6 border-b border-white/10">
                            <h2 className="text-xl font-bold">
                                {editingId ? "미션 수정" : "새 미션 추가"}
                            </h2>
                            <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="text-gray-400 hover:text-white">
                                <X />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">미션 제목</label>
                                <input
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 focus:border-[#91F402] outline-none"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">설명</label>
                                <textarea
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 focus:border-[#91F402] outline-none h-20"
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">카테고리</label>
                                <select
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 outline-none"
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
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Logic Key (고유)</label>
                                <input
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 outline-none"
                                    value={form.logic_key}
                                    placeholder="e.g. daily_login_v1"
                                    onChange={e => setForm({ ...form, logic_key: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Action Type</label>
                                <select
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 outline-none"
                                    value={form.action_type}
                                    onChange={e => setForm({ ...form, action_type: e.target.value })}
                                >
                                    <option value="PLAY_GAME">플레이 1회</option>
                                    <option value="LOGIN">로그인</option>
                                    <option value="SHARE">공유</option>
                                    <option value="CASH_OUT">출금</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">목표 수치</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 outline-none"
                                    value={form.target_value}
                                    onChange={e => setForm({ ...form, target_value: parseInt(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">보상 유형</label>
                                <select
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 outline-none"
                                    value={form.reward_type}
                                    onChange={e => setForm({ ...form, reward_type: e.target.value })}
                                >
                                    <option value="DIAMOND">다이아몬드</option>
                                    <option value="TICKET_ROULETTE">룰렛 티켓</option>
                                    <option value="TICKET_DICE">다이스 티켓</option>
                                    <option value="TICKET_LOTTERY">로또 티켓</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">보상 수량</label>
                                <input
                                    type="number"
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-2 outline-none"
                                    value={form.reward_amount}
                                    onChange={e => setForm({ ...form, reward_amount: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/10 flex justify-end gap-3">
                            <button
                                onClick={() => { setIsAdding(false); setEditingId(null); }}
                                className="px-6 py-2 rounded-lg bg-gray-700 font-bold hover:bg-gray-600"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={createMutation.isPending || updateMutation.isPending}
                                className="px-6 py-2 rounded-lg bg-[#91F402] text-black font-bold hover:brightness-110 disabled:opacity-50"
                            >
                                {editingId ? "수정 완료" : "미션 생성"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mission List Table */}
            <div className="bg-[#2C2C2E] rounded-2xl border border-white/10 overflow-hidden shadow-xl">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-black/20 text-gray-400 text-xs font-black uppercase tracking-widest border-b border-white/5">
                            <th className="px-6 py-4">ID / Logic Key</th>
                            <th className="px-6 py-4">제목 / 카테고리</th>
                            <th className="px-6 py-4">조건 (Action / Target)</th>
                            <th className="px-6 py-4">보상</th>
                            <th className="px-6 py-4 text-center">상태</th>
                            <th className="px-6 py-4 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {missions?.map(mission => (
                            <tr key={mission.id} className="hover:bg-white/5 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-white">#{mission.id}</div>
                                    <div className="text-[10px] text-gray-500 font-mono tracking-tighter">{mission.logic_key}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-white">{mission.title}</div>
                                    <div className={`inline-block text-[10px] px-1.5 rounded uppercase font-black mt-1 ${mission.category === 'DAILY' ? 'bg-blue-900/40 text-blue-400' :
                                        mission.category === 'WEEKLY' ? 'bg-purple-900/40 text-purple-400' :
                                            'bg-amber-900/40 text-amber-400'
                                        }`}>
                                        {mission.category}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-medium">{mission.action_type}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">Target: <span className="text-white">{mission.target_value}</span></div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 rounded-full bg-amber-400/20 flex items-center justify-center text-[10px] text-amber-400">💎</div>
                                        <span className="font-bold text-[#91F402]">{mission.reward_amount}</span>
                                        <span className="text-[10px] text-gray-500">{mission.reward_type}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${mission.is_active ? 'bg-[#2D6B3B] text-[#91F402]' : 'bg-red-900/60 text-red-100'
                                        }`}>
                                        {mission.is_active ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(mission)}
                                            className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (confirm("정말 이 미션을 비활성화하시겠습니까?")) {
                                                    deleteMutation.mutate(mission.id);
                                                }
                                            }}
                                            className="p-1.5 rounded-lg bg-gray-800 text-red-400 hover:bg-red-900/40"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {missions?.length === 0 && (
                    <div className="p-20 text-center text-gray-500">
                        등록된 미션이 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminMissionPage;
