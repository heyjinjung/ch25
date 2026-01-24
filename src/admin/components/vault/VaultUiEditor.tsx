import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAdminUiConfig, upsertAdminUiConfig } from "../../api/adminUiConfigApi";
import { VaultProgramResponse, updateVaultUiCopy } from "../../api/adminVaultApi";
import { Save, Layout, MessageSquare, RefreshCw } from "lucide-react";

import { getVaultDefaultProgram } from "../../api/adminVaultApi";

const VaultUiEditor: React.FC = () => {
    const queryClient = useQueryClient();

    // Internal Program State
    const [program, setProgram] = useState<VaultProgramResponse | null>(null);
    const [loading, setLoading] = useState(true);

    // 1. Vault main UI copy
    const [vaultTitle, setVaultTitle] = useState("금고");
    const [vaultDesc, setVaultDesc] = useState("?�립??보상 금액???�정 조건 ?�성 ??출금 가?�한 캐시�??�환?�니??");

    useEffect(() => {
        const load = async () => {
            try {
                const res = await getVaultDefaultProgram();
                setProgram(res);
                if (res.ui_copy_json) {
                    setVaultTitle(res.ui_copy_json.title || "금고");
                    setVaultDesc(res.ui_copy_json.desc || "?�립??보상 금액???�정 조건 ?�성 ??출금 가?�한 캐시�??�환?�니??");
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // 2. Ticket Zero Modal (closely related to Vault in user's mind)
    const { data: ticketZeroData } = useQuery({
        queryKey: ["admin", "ui-config", "ticket_zero"],
        queryFn: () => fetchAdminUiConfig("ticket_zero"),
    });

    const [tzTitle, setTzTitle] = useState("");
    const [tzBody, setTzBody] = useState("");
    const [tzPrimaryLabel, setTzPrimaryLabel] = useState("");
    const [tzSecondaryLabel, setTzSecondaryLabel] = useState("");

    useEffect(() => {
        if (ticketZeroData?.value) {
            const v = ticketZeroData.value as any;
            setTzTitle(v.title || "?�켓??0????(모두 ?�진)");
            setTzBody(
                v.body || "?�켓??모두 ?�용?�셨?�니??\n\n20?�벨 ?�성 ??Diamond Key가 ?�동 지급됩?�다!"
            );
            setTzPrimaryLabel(v.primaryCta?.label || v.primary_cta_label || "?�카지??바로가�?);
            setTzSecondaryLabel(v.secondaryCta?.label || v.secondary_cta_label || "매장 ?�레 문의");
        }
    }, [ticketZeroData]);

    const vaultMutation = useMutation({
        mutationFn: (json: any) => program ? updateVaultUiCopy(program.key, json) : Promise.reject("No program"),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "vault", "program"] });
        }
    });

    const tzMutation = useMutation({
        mutationFn: (json: any) => upsertAdminUiConfig("ticket_zero", { value: json }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin", "ui-config", "ticket_zero"] });
        }
    });

    const saveAll = async () => {
        try {
            if (!program) return;
            const vaultJson = {
                ...program.ui_copy_json,
                title: vaultTitle,
                desc: vaultDesc,
            };

            const tzJson = {
                ...(ticketZeroData?.value as any || {}),
                title: tzTitle || "?�켓??0????(모두 ?�진)",
                body: tzBody || "?�켓??모두 ?�용?�셨?�니??\n\n20?�벨 ?�성 ??Diamond Key가 ?�동 지급됩?�다!",
                primary_cta_label: tzPrimaryLabel || "?�카지??바로가�?,
                secondary_cta_label: tzSecondaryLabel || "매장 ?�레 문의",
                primary_cta_url: (ticketZeroData?.value as any)?.primary_cta_url || "https://ccc-010.com",
                secondary_cta_url: (ticketZeroData?.value as any)?.secondary_cta_url || "https://t.me/jm956",
                // Keep nested version for TicketZeroPanel compatibility
                primaryCta: {
                    ...(ticketZeroData?.value as any)?.primaryCta,
                    label: tzPrimaryLabel || "?�카지??바로가�?,
                    url: (ticketZeroData?.value as any)?.primaryCta?.url || (ticketZeroData?.value as any)?.primary_cta_url || "https://ccc-010.com"
                },
                secondaryCta: {
                    ...(ticketZeroData?.value as any)?.secondaryCta,
                    label: tzSecondaryLabel || "매장 ?�레 문의",
                    url: (ticketZeroData?.value as any)?.secondaryCta?.url || (ticketZeroData?.value as any)?.secondary_cta_url || "https://t.me/jm956"
                }
            };

            await Promise.all([
                vaultMutation.mutateAsync(vaultJson),
                tzMutation.mutateAsync(tzJson)
            ]);

            alert("UI 문구가 ?�공?�으�??�?�되?�습?�다.");
        } catch (e: any) {
            alert(`?�???�패: ${e?.message || "?????�는 ?�류"}`);
        }
    };

    const inputClass = "admin-input w-full";
    const labelClass = "admin-label";

    if (loading) return <div className="p-10 text-center"><RefreshCw className="h-6 w-6 animate-spin mx-auto text-admin-brand" /></div>;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-admin-subtitle text-admin-text-primary flex items-center gap-2">
                        <Layout className="h-5 w-5 text-admin-brand" />
                        Vault 메인 ?�널 문구
                    </h3>
                    <p className="text-admin-body text-admin-text-secondary">?��?가 금고 진입 ??먼�? 보는 ?�목/?�명 문구�??�정?�니??</p>
                </div>
                <button
                    onClick={saveAll}
                    disabled={vaultMutation.isPending || tzMutation.isPending}
                    className="btn-admin-primary"
                >
                    <Save className="h-4 w-4" />
                    모든 변경사???�??
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="admin-card p-6 space-y-4">
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>메인 ?�목</label>
                            <input
                                className={inputClass}
                                value={vaultTitle}
                                onChange={e => setVaultTitle(e.target.value)}
                                placeholder="?? ?�장??금고"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>메인 ?�명</label>
                            <textarea
                                className={inputClass}
                                rows={3}
                                value={vaultDesc}
                                onChange={e => setVaultDesc(e.target.value)}
                                placeholder="금고 메인 ?�명 문구�??�력?�세??
                            />
                        </div>
                    </div>
                </div>

                <div className="admin-card p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Layout className="h-24 w-24" />
                    </div>
                    <h4 className="text-admin-meta font-bold text-admin-text-secondary mb-4 uppercase tracking-widest">미리보기 (Preview)</h4>
                    <div className="space-y-1">
                        <p className="text-admin-subtitle text-admin-text-primary">{vaultTitle}</p>
                        <p className="text-admin-body text-admin-text-secondary">{vaultDesc}</p>
                    </div>
                </div>
            </div>

            <hr className="border-admin-border" />

            <div className="space-y-4">
                <div>
                    <h3 className="text-admin-subtitle text-admin-text-primary flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-admin-warning" />
                        금고 모달 & ?�켓 ?�내
                    </h3>
                    <p className="text-admin-body text-admin-text-secondary">?�켓??0?????�출?�는 모달??메시지�??�정?�니??</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="admin-card p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className={labelClass}>모달 ?�목</label>
                                <input
                                    className={inputClass}
                                    aria-label="모달 ?�목"
                                    title="모달 ?�목"
                                    placeholder="?? ?�켓??0????(모두 ?�진)"
                                    value={tzTitle}
                                    onChange={e => setTzTitle(e.target.value)}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className={labelClass}>모달 본문 메시지</label>
                                <textarea
                                    className={inputClass}
                                    aria-label="모달 본문 메시지"
                                    title="모달 본문 메시지"
                                    placeholder="?�켓??0?????�내 문구�??�력?�세??
                                    rows={4}
                                    value={tzBody}
                                    onChange={e => setTzBody(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>기본 버튼 (Primary)</label>
                                <input
                                    className={inputClass}
                                    aria-label="기본 버튼 ?�벨"
                                    title="기본 버튼 ?�벨"
                                    placeholder="?? ?�카지??바로가�?
                                    value={tzPrimaryLabel}
                                    onChange={e => setTzPrimaryLabel(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>보조 버튼 (Secondary)</label>
                                <input
                                    className={inputClass}
                                    aria-label="보조 버튼 ?�벨"
                                    title="보조 버튼 ?�벨"
                                    placeholder="?? 매장 ?�레 문의"
                                    value={tzSecondaryLabel}
                                    onChange={e => setTzSecondaryLabel(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="admin-card p-6">
                        <h4 className="text-admin-meta font-bold text-admin-text-secondary mb-4 uppercase tracking-widest">?�제 모달 ?�태 ?�시</h4>
                        <div className="admin-card p-5 space-y-4 shadow-admin-card">
                            <p className="text-admin-subtitle text-admin-text-primary border-b border-admin-border pb-2">{tzTitle || "?�켓??0????}</p>
                            <p className="text-admin-body text-admin-text-secondary leading-relaxed whitespace-pre-wrap">{tzBody || DEFAULT_TZ_BODY}</p>
                            <div className="flex gap-2 pt-2">
                                <div className="px-3 py-1.5 rounded-admin-lg bg-admin-brand text-white text-[10px] font-bold uppercase">{tzPrimaryLabel || "바로가�?}</div>
                                <div className="px-3 py-1.5 rounded-admin-lg bg-admin-sidebar border border-admin-border text-admin-text-primary text-[10px] font-bold uppercase">{tzSecondaryLabel || "문의"}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DEFAULT_TZ_BODY = "?�켓??모두 ?�용?�셨?�니??\n\n20?�벨 ?�성 ??Diamond Key가 ?�동 지급됩?�다!";

export default VaultUiEditor;
