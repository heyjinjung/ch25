import React from "react";
import { CheckCircle2, Gamepad2, Coins, Wallet } from "lucide-react";
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
  percent,
}) => {
  return (
    <div className="flex gap-4">
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
          status
            ? "bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            : "bg-zinc-800",
        )}
      >
        <Icon
          className={cn(
            "w-5 h-5",
            status ? "text-emerald-400" : "text-zinc-500",
          )}
        />
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4
            className={cn(
              "text-xs font-black tracking-tight",
              status ? "text-white" : "text-zinc-400",
            )}
          >
            {title}
          </h4>
          {status ? (
            <div className="flex items-center gap-1 text-emerald-400">
              <span className="text-[10px] font-black uppercase">CLEAR</span>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          ) : (
            <span className="text-[10px] font-bold text-zinc-500 font-mono italic">
              {progressText}
            </span>
          )}
        </div>
        <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={cn(
              "h-full rounded-full",
              status
                ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                : "bg-zinc-600",
            )}
          />
        </div>
        <p className="text-[10px] text-zinc-500 font-medium truncate uppercase tracking-tighter">
          {description}
        </p>
      </div>
    </div>
  );
};

interface WithdrawalRulesChecklistProps {
  playCount: number;
  playTarget: number;
  isPlayMet: boolean;
  spendAmount: number;
  spendTarget: number;
  isSpendMet: boolean;
  isAccountVerified: boolean;
}

export const WithdrawalRulesChecklist: React.FC<
  WithdrawalRulesChecklistProps
> = ({
  playCount,
  playTarget,
  isPlayMet,
  spendAmount,
  spendTarget,
  isSpendMet,
  isAccountVerified,
}) => {
  const conditions = [
    {
      id: "play",
      title: "게임 플레이 횟수",
      description: `최근 24시간 내 게임 ${playTarget.toLocaleString()}회 이상 플레이`,
      icon: Gamepad2,
      status: isPlayMet,
      progressText: `${playCount} / ${playTarget}`,
      percent: Math.min(100, (playCount / (playTarget || 1)) * 100),
    },
    {
      id: "spent",
      title: "누적 사용 금액",
      description: `누적 ${spendTarget.toLocaleString()} 포인트 이상 사용`,
      icon: Coins,
      status: isSpendMet,
      progressText: `${spendAmount.toLocaleString()} / ${spendTarget.toLocaleString()}`,
      percent: Math.min(100, (spendAmount / (spendTarget || 1)) * 100),
    },
    {
      id: "verify",
      title: "계좌 점유인증",
      description: "입금 계좌 실명 확인 및 0원 인증 완료",
      icon: Wallet,
      status: isAccountVerified,
      progressText: isAccountVerified ? "100%" : "0%",
      percent: isAccountVerified ? 100 : 0,
    },
  ];

  return (
    <Accordion
      type="single"
      collapsible
      className="w-full border-none"
      defaultValue="list"
    >
      <AccordionItem value="list" className="border-none">
        <AccordionTrigger className="hover:no-underline py-0">
          <div className="flex items-center justify-between w-full py-2">
            <h3 className="text-[11px] font-black text-white/40 tracking-tighter uppercase flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Withdrawal Requirements
            </h3>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-4 pb-2">
          <div className="space-y-5">
            {conditions.map((item) => (
              <RuleItem
                key={item.id}
                title={item.title}
                description={item.description}
                icon={item.icon}
                status={item.status}
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
