import React from "react";
import { CheckCircle2, Circle, Gamepad2, Coins, Wallet, Landmark } from "lucide-react";
import { cn } from "../../lib/utils";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

interface RuleItemProps {
  title: string;
  description: string;
  icon: React.ElementType;
  status: boolean;
  progressText: string;
  percent: number;
}

const RuleItem: React.FC<RuleItemProps> = ({ 
  title, 
  description, 
  icon: Icon, 
  status, 
  progressText, 
  percent 
}) => {
  return (
    <div className={cn(
      "flex flex-col p-4 rounded-2xl border transition-all duration-300",
      status
        ? "bg-orange-500/[0.03] border-orange-500/30 shadow-[inset_0_0_20px_rgba(212,175,55,0.05)]"
        : "bg-white/[0.02] border-white/5"
    )}>
      {/* Top Row */}
      <div className="flex items-center gap-3.5 mb-3">
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shadow-inner",
          status
            ? "bg-orange-500/10 text-orange-400"
            : "bg-black/40 text-zinc-500"
        )}>
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={cn(
              "text-sm font-bold truncate pr-2",
              status ? "text-white" : "text-white/70"
            )}>{title}</span>
            {status ? (
              <div className="flex items-center gap-1 text-orange-400">
                <span className="text-[10px] font-bold uppercase">?�료</span>
                <CheckCircle2 size={14} className="fill-orange-500/20" />
              </div>
            ) : (
              <Circle size={14} className="text-white/10" />
            )}
          </div>
          <div className="text-[11px] text-white/30 truncate mt-0.5">{description}</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-1">
        <div className="flex justify-between items-center text-[10px] font-bold mb-1.5 uppercase">
          <span className={status ? "text-orange-500/70" : "text-zinc-600"}>
            Progress
          </span>
          <span className={status ? "text-orange-400" : "text-zinc-500"}>
            {progressText}
          </span>
        </div>
        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            className={cn(
              "h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(212,175,55,0.6)]",
              status ? "bg-gradient-to-r from-orange-400 to-red-500" : "bg-white/10"
            )}
          />
        </div>
      </div>
    </div>
  );
};

interface WithdrawalRulesChecklistProps {
  vaultBalance: number;
  playCount: number;
  playTarget: number;
  spendAmount: number;
  spendTarget: number;
  depositConfirmed: boolean;
}

export const WithdrawalRulesChecklist: React.FC<WithdrawalRulesChecklistProps> = ({
  vaultBalance,
  playCount,
  playTarget,
  spendAmount,
  spendTarget,
  depositConfirmed,
}) => {
  const minWithdrawal = 10000;
  const isBalanceMet = vaultBalance >= minWithdrawal;
  const isPlayMet = playCount >= playTarget;
  const isSpentMet = spendAmount >= spendTarget;
  const isDepositMet = depositConfirmed;

  const conditions = [
    {
      id: "min-balance",
      title: "최소 출금 가?�액",
      description: `보유 금액 ${(minWithdrawal ?? 0).toLocaleString()}???�상`,
      status: isBalanceMet,
      icon: Wallet,
      progressText: `${(vaultBalance ?? 0).toLocaleString()} / ${(minWithdrawal ?? 0).toLocaleString()}`,
      percent: Math.min(100, (vaultBalance / (minWithdrawal || 1)) * 100)
    },
    {
      id: "deposit",
      title: "금일 ?�금 ?�역",
      description: "?�일 ?�금 기록 ?�요",
      status: isDepositMet,
      icon: Landmark,
      progressText: isDepositMet ? "?�료" : "미완�?,
      percent: isDepositMet ? 100 : 0
    },
    {
      id: "plays",
      title: "게임 ?�레??,
      description: `최근 3???�내 게임 ${(playTarget ?? 0).toLocaleString()}???�상 ?�레??,
      status: isPlayMet,
      icon: Gamepad2,
      progressText: `${playCount ?? 0} / ${playTarget ?? 0}??,
      percent: Math.min(100, (playCount / (playTarget || 1)) * 100)
    },
    {
      id: "spent",
      title: "금고 ?�용 ?�적",
      description: `금고 ?�일 ?�용??${(spendTarget ?? 0).toLocaleString()}???�상`,
      status: isSpentMet,
      icon: Coins,
      progressText: `${(spendAmount ?? 0).toLocaleString()} / ${(spendTarget ?? 0).toLocaleString()}??,
      percent: Math.min(100, (spendAmount / (spendTarget || 1)) * 100)
    }
  ];


  return (
    <Accordion type="single" collapsible className="w-full border-none">
      <AccordionItem value="checklist" className="border-none">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center justify-between w-full pr-4">
            <h3 className="text-sm font-bold text-white/60 tracking-tight uppercase">출금 ?�청 조건</h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4 pb-0">
          <div className="space-y-3">
            {conditions.map((item) => (
              <RuleItem
                key={item.id}
                title={item.title}
                description={item.description}
                status={item.status}
                icon={item.icon}
                progressText={item.progressText}
                percent={item.percent}
              />
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};
