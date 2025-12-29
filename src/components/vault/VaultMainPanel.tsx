import React, { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { useQuery } from "@tanstack/react-query";
import { getVaultStatus } from "../../api/vaultApi";
import VaultModal from "./VaultModal";
import AnimatedCountdown from "../common/AnimatedCountdown";
import { parseVaultUnlockRules } from "../../utils/vaultUtils";


const formatWon = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

const parseDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const formatDateTime = (d: Date | null): string | null => {
  if (!d) return null;
  try {
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
};

const CountdownTimer: React.FC<{ expiresAt: Date }> = React.memo(({ expiresAt }) => {
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const calculate = () => {
      const difference = expiresAt.getTime() - new Date().getTime();
      if (difference <= 0) {
        setIsWarning(false);
        return;
      }
      setIsWarning(difference < 60 * 60 * 1000);
      return;
    };
    calculate();
    const timer = setInterval(() => calculate(), 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <div className={`px-4 py-2 rounded-full border ${isWarning ? "border-red-500/50 bg-red-500/10 text-red-300" : "border-white/10 bg-white/5 text-white/70"} text-sm font-bold flex items-center gap-2 backdrop-blur-md shadow-lg`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
      <AnimatedCountdown
        targetMs={expiresAt.getTime()}
        warnUnderMs={60 * 60 * 1000}
        expiredText="00:00:00"
        suffix=" 후 소멸"
        className={isWarning ? "font-bold animate-pulse" : ""}
        showDays={false}
      />
    </div>
  );
});

const VaultVisual: React.FC<{ eligible: boolean }> = React.memo(({ eligible }) => {
  return (
    <div className="relative w-full max-w-[320px] aspect-square mx-auto flex items-center justify-center group cursor-pointer transition-transform duration-500 active:scale-95">
      {/* Background Glows */}
      <div className={clsx(
        "absolute inset-0 rounded-full blur-[80px] opacity-30 transition-colors duration-1000 animate-pulse",
        eligible ? "bg-figma-accent" : "bg-emerald-900/40"
      )} />
      <div className="absolute inset-4 rounded-full border border-white/5 animate-spin-slow opacity-20" />

      {/* Main Safe Box */}
      <div className="relative z-10 w-full h-full transform transition-all duration-700">
        <img
          src={eligible ? "/assets/vault/vault_open.png" : "/assets/vault/vault_closed.png"}
          className={clsx(
            "w-full h-full object-contain filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-all",
            eligible && "scale-105"
          )}
          alt="금고 상태"
        />

        {/* Dial Overlay */}
        {!eligible && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-[38%] aspect-square mt-[2%]">
              <img
                src="/assets/vault/vault_dial.jpg"
                className="w-full h-full object-contain animate-spin-slow group-hover:rotate-180 transition-transform duration-[2s] ease-in-out"
                style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))', mixBlendMode: 'screen' }}
                alt="다이얼"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-figma-accent shadow-[0_0_10px_#30FF75]" />
              </div>
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.05] to-transparent pointer-events-none rounded-3xl" />
      </div>

      {/* Badge Overlay */}
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-20">
        <div className={clsx(
          "px-6 py-2 rounded-full border-2 font-black text-xs tracking-[0.2em] uppercase shadow-2xl backdrop-blur-xl transition-all duration-500",
          eligible ? "bg-black border-figma-accent text-figma-accent shadow-[0_0_30px_rgba(48,255,117,0.3)] animate-bounce" : "bg-black/80 border-white/10 text-white/40"
        )}>
          {eligible ? "해금 완료" : "잠겨있음"}
        </div>
      </div>
    </div>
  );
});

const VaultMainPanel: React.FC = React.memo(() => {
  const [vaultModalOpen, setVaultModalOpen] = useState(false);

  const vault = useQuery({
    queryKey: ["vault-status"],
    queryFn: getVaultStatus,
    staleTime: 30_000,
    retry: false,
  });


  const view = useMemo(() => {
    const data = vault.data;
    const vaultBalance = data?.vaultBalance ?? 0;
    const cashBalance = data?.cashBalance ?? 0;
    const eligible = !!data?.eligible;
    const expiresAt = parseDate(data?.expiresAt ?? null);
    const usedAt = parseDate(data?.vaultFillUsedAt ?? null);

    const statusLabel = vaultBalance > 0 ? (eligible ? "해금 가능" : "잠금") : "포인트 없음";
    const statusTone = eligible ? "text-cc-lime shadow-[0_0_10px_#d2fd9c44]" : "text-white/40";

    const unlockRulesJson = data?.unlockRulesJson;
    const accrualMultiplier = data?.accrualMultiplier ?? 1.0;
    const recommendedAction = data?.recommendedAction;
    const ctaPayload = data?.ctaPayload;

    return {
      vaultBalance,
      cashBalance,
      eligible,
      expiresAt,
      usedAt,
      statusLabel,
      statusTone,
      unlockRulesJson,
      accrualMultiplier,
      recommendedAction,
      ctaPayload,
      uiCopyJson: data?.uiCopyJson,
    };
  }, [vault.data]);

  useEffect(() => {
    if (view.recommendedAction === "OPEN_VAULT_MODAL" && !vaultModalOpen) {
      setVaultModalOpen(true);
    }
  }, [view.recommendedAction]);

  const unlockRules = useMemo(() => {
    const parsed = parseVaultUnlockRules(view.unlockRulesJson);
    if (parsed.length > 0) return parsed;
    return [
      "게임 플레이를 통해 적립된 포인트가 안전하게 보관됩니다.",
      "충전 및 이용 내역이 확인되면 자동으로 포인트가 해금됩니다.",
      "해금된 포인트는 즉시 보유 머니로 전환되어 사용 가능합니다."
    ];
  }, [view.unlockRulesJson]);


  return (
    <section className="mx-auto w-full max-w-[1100px] flex flex-col gap-10">
      {/* 1. High-End Hero Header */}
      <div className="relative w-full rounded-[3rem] overflow-hidden bg-[#1a1c0e] p-8 md:p-16 border border-white/10 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9)] transition-all">
        {/* Abstract Premium Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-[#30FF75]/10 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black/90" />
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-10">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="px-5 py-2 rounded-full bg-emerald-950/80 border border-figma-accent/50 text-figma-accent text-[10px] font-black tracking-[0.2em] uppercase shadow-[0_0_20px_rgba(48,255,117,0.2)] backdrop-blur-md">
                  보안 금고 시스템
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <h1 className="text-4xl md:text-[72px] font-black leading-[0.9] text-white tracking-tighter italic uppercase">
                내 금고 <br />
                <span className="text-figma-accent text-5xl md:text-[84px] not-italic">리워드 보관함</span>
              </h1>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              {view.expiresAt && <CountdownTimer expiresAt={view.expiresAt} />}
              {view.accrualMultiplier > 1 && (
                <div className="px-5 py-2 rounded-full bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-black animate-pulse shadow-xl flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                  포인트 {view.accrualMultiplier}배 적립 중
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6 max-w-md">
              <p className="text-white/60 text-base md:text-lg leading-relaxed font-bold">
                지민코드 활동을 통해 적립된 포인트가 <span className="text-white">안전하게 보관</span>되어 있습니다.
                이용 내역이 확인되면 즉시 해금되어 보유 머니로 전환됩니다.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setVaultModalOpen(true)}
                  className="group relative px-10 py-5 bg-figma-primary text-white font-black text-sm rounded-[1.5rem] transition-all overflow-hidden shadow-2xl active:scale-95"
                >
                  <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform" />
                  <span className="relative z-10 flex items-center justify-center gap-2 tracking-widest uppercase">
                    상세 정보 확인
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                  </span>
                </button>
                <a
                  href="https://ccc-010.com"
                  target="_blank"
                  className="px-10 py-5 bg-white/5 text-white/70 font-black text-sm rounded-[1.5rem] hover:bg-white/10 transition-all border border-white/10 backdrop-blur-md flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  카지노 홈으로
                </a>
              </div>
            </div>
          </div>

          <div className="flex justify-center relative">
            <VaultVisual eligible={view.eligible} />
          </div>
        </div>
      </div>

      {/* 2. Premium Balance Display */}
      <div className="flex justify-center">
        {/* Locked Box */}
        <div className="relative group w-full max-w-xl">
          <div className="absolute inset-0 bg-figma-accent/10 blur-[60px] opacity-50 transition-opacity" />
          <div className="relative p-10 rounded-[2.5rem] border border-white/20 bg-black/60 backdrop-blur-3xl overflow-hidden shadow-3xl text-center">
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <img src="/assets/vault/vault_dial.jpg" className="w-24 h-24 animate-spin-slow" style={{ mixBlendMode: 'screen' }} alt="" />
            </div>
            <div className="flex flex-col gap-2 relative z-10">
              <span className="text-xs font-black text-white/30 tracking-[0.4em] uppercase">현재 보관된 리워드</span>
              <div className="flex items-baseline justify-center gap-2">
                <h3 className="text-white text-6xl font-black tracking-tighter">{formatWon(view.vaultBalance).replace('원', '')}</h3>
                <span className="text-figma-accent text-2xl font-black italic">원</span>
              </div>
            </div>
            <div className="mt-8 flex items-center justify-center gap-3 relative z-10">
              <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_10px_rgba(249,121,53,0.8)]" />
              <p className="text-white/50 text-xs font-bold uppercase tracking-wider">이용 확인 후 자동으로 지급됩니다</p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Reward Tracking & History */}
      <div className="max-w-2xl mx-auto w-full flex flex-col gap-8">
        {/* Rules & History only */}
        <div className="flex flex-col gap-8">
          <div className="p-8 md:p-10 rounded-[2.5rem] border border-white/10 bg-[#111] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-figma-accent" />
            <h4 className="text-white font-black text-lg mb-8 flex items-center gap-3 uppercase">
              이용 안내 및 조건
            </h4>
            <div className="grid gap-3">
              {unlockRules.map((rule, i) => (
                <div key={i} className="flex gap-4 items-center p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="h-6 w-6 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-figma-accent font-black text-[10px] shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-white/60 text-sm font-medium">{rule}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-8 md:p-10 rounded-[2.5rem] border border-white/10 bg-[#111] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-white/20" />
            <h4 className="text-white font-black text-lg mb-8 flex items-center gap-3 uppercase">
              최근 활동 내역
            </h4>
            <div className="flex flex-col gap-4">
              {view.eligible ? (
                <div className="flex items-center justify-between p-5 rounded-2xl bg-figma-accent/5 border border-figma-accent/20">
                  <div className="flex items-center gap-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-figma-accent animate-pulse shadow-[0_0_10px_#30FF75]" />
                    <p className="text-white font-bold text-sm tracking-tight">외부 이용 확인 완료</p>
                  </div>
                  <span className="text-[10px] font-black text-figma-accent uppercase tracking-widest border border-figma-accent/30 px-3 py-1 rounded-full bg-figma-accent/10">추가 적립 중</span>
                </div>
              ) : (
                <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-2.5 h-2.5 rounded-full bg-white/20" />
                    <p className="text-white/40 text-sm font-bold uppercase tracking-tight">이용 확인 대기 중</p>
                  </div>
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest border border-white/10 px-3 py-1 rounded-full">대기</span>
                </div>
              )}
              {view.usedAt && (
                <div className="flex items-center justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="flex flex-col gap-1">
                    <p className="text-white/60 text-xs font-black uppercase tracking-wider">포인트 전환 완료</p>
                    <p className="text-white/30 text-[10px] font-mono">{formatDateTime(view.usedAt)}</p>
                  </div>
                  <div className="text-figma-accent/40 font-black text-xs uppercase tracking-tighter italic">완료</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <VaultModal
        open={vaultModalOpen}
        onClose={() => setVaultModalOpen(false)}
        ctaPayload={view.ctaPayload}
        unlockRulesJson={view.unlockRulesJson}
      />
    </section>
  );
});

export default VaultMainPanel;
