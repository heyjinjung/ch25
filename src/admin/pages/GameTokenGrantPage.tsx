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
  user_id: z.number().int().positive("유저 ID를 입력하세요"),
  token_type: z.enum(["ROULETTE_COIN", "DICE_TOKEN", "LOTTERY_TICKET"]),
  amount: z.number().int().positive("지급 수량은 1 이상이어야 합니다"),
});

type GrantFormValues = z.infer<typeof grantSchema>;

const tokenOptions: GameTokenType[] = ["ROULETTE_COIN", "DICE_TOKEN", "LOTTERY_TICKET"];

const GameTokenGrantPage: React.FC = () => {
  const form = useForm<GrantFormValues>({
    resolver: zodResolver(grantSchema),
    defaultValues: { user_id: 0, token_type: "ROULETTE_COIN", amount: 10 },
  });

  const mutation = useMutation({ mutationFn: grantGameTokens });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <section className="space-y-6 rounded-xl border border-emerald-800/40 bg-slate-900/70 p-6 shadow-lg shadow-emerald-900/30">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">게임 토큰 지급</h1>
          <p className="text-sm text-slate-300">유저 ID 기준으로 룰렛/주사위/복권 토큰을 충전합니다.</p>
        </div>
        <Button variant="secondary" type="button" onClick={() => form.reset({ user_id: 0, token_type: "ROULETTE_COIN", amount: 10 })}>
          값 초기화
        </Button>
      </div>

      {mutation.isSuccess && mutation.data && (
        <div className="rounded-lg border border-emerald-700/40 bg-emerald-900/40 p-3 text-emerald-100">
          <p className="text-sm font-semibold">지급 완료</p>
          <p className="text-sm">유저 #{mutation.data.user_id} / {GAME_TOKEN_LABELS[mutation.data.token_type] ?? mutation.data.token_type}</p>
          <p className="text-sm">잔액: {mutation.data.balance}</p>
        </div>
      )}

      {mutation.isError && (
        <div className="rounded-lg border border-red-600/40 bg-red-950 p-3 text-red-100">
          {(mutation.error as Error).message || "지급 요청에 실패했습니다."}
        </div>
      )}

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm text-slate-200">유저 ID</label>
            <input
              type="number"
              className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
              {...form.register("user_id", { valueAsNumber: true })}
            />
            {form.formState.errors.user_id && <p className="text-sm text-red-300">{form.formState.errors.user_id.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-200">토큰 타입</label>
            <select
              className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
              {...form.register("token_type")}
            >
              {tokenOptions.map((option) => (
                <option key={option} value={option}>
                  {GAME_TOKEN_LABELS[option] ?? option}
                </option>
              ))}
            </select>
            {form.formState.errors.token_type && <p className="text-sm text-red-300">{form.formState.errors.token_type.message}</p>}
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-200">지급 수량</label>
            <input
              type="number"
              className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
              {...form.register("amount", { valueAsNumber: true })}
            />
            {form.formState.errors.amount && <p className="text-sm text-red-300">{form.formState.errors.amount.message}</p>}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={() => form.reset()}>
            리셋
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "지급 중..." : "토큰 지급"}
          </Button>
        </div>
      </form>
    </section>
  );
};

export default GameTokenGrantPage;
