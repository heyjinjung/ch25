// src/admin/pages/GameTokenGrantPage.tsx
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import Button from "../../components/common/Button";
import { grantGameTokens } from "../api/adminGameTokenApi";
import { GAME_TOKEN_LABELS, GameTokenType } from "../../types/gameTokens";

const grantSchema = z.object({
  external_id: z.string().min(1, "id를 입력하세요"),
  token_type: z.enum(["ROULETTE_COIN", "DICE_TOKEN", "LOTTERY_TICKET", "CC_COIN"]),
  amount: z.number().int().positive("1 이상 입력"),
});

type GrantFormValues = z.infer<typeof grantSchema>;

const tokenOptions: GameTokenType[] = ["ROULETTE_COIN", "DICE_TOKEN", "LOTTERY_TICKET", "CC_COIN"];

const GameTokenGrantPage: React.FC = () => {
  const form = useForm<GrantFormValues>({
    resolver: zodResolver(grantSchema),
    defaultValues: { external_id: "", token_type: "ROULETTE_COIN", amount: 10 },
  });

  const mutation = useMutation({ mutationFn: grantGameTokens });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <section className="space-y-6 rounded-xl border border-emerald-800/40 bg-slate-900/70 p-6 shadow-lg shadow-emerald-900/30">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">티켓 지급</h1>
          <p className="text-sm text-slate-300">id 기준으로 지급합니다.</p>
        </div>
        <Button variant="secondary" type="button" onClick={() => form.reset({ external_id: "", token_type: "ROULETTE_COIN", amount: 10 })}>
          초기화
        </Button>
      </div>

      {mutation.isSuccess && mutation.data && (
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/40 p-3 text-emerald-100">
          <p className="text-sm font-semibold">지급 완료</p>
          <p className="text-sm">external_id: {mutation.data.external_id ?? mutation.data.user_id}</p>
          <p className="text-sm">
            {GAME_TOKEN_LABELS[mutation.data.token_type] ?? mutation.data.token_type} / 잔액 {mutation.data.balance}
          </p>
        </div>
      )}

      {mutation.isError && (
        <div className="rounded-lg border border-red-600/40 bg-red-950 p-3 text-red-100">
          {(mutation.error as Error).message || "지급에 실패했습니다."}
        </div>
      )}

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm text-slate-200">external_id</label>
            <input
              className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
              {...form.register("external_id")}
              type="text"
              placeholder="ex: test-qa-999"
            />
            {form.formState.errors.external_id && <p className="text-sm text-red-300">{form.formState.errors.external_id.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-200">토큰 종류</label>
            <select
              className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
              {...form.register("token_type")}
            >
              {tokenOptions.map((t) => (
                <option key={t} value={t}>
                  {GAME_TOKEN_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-200">금액</label>
            <input
              type="number"
              className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
              {...form.register("amount", { valueAsNumber: true })}
            />
            {form.formState.errors.amount && <p className="text-sm text-red-300">{form.formState.errors.amount.message}</p>}
          </div>
        </div>

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "지급 중..." : "티켓 지급"}
        </Button>
      </form>
    </section>
  );
};

export default GameTokenGrantPage;
