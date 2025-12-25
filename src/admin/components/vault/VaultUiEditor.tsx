import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAdminUiConfig, upsertAdminUiConfig } from "../../api/adminUiConfigApi";
import { VaultProgramResponse, updateVaultUiCopy } from "../../api/adminVaultApi";
import { Save, RotateCcw, Layout, MessageSquare } from "lucide-react";

type Props = {
    program: VaultProgramResponse;
};

const VaultUiEditor: React.FC<Props> = ({ program }) => {
    const queryClient = useQueryClient();

    // 1. Vault main UI copy
    const [vaultTitle, setVaultTitle] = useState(program.ui_copy_json?.title || "내 금고");
    const [vaultDesc, setVaultDesc] = useState(program.ui_copy_json?.desc || "적립된 보관금은 특정 조건 달성 시 즉시 출금 가능한 캐시로 해금됩니다.");

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
            setTzTitle(v.title || "");
            setTzBody(v.body || "");
            setTzPrimaryLabel(v.primaryCta?.label || v.primary_cta_label || "");
            setTzSecondaryLabel(v.secondaryCta?.label || v.secondary_cta_label || "");
        }
    }, [ticketZeroData]);

    const vaultMutation = useMutation({
        mutationFn: (json: any) => updateVaultUiCopy(program.key, json),
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
            const vaultJson = {
                ...program.ui_copy_json,
                title: vaultTitle,
                desc: vaultDesc,
            };

            const tzJson = {
                ...ticketZeroData?.value as any,
                title: tzTitle,
                body: tzBody,
                primaryCta: {
                    ...(ticketZeroData?.value as any)?.primaryCta,
                    label: tzPrimaryLabel,
                    url: (ticketZeroData?.value as any)?.primaryCta?.url || "https://ccc-010.com"
                },
                secondaryCta: {
                    ...(ticketZeroData?.value as any)?.secondaryCta,
                    label: tzSecondaryLabel,
                    url: (ticketZeroData?.value as any)?.secondaryCta?.url || "https://t.me/jm956"
                }
            };

            await Promise.all([
                vaultMutation.mutateAsync(vaultJson),
                tzMutation.mutateAsync(tzJson)
            ]);

            alert("UI 문구가 성공적으로 저장되었습니다.");
        } catch (e: any) {
            alert(`저장 실패: ${e.message}`);
        }
    };

    const inputClass = "w-full rounded-md border border-[#333] bg-[#0A0A0A] px-3 py-2 text-sm text-gray-200 focus:border-[#91F402] focus:outline-none";
    const labelClass = "mb-1 block text-xs font-semibold text-gray-500 uppercase tracking-wider";

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Layout className="h-5 w-5 text-[#91F402]" />
                        Vault 메인 패널 문구
                    </h3>
                    <p className="text-sm text-gray-400">유저가 금고 진입 시 가장 먼저 보는 제목과 설명을 수정합니다.</p>
                </div>
                <button
                    onClick={saveAll}
                    disabled={vaultMutation.isPending || tzMutation.isPending}
                    className="flex items-center gap-2 rounded-md bg-[#2D6B3B] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#91F402] hover:text-black transition-all shadow-lg active:scale-95"
                >
                    <Save className="h-4 w-4" />
                    모든 변경사항 저장
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 rounded-xl border border-[#333] bg-[#111] p-6">
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>메인 제목</label>
                            <input
                                className={inputClass}
                                value={vaultTitle}
                                onChange={e => setVaultTitle(e.target.value)}
                                placeholder="예: 내 활동 금고"
                            />
                        </div>
                        <div>
                            <label className={labelClass}>메인 설명</label>
                            <textarea
                                className={inputClass}
                                rows={3}
                                value={vaultDesc}
                                onChange={e => setVaultDesc(e.target.value)}
                                placeholder="금고 메인 설명 문구를 입력하세요."
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-[#333] bg-[#111] p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Layout className="h-24 w-24" />
                    </div>
                    <h4 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest">미리보기 (Preview)</h4>
                    <div className="space-y-1">
                        <p className="text-xl font-bold text-white">{vaultTitle}</p>
                        <p className="text-sm text-gray-400">{vaultDesc}</p>
                    </div>
                </div>
            </div>

            <hr className="border-[#222]" />

            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-amber-400" />
                        금고 모달 & 티켓 부족 안내
                    </h3>
                    <p className="text-sm text-gray-400">
                        티켓이 0일 때 팝업되는 모달의 메시지입니다.
                        <span className="text-amber-500 font-bold ml-1">"이렇게 주다가는 내가 망해!!!"</span> 같은 문구를 여기서 수정하세요.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 rounded-xl border border-[#333] bg-[#111] p-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className={labelClass}>모달 제목</label>
                                <input
                                    className={inputClass}
                                    value={tzTitle}
                                    onChange={e => setTzTitle(e.target.value)}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className={labelClass}>모달 본문 메시지</label>
                                <textarea
                                    className={inputClass}
                                    rows={4}
                                    value={tzBody}
                                    onChange={e => setTzBody(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>기본 버튼 (Primary)</label>
                                <input
                                    className={inputClass}
                                    value={tzPrimaryLabel}
                                    onChange={e => setTzPrimaryLabel(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>보조 버튼 (Secondary)</label>
                                <input
                                    className={inputClass}
                                    value={tzSecondaryLabel}
                                    onChange={e => setTzSecondaryLabel(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-[#333] bg-[#111] p-6">
                        <h4 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest">실제 모달 형태 예시</h4>
                        <div className="rounded-lg border border-[#333] bg-[#1a1a1a] p-5 space-y-4 shadow-2xl">
                            <p className="text-lg font-bold text-white border-b border-[#333] pb-2">{tzTitle || "티켓이 0이에요"}</p>
                            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{tzBody || DEFAULT_TZ_BODY}</p>
                            <div className="flex gap-2 pt-2">
                                <div className="px-3 py-1.5 rounded-md bg-[#91F402] text-black text-[10px] font-bold uppercase">{tzPrimaryLabel || "Go"}</div>
                                <div className="px-3 py-1.5 rounded-md bg-[#333] text-white text-[10px] font-bold uppercase">{tzSecondaryLabel || "Info"}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DEFAULT_TZ_BODY = "체험 티켓을 모두 사용하셨네요. 10레벨만 달성해도 Diamond Key를 확정 지급합니다!";

export default VaultUiEditor;
