// src/admin/pages/GameTokenGrantPage.tsx
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Send, CheckCircle2, AlertCircle, Coins, User, Hash, RefreshCw } from "lucide-react";
import { grantGameTokens, GrantGameTokensPayload } from "../api/adminGameTokenApi";
import { GameTokenType } from "../../types/gameTokens";

const tokenOptions: { value: GameTokenType; label: string; icon: string }[] = [
  { value: "ROULETTE_COIN", label: "ë£°ë › ì½”ì¸", icon: "?°" },
  { value: "DICE_TOKEN", label: "ì£¼ì‚¬??? í°", icon: "?²" },
  { value: "LOTTERY_TICKET", label: "ë³µê¶Œ ?°ì¼“", icon: "?«" },
  { value: "GOLD_KEY", label: "ê³¨ë“œ ??, icon: "?”‘" },
  { value: "DIAMOND_KEY", label: "?¤ì´?„ëª¬????, icon: "?’" },
];

const grantSchema = z.object({
  user_identifier: z.string().min(1, "?¬ìš©???ë³„?ë? ?…ë ¥?´ì£¼?¸ìš”"),
  token_type: z.enum(["ROULETTE_COIN", "DICE_TOKEN", "LOTTERY_TICKET", "GOLD_KEY", "DIAMOND_KEY"] as const),
  amount: z.number().int().positive("?‘ìˆ˜ë¥??…ë ¥?´ì£¼?¸ìš”"),
});

type GrantFormData = z.infer<typeof grantSchema>;

const GameTokenGrantPage: React.FC = () => {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<GrantFormData>({
    resolver: zodResolver(grantSchema),
    defaultValues: {
      user_identifier: "",
      token_type: "ROULETTE_COIN",
      amount: 0,
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: GrantGameTokensPayload) => grantGameTokens(payload),
    onSuccess: () => {
      setTimeout(() => reset(), 2000);
    },
  });

  const onSubmit = (data: GrantFormData) => {
    const payload: GrantGameTokensPayload = {
      user_identifier: data.user_identifier,
      token_type: data.token_type,
      amount: data.amount,
    };
    mutation.mutate(payload);
  };

  return (
    <section className="admin-page-container space-y-10 pb-20">
      <header className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-admin-accent">
          <Coins className="h-5 w-5" />
          <span className="text-admin-meta font-black uppercase tracking-[0.2em]">Token Asset Control</span>
        </div>
        <h1 className="text-admin-title text-admin-text-primary">? í° ?ì‚° ì§€ê¸??µì œ??/h1>
        <p className="text-admin-body text-admin-text-secondary font-medium">
          ê²Œì„ ? í°???Œì›?ê²Œ ì§ì ‘ ì§€ê¸‰í•˜ê³??¤ì‹œê°„ìœ¼ë¡??”ì•¡???•ì¸?©ë‹ˆ??
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form Area */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="admin-card-premium p-8 space-y-8">
            <div className="border-b border-admin-border pb-6">
              <h2 className="text-admin-subtitle font-black text-admin-text-primary flex items-center gap-2">
                <Send className="h-5 w-5 text-admin-brand" />
                ? í° ì§€ê¸???
              </h2>
              <p className="text-xs text-admin-text-secondary mt-1">ëª¨ë“  ?„ë“œë¥??•í™•???…ë ¥????ì§€ê¸‰ì„ ?¤í–‰?˜ì„¸??</p>
            </div>

            {/* User Identifier */}
            <div className="space-y-3">
              <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest pl-1 flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> ?¬ìš©???ë³„??
              </label>
              <Controller
                name="user_identifier"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    placeholder="Telegram ID / Username / Nickname / External ID"
                    className="admin-input w-full h-11"
                  />
                )}
              />
              {errors.user_identifier && (
                <p className="text-xs text-admin-danger flex items-center gap-1 pl-1">
                  <AlertCircle className="h-3 w-3" /> {errors.user_identifier.message}
                </p>
              )}
            </div>

            {/* Token Type */}
            <div className="space-y-3">
              <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest pl-1">? í° ?€??/label>
              <Controller
                name="token_type"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {tokenOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={`p-4 rounded-xl border-2 transition-all ${field.value === option.value
                          ? "border-admin-brand bg-admin-brand/10 shadow-admin-glow"
                          : "border-admin-border bg-admin-sidebar/30 hover:border-admin-border/50"
                          }`}
                      >
                        <div className="text-2xl mb-1">{option.icon}</div>
                        <p className={`text-xs font-black ${field.value === option.value ? "text-admin-brand" : "text-admin-text-secondary"}`}>
                          {option.label}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            {/* Amount */}
            <div className="space-y-3">
              <label className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest pl-1 flex items-center gap-2">
                <Hash className="h-3.5 w-3.5" /> ì§€ê¸‰ëŸ‰
              </label>
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                    placeholder="0"
                    className="admin-input w-full h-11 text-2xl font-black tabular-nums"
                  />
                )}
              />
              {errors.amount && (
                <p className="text-xs text-admin-danger flex items-center gap-1 pl-1">
                  <AlertCircle className="h-3 w-3" /> {errors.amount.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full btn-admin-primary h-12 flex items-center justify-center gap-2 text-base font-black shadow-admin-glow disabled:opacity-50"
            >
              {mutation.isPending ? (
                <>
                  <RefreshCw className="h-5 w-5 animate-spin" /> ì²˜ë¦¬ ì¤?..
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" /> ? í° ì§€ê¸??¤í–‰
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sidebar: Status & Result */}
        <div className="lg:col-span-1 space-y-6">
          {/* Success State */}
          {mutation.isSuccess && mutation.data && (
            <div className="admin-card-premium p-6 border-l-4 border-admin-accent animate-in slide-in-from-right-4">
              <div className="flex items-center gap-2 text-admin-accent mb-4">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="text-admin-subtitle font-black">ì§€ê¸??„ë£Œ</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-xs">
                  <span className="text-admin-text-secondary font-bold">User ID</span>
                  <span className="text-admin-text-primary font-black tabular-nums">{mutation.data.user_id}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-admin-text-secondary font-bold">Nickname</span>
                  <span className="text-admin-text-primary font-black">{mutation.data.nickname || "-"}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-admin-text-secondary font-bold">Token Type</span>
                  <span className="text-admin-brand font-black">{mutation.data.token_type}</span>
                </div>
                <div className="p-3 rounded-lg bg-admin-accent/10 border border-admin-accent/20">
                  <p className="text-[10px] text-admin-text-secondary font-black uppercase mb-1">?„ì¬ ?”ì•¡</p>
                  <p className="text-2xl font-black text-admin-accent tabular-nums">{mutation.data.balance.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {mutation.isError && (
            <div className="admin-card-premium p-6 border-l-4 border-admin-danger">
              <div className="flex items-center gap-2 text-admin-danger mb-2">
                <AlertCircle className="h-5 w-5" />
                <h3 className="text-admin-subtitle font-black">ì§€ê¸??¤íŒ¨</h3>
              </div>
              <p className="text-xs text-admin-text-secondary">
                {mutation.error instanceof Error ? mutation.error.message : "?????†ëŠ” ?¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤."}
              </p>
            </div>
          )}

          {/* Quick Info */}
          <div className="admin-card-premium p-6">
            <h4 className="text-admin-meta font-black text-admin-text-secondary uppercase tracking-widest mb-4">ì§€ê¸?ê°€?´ë“œ</h4>
            <div className="space-y-3 text-xs text-admin-text-secondary leading-relaxed">
              <p>???¬ìš©???ë³„?ëŠ” Telegram ID, Username, Nickname ?ëŠ” External IDë¥??…ë ¥?????ˆìŠµ?ˆë‹¤.</p>
              <p>??ì§€ê¸???ì¦‰ì‹œ ?´ë‹¹ ?Œì›??? í° ?”ì•¡???…ë°?´íŠ¸?©ë‹ˆ??</p>
              <p>??ëª¨ë“  ? í° ì§€ê¸?ê¸°ë¡?€ Ledger???ë™?¼ë¡œ ê¸°ë¡?©ë‹ˆ??</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GameTokenGrantPage;
