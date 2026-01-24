// src/admin/pages/AdminMissionPage.tsx
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    CheckCircle2,
    Clock,
    Award,
    Activity,
    Settings2,
    AlertCircle,
    Save,
    X,
    RefreshCw
} from "lucide-react";
import {
    fetchMissions,
    updateMission,
    deleteMission,
    createMission,
    AdminMission,
    AdminMissionPayload
} from "../api/adminMissionApi";
import { REWARD_TYPES } from "../constants/rewardTypes";

const MISSION_CATEGORIES = [
    { value: "DAILY", label: "?�간 미션" },
    { value: "WEEKLY", label: "주간 미션" },
    { value: "SPECIAL", label: "?�페??미션" },
    { value: "NEW_USER", label: "?�규 ?��? 미션" },
];

const ACTION_TYPES = [
    { value: "PLAY_GAME", label: "?�레??(Game Play)" },
    { value: "LOGIN", label: "로그?? },
    { value: "JOIN_CHANNEL", label: "채널?�장 (Telegram)" },
    { value: "INVITE_FRIEND", label: "친구초�?" },
    { value: "DEPOSIT", label: "?�금" },
    { value: "WIN", label: "?�리" },
    { value: "SOCIAL", label: "?�셜?�션" },
    { value: "OTHER", label: "기�?" },
];

const AdminMissionPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategory, setFilterCategory] = useState<string>("ALL");
    const [isAdding, setIsAdding] = useState(false);
    const [editingMission, setEditingMission] = useState<AdminMission | null>(null);

    // Queries
    const { data: missionsRaw, isLoading } = useQuery({
        queryKey: ["admin", "missions"],
        queryFn: fetchMissions,
    });
    const missions = missionsRaw as AdminMission[] || [];

    // Mutations
    const updateMutation = useMutation({
        mutationFn: (vars: { id: number; payload: Partial<AdminMissionPayload> }) =>
            updateMission(vars.id, vars.payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "missions"] });
            setEditingMission(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteMission,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "missions"] })
    });

    const createMutation = useMutation({
        mutationFn: createMission,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "missions"] });
            setIsAdding(false);
        }
    });

    const [formValues, setFormValues] = useState<Partial<AdminMissionPayload>>({});

    const handleOpenEdit = (mission: AdminMission) => {
        setEditingMission(mission);
        setFormValues({
            title: mission.title,
            description: mission.description,
            category: mission.category,
            logic_key: mission.logic_key,
            target_value: mission.target_value,
            reward_type: mission.reward_type,
            reward_amount: mission.reward_amount,
            xp_reward: mission.xp_reward,
            action_type: mission.action_type,
            auto_claim: mission.auto_claim,
            is_active: mission.is_active,
            start_time: mission.start_time,
            end_time: mission.end_time,
        });
    };

    const handleOpenAdd = () => {
        setEditingMission(null);
        setFormValues({
            title: "",
            description: "",
            category: "DAILY",
            logic_key: "",
            target_value: 0,
            reward_type: "POINT",
            reward_amount: 0,
            xp_reward: 0,
            action_type: "OTHER",
            auto_claim: false,
            is_active: true,
        });
        setIsAdding(true);
    };

    const handleSave = () => {
        if (!formValues.title || !formValues.logic_key) {
            alert("?�목�?로직 ?�는 ?�수?�니??");
            return;
        }

        if (editingMission) {
            updateMutation.mutate({
                id: editingMission.id,
                payload: formValues
            });
        } else {
            createMutation.mutate(formValues as AdminMissionPayload);
        }
    };

    const handleToggleActive = (mission: AdminMission) => {
        updateMutation.mutate({
            id: mission.id,
            payload: { is_active: !mission.is_active }
        });
    };

    const filteredMissions = (missions || []).filter(m =>
        (m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.logic_key.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterCategory === "ALL" || m.category === filterCategory)
    );

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Clock className="h-8 w-8 text-admin-brand animate-spin" />
            <span className="text-admin-meta text-admin-text-secondary">미션 ?�진 분석 �?..</span>
        </div>
    );

    return (
        <section className="admin-page-container pb-20">


            <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-admin-text-base tracking-tight uppercase">
                        미션 관�?<span className="text-admin-brand/40">Missions</span>
                    </h1>
                </div>
                <button
                    onClick={handleOpenAdd}
                    className="btn-admin-primary flex items-center gap-2 px-5 py-2.5 h-auto text-sm shadow-lg shadow-admin-brand/20 hover:shadow-admin-brand/40 active:scale-95 transition-all"
                >
                    <Plus className="h-4 w-4" />
                    <span className="font-bold">?�규 미션 ?�록</span>
                </button>
            </header>

            {/* Logic Dashboard Stats - Pseudo stats for premium feel */}
            {/* Logic Dashboard Stats - Compact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                {[
                    { label: "?�체 미션", value: missions?.length || 0, icon: <Activity className="h-4 w-4" />, color: "text-admin-brand", bg: "bg-admin-brand/10 border-admin-brand/20" },
                    { label: "?�성 미션", value: missions?.filter(m => m.is_active).length || 0, icon: <CheckCircle2 className="h-4 w-4" />, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
                    { label: "?�일 미션", value: missions?.filter(m => m.category === "DAILY").length || 0, icon: <Clock className="h-4 w-4" />, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
                    { label: "보상 ?�적??, value: "8.4M", icon: <Award className="h-4 w-4" />, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
                ].map((stat, i) => (
                    <div key={i} className="bg-admin-card p-4 rounded-xl border border-white/5 flex items-center justify-between group hover:border-white/10 transition-colors">
                        <div>
                            <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className={`text-2xl font-black font-mono tracking-tight ${stat.color}`}>{stat.value}</p>
                        </div>
                        <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform shadow-lg shadow-black/20`}>
                            {stat.icon}
                        </div>
                    </div>
                ))}
            </div>

            {/* Filter & Search Bar */}
            {/* Filter & Search Bar - Adjusted Spacing */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-admin-brand transition-colors" />
                    <input
                        type="text"
                        placeholder="미션 ?�목 검..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 h-10 bg-zinc-900/50 border border-white/5 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-admin-brand/50 focus:bg-zinc-900 transition-all placeholder:text-zinc-600"
                    />
                </div>
                <div className="flex items-center gap-2">
                    {["ALL", "DAILY", "WEEKLY", "SPECIAL", "NEW_USER"].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilterCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${filterCategory === cat
                                ? "bg-admin-brand text-white border-admin-brand shadow-md shadow-admin-brand/20"
                                : "bg-zinc-900/30 text-zinc-500 border-white/5 hover:border-white/10 hover:text-zinc-400"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Mission Grid or Table */}
            <div className="admin-card overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-4 py-3 text-sm font-bold text-zinc-500 uppercase tracking-wider w-[50px]">ID</th>
                                <th className="px-4 py-3 text-sm font-bold text-zinc-500 uppercase tracking-wider">미션 명세 (Details)</th>
                                <th className="px-4 py-3 text-sm font-bold text-zinc-500 uppercase tracking-wider">카테고리 (Category)</th>
                                <th className="px-4 py-3 text-sm font-bold text-zinc-500 uppercase tracking-wider">목표 / 보상 (Goal & Rewards)</th>
                                <th className="px-4 py-3 text-sm font-bold text-zinc-500 uppercase tracking-wider text-center">?�태 (Status)</th>
                                <th className="px-4 py-3 text-sm font-bold text-zinc-500 uppercase tracking-wider text-right">?�션 (Actions)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-admin-border">
                            {filteredMissions.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-admin-body text-admin-text-muted italic">
                                        조건??부?�하??미션 ?�이?��? ?�습?�다.
                                    </td>
                                </tr>
                            ) : (
                                filteredMissions.map((mission) => (
                                    <tr key={mission.id} className="admin-tr group">
                                        <td className="px-4 py-4 text-sm font-mono font-bold text-zinc-500 border-b border-white/5">#{mission.id}</td>
                                        <td className="px-4 py-4 border-b border-white/5">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-bold text-zinc-200 group-hover:text-admin-brand transition-colors">{mission.title}</span>
                                                <span className="text-xs text-zinc-400 line-clamp-1 truncate max-w-[200px]">{mission.description}</span>
                                                <div className="flex items-center gap-1.5 mt-1">
                                                    <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-xs font-mono text-zinc-400 border border-white/5">
                                                        {mission.logic_key}
                                                    </code>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 border-b border-white/5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-black uppercase tracking-widest border ${mission.category === "SPECIAL"
                                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                : mission.category === "WEEKLY"
                                                    ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                                                    : "bg-zinc-800 text-zinc-400 border-white/10"
                                                }`}>
                                                {mission.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 border-b border-white/5">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-zinc-500 text-[11px] font-bold w-12 uppercase tracking-tighter">GOAL</span>
                                                    <span className="text-zinc-200 font-bold">{mission.target_value.toLocaleString()} <span className="text-zinc-500 text-xs font-medium">{mission.action_type}</span></span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-zinc-500 text-[11px] font-bold w-12 uppercase tracking-tighter">REWARD</span>
                                                    <span className="text-emerald-400 font-black font-mono tracking-tight">+{mission.reward_amount.toLocaleString()} <span className="text-xs text-emerald-500/70 font-bold">{mission.reward_type}</span></span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center border-b border-white/5">
                                            <button
                                                onClick={() => handleToggleActive(mission)}
                                                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${mission.is_active ? 'bg-emerald-500' : 'bg-zinc-700'
                                                    }`}
                                            >
                                                <span className="sr-only">Use setting</span>
                                                <span
                                                    aria-hidden="true"
                                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${mission.is_active ? 'translate-x-4' : 'translate-x-0'
                                                        }`}
                                                />
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right border-b border-white/5">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleOpenEdit(mission)}
                                                    aria-label="미션 ?�정"
                                                    title="?�정"
                                                    type="button"
                                                    className="p-1.5 rounded text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => { if (confirm("??��?�시겠습?�까?")) deleteMutation.mutate(mission.id); }}
                                                    aria-label="미션 ??��"
                                                    title="??��"
                                                    type="button"
                                                    className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info Footnote */}
            <div className="p-4 rounded-xl bg-admin-sidebar/30 border border-admin-border flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-admin-brand" />
                <p className="text-admin-meta text-admin-text-secondary leading-relaxed font-medium">
                    미션 로직 ?�는 백엔??`MissionProcessor`???�의???��? 반드???�치?�야 ?�니?? ?�로??로직???�요??경우 ?�스??관리자?�게 문의?�세??
                </p>
            </div>

            {/* Modal - Improved Layout with Safety Zone & Grid */}
            {(isAdding || editingMission) && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#18181b] rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200 custom-scrollbar">

                        {/* Modal Header */}
                        <div className="sticky top-0 z-10 bg-[#18181b]/95 backdrop-blur border-b border-white/5 px-8 py-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-white uppercase">
                                    {editingMission ? "미션 ?�보 ?�정" : "?�규 미션 ?�록"}
                                </h2>
                                <p className="text-xs text-zinc-500 font-medium mt-1">미션???��? ?�보?� 보상???�정?�니??</p>
                            </div>
                            <button
                                onClick={() => { setIsAdding(false); setEditingMission(null); }}
                                aria-label="미션 ?�집 모달 ?�기"
                                title="?�기"
                                type="button"
                                className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                            >
                                <X className="h-5 w-5 text-zinc-400" />
                            </button>
                        </div>

                        {/* Modal Body - Safety Zone Form */}
                        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="p-8 space-y-8">

                            {/* Section 1: Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-admin-brand flex items-center gap-2 uppercase tracking-widest">
                                    <Settings2 className="h-4 w-4" /> 기본 ?�정 (Basic Config)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[#1e1e24] rounded-xl border border-white/5">
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">미션 ?�목 (Title) <span className="text-rose-500">*</span></label>
                                        <input
                                            type="text"
                                            className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded px-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-700"
                                            value={formValues.title || ""}
                                            onChange={(e) => setFormValues({ ...formValues, title: e.target.value })}
                                            placeholder="?? ?�일 출석 체크"
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">?�세 ?�명 (Description)</label>
                                        <textarea
                                            className="w-full min-h-[80px] bg-zinc-900 border border-zinc-800 rounded p-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-700 resize-none"
                                            value={formValues.description || ""}
                                            onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                                            placeholder="?��??�게 보여�??�명 문구?�니??"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">카테고리</label>
                                        <select
                                            className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded px-3 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50"
                                            value={formValues.category || "DAILY"}
                                            onChange={(e) => setFormValues({ ...formValues, category: e.target.value as any })}
                                        >
                                            {MISSION_CATEGORIES.map(cat => (
                                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">로직 ??(Logic Key) <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded px-3 text-sm font-mono text-indigo-400 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-700"
                                                value={formValues.logic_key || ""}
                                                onChange={(e) => setFormValues({ ...formValues, logic_key: e.target.value })}
                                                placeholder="daily_login"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Conditions & Rewards */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-admin-brand flex items-center gap-2 uppercase tracking-widest">
                                    <Award className="h-4 w-4" /> 목표 �?보상 (Goal & Reward)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[#1e1e24] rounded-xl border border-white/5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">?�션 ?�??/label>
                                        <select
                                            className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded px-3 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50"
                                            value={formValues.action_type || "OTHER"}
                                            onChange={(e) => setFormValues({ ...formValues, action_type: e.target.value })}
                                        >
                                            {ACTION_TYPES.map(at => (
                                                <option key={at.value} value={at.value}>{at.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-500">목표 ?�수/금액</label>
                                        <input
                                            type="number"
                                            className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded px-3 text-sm text-zinc-200 font-bold focus:outline-none focus:border-indigo-500/50"
                                            value={formValues.target_value || 0}
                                            onChange={(e) => setFormValues({ ...formValues, target_value: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>

                                    <div className="col-span-2 h-px bg-white/5 my-2"></div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-500">보상 종류</label>
                                        <select
                                            className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded px-3 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50"
                                            value={formValues.reward_type || "POINT"}
                                            onChange={(e) => setFormValues({ ...formValues, reward_type: e.target.value as any })}
                                        >
                                            {REWARD_TYPES.map(rt => (
                                                <option key={rt.value} value={rt.value}>{rt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">보상 ?�량</label>
                                        <input
                                            type="number"
                                            className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded px-3 text-sm text-zinc-200 font-mono focus:outline-none focus:border-indigo-500/50"
                                            value={formValues.reward_amount || 0}
                                            onChange={(e) => setFormValues({ ...formValues, reward_amount: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-zinc-500 uppercase tracking-widest ml-1">경험�?(XP)</label>
                                        <input
                                            type="number"
                                            className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded px-3 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500/50"
                                            value={formValues.xp_reward || 0}
                                            onChange={(e) => setFormValues({ ...formValues, xp_reward: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="space-y-1.5 pt-6">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0"
                                                checked={formValues.auto_claim || false}
                                                onChange={(e) => setFormValues({ ...formValues, auto_claim: e.target.checked })}
                                            />
                                            <span className="text-sm font-black text-zinc-400 group-hover:text-zinc-200 uppercase tracking-widest transition-colors">?�동 ?�령 (Auto Claim)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Schedule */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-admin-brand flex items-center gap-2 uppercase tracking-widest">
                                    <Clock className="h-4 w-4" /> ?�정 ?�정 (Schedule)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-[#1e1e24] rounded-xl border border-white/5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-500">?�작 ?�시</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded px-3 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50"
                                            value={formValues.start_time || ""}
                                            onChange={(e) => setFormValues({ ...formValues, start_time: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold text-zinc-500">종료 ?�시</label>
                                        <input
                                            type="datetime-local"
                                            className="w-full h-10 bg-zinc-900 border border-zinc-800 rounded px-3 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500/50"
                                            value={formValues.end_time || ""}
                                            onChange={(e) => setFormValues({ ...formValues, end_time: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={() => { setIsAdding(false); setEditingMission(null); }}
                                    className="px-6 py-2.5 rounded-lg text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                                >취소</button>
                                <button
                                    type="submit"
                                    disabled={updateMutation.isPending || createMutation.isPending}
                                    className="px-8 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {(updateMutation.isPending || createMutation.isPending) ?
                                        <RefreshCw className="h-4 w-4 animate-spin" /> :
                                        <Save className="h-4 w-4" />
                                    }
                                    {editingMission ? "?�?�하�? : "?�록?�기"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};

export default AdminMissionPage;
