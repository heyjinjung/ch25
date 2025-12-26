// src/admin/pages/GameTokenGrantPage.tsx
import React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { RotateCcw, Send } from "lucide-react";
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

  const inputClass =
    "w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#2D6B3B]";
  const labelClass = "mb-2 block text-sm font-medium text-gray-300";

  return (
    <section className="space-y-5">
      <header>
        <h2 className="text-2xl font-bold text-[#91F402]">티켓 지급</h2>
        <p className="mt-1 text-sm text-gray-400">id 기준으로 지급합니다.</p>
      </header>

      <div className="rounded-lg border border-[#333333] bg-[#111111] p-6 shadow-md">
        {mutation.isSuccess && mutation.data && (
          <div className="rounded-lg border border-[#2D6B3B] bg-[#0A0A0A] p-4 text-gray-200">
            <p className="text-sm font-semibold text-[#91F402]">지급 완료</p>
            <p className="mt-1 text-sm">external_id: {mutation.data.external_id ?? mutation.data.user_id}</p>
            <p className="mt-1 text-sm">
              {GAME_TOKEN_LABELS[mutation.data.token_type] ?? mutation.data.token_type} / 잔액 {mutation.data.balance}
            </p>
          </div>
        )}

        {mutation.isError && (
          <div className="rounded-lg border border-red-500/40 bg-red-950 p-4 text-red-100">
            {(mutation.error as Error).message || "지급에 실패했습니다."}
          </div>
        )}

        <form className="mt-5 space-y-5" onSubmit={onSubmit}>
          <div>
            <label className={labelClass}>external_id</label>
            <input className={inputClass} {...form.register("external_id")} type="text" placeholder="ex: test-qa-999" />
            {form.formState.errors.external_id && <p className="mt-2 text-sm text-red-300">{form.formState.errors.external_id.message}</p>}
          </div>

          <div>
            <label className={labelClass}>토큰 종류</label>
            <select className={inputClass} {...form.register("token_type")}>
              {tokenOptions.map((t) => (
                <option key={t} value={t}>
                  {GAME_TOKEN_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>금액</label>
            <input type="number" className={inputClass} {...form.register("amount", { valueAsNumber: true })} />
            {form.formState.errors.amount && <p className="mt-2 text-sm text-red-300">{form.formState.errors.amount.message}</p>}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => form.reset({ external_id: "", token_type: "ROULETTE_COIN", amount: 10 })}
              disabled={mutation.isPending}
              className="inline-flex items-center rounded-md border border-[#333333] bg-[#1A1A1A] px-4 py-2 text-sm font-medium text-gray-200 hover:bg-[#2C2C2E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCcw size={16} className="mr-2" />
              초기화
            </button>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center rounded-md bg-[#2D6B3B] px-5 py-2 text-sm font-medium text-white hover:bg-[#91F402] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} className="mr-2" />
              {mutation.isPending ? "지급 중..." : "티켓 지급"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default GameTokenGrantPage;
