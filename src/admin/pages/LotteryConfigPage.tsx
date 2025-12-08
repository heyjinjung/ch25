// src/admin/pages/LotteryConfigPage.tsx
import React, { useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AdminLotteryConfig,
  AdminLotteryConfigPayload,
  fetchLotteryConfigs,
  createLotteryConfig,
  updateLotteryConfig,
} from "../api/adminLotteryApi";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";

const prizeSchema = z.object({
  label: z.string().min(1, "Enter prize name"),
  weight: z.number().int().nonnegative(),
  stock: z.number().int().nullable().optional(),
  reward_type: z.string().min(1, "Enter reward type"),
  reward_value: z.number().int().nonnegative(),
  is_active: z.boolean().default(true),
});

const lotterySchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    is_active: z.boolean().default(false),
    max_daily_plays: z.number().int().positive("At least 1 per day"),
    prizes: z.array(prizeSchema).min(1, "Add at least 1 prize"),
  })
  .refine((value) => value.prizes.some((p) => p.is_active && p.weight > 0), {
    message: "At least one active prize must have weight > 0",
    path: ["prizes"],
  })
  .refine((value) => {
    const labels = value.prizes.map((p) => p.label.trim());
    return new Set(labels).size === labels.length;
  }, {
    message: "Prize names must be unique",
    path: ["prizes"],
  });

type LotteryFormValues = z.infer<typeof lotterySchema>;

const LotteryConfigPage: React.FC = () => {
  const [editing, setEditing] = useState<AdminLotteryConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "lottery"],
    queryFn: fetchLotteryConfigs,
  });

  const defaultValues = useMemo<LotteryFormValues>(
    () =>
      editing
        ? {
            name: editing.name,
            is_active: editing.is_active,
            max_daily_plays: editing.max_daily_plays,
            prizes: editing.prizes,
          }
        : {
            name: "Test Lottery",
            is_active: true,
            max_daily_plays: 1,
            prizes: [
              { label: "100P", weight: 50, stock: null, reward_type: "POINT", reward_value: 100, is_active: true },
              { label: "Coupon", weight: 10, stock: 100, reward_type: "COUPON", reward_value: 1, is_active: true },
            ],
          },
    [editing]
  );

  const form = useForm<LotteryFormValues>({
    resolver: zodResolver(lotterySchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "prizes" });

  const resetAndClose = () => {
    setIsModalOpen(false);
    setEditing(null);
    form.reset(defaultValues);
  };

  const mutation = useMutation({
    mutationFn: (payload: AdminLotteryConfigPayload) =>
      editing ? updateLotteryConfig(editing.id, payload) : createLotteryConfig(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "lottery"] });
      resetAndClose();
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    const payload: AdminLotteryConfigPayload = {
      ...values,
      prizes: values.prizes.map((p) => ({
        ...p,
        stock: p.stock === null || p.stock === undefined || Number.isNaN(p.stock) ? null : p.stock,
      })),
    };
    mutation.mutate(payload);
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Lottery Config</h1>
          <p className="text-sm text-slate-300">At least one active prize must have weight &gt; 0. Prize names must be unique.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>New Config</Button>
      </div>

      {isLoading && <div className="rounded-lg border border-emerald-700/40 bg-slate-900 p-4 text-slate-200">Loading...</div>}
      {isError && (
        <div className="rounded-lg border border-red-500/40 bg-red-950 p-4 text-red-100">Load failed: {(error as Error).message}</div>
      )}

      {!isLoading && data && data.length === 0 && (
        <div className="rounded-lg border border-emerald-700/40 bg-slate-900 p-4 text-slate-200">No configs yet.</div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-emerald-800/40 bg-slate-900/70 shadow-lg shadow-emerald-900/30">
          <table className="min-w-full divide-y divide-emerald-800/60">
            <thead className="bg-emerald-900/40 text-left text-slate-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold">Name</th>
                <th className="px-4 py-3 text-sm font-semibold">Daily Limit</th>
                <th className="px-4 py-3 text-sm font-semibold">Prizes</th>
                <th className="px-4 py-3 text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-sm font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-800/40 text-slate-100">
              {data.map((config) => (
                <tr key={config.id} className="hover:bg-emerald-900/20">
                  <td className="px-4 py-3 text-sm font-semibold">{config.name}</td>
                  <td className="px-4 py-3 text-sm">{config.max_daily_plays}</td>
                  <td className="px-4 py-3 text-sm">{config.prizes.length}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={config.is_active ? "text-emerald-400" : "text-slate-400"}>
                      {config.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditing(config);
                        setIsModalOpen(true);
                        form.reset({
                          name: config.name,
                          is_active: config.is_active,
                          max_daily_plays: config.max_daily_plays,
                          prizes: config.prizes,
                        });
                      }}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={isModalOpen} onClose={resetAndClose} title={editing ? "Edit Lottery" : "New Lottery"}>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-sm text-slate-200">Name</label>
            <input
              className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
              {...form.register("name")}
              type="text"
              placeholder="Lottery name"
            />
            {form.formState.errors.name && <p className="text-sm text-red-300">{form.formState.errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm text-slate-200">Max tickets per day</label>
              <input
                type="number"
                className="w-full rounded-md border border-emerald-700 bg-slate-800 px-3 py-2 text-slate-50 focus:border-emerald-400 focus:outline-none"
                {...form.register("max_daily_plays", { valueAsNumber: true })}
              />
              {form.formState.errors.max_daily_plays && (
                <p className="text-sm text-red-300">{form.formState.errors.max_daily_plays.message}</p>
              )}
            </div>
            <div className="flex items-center space-x-3 pt-6">
              <input type="checkbox" className="h-4 w-4" {...form.register("is_active")} />
              <span className="text-sm text-slate-200">Active</span>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-emerald-800/60 bg-slate-900/70 p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">Prizes</h3>
              <Button
                variant="secondary"
                type="button"
                onClick={() =>
                  append({ label: "New prize", weight: 1, reward_type: "POINT", reward_value: 0, stock: null, is_active: true })
                }
              >
                Add row
              </Button>
            </div>
            {form.formState.errors.prizes && (
              <p className="text-sm text-red-300">{form.formState.errors.prizes.message as string}</p>
            )}
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div key={field.id} className="grid grid-cols-1 gap-2 rounded-md border border-emerald-800/50 bg-slate-900 p-3 md:grid-cols-6">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs text-slate-300">Prize</label>
                    <input
                      type="text"
                      className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                      {...form.register(`prizes.${idx}.label`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">Weight</label>
                    <input
                      type="number"
                      className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                      {...form.register(`prizes.${idx}.weight`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">Stock (빈칸=무제한)</label>
                    <input
                      type="number"
                      className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                      {...form.register(`prizes.${idx}.stock`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">Reward type</label>
                    <input
                      type="text"
                      className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                      {...form.register(`prizes.${idx}.reward_type`)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">Reward value</label>
                    <input
                      type="number"
                      className="w-full rounded border border-emerald-700 bg-slate-800 px-2 py-1 text-sm"
                      {...form.register(`prizes.${idx}.reward_value`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <label className="text-xs text-slate-300">Active</label>
                    <input type="checkbox" className="h-4 w-4" {...form.register(`prizes.${idx}.is_active`)} />
                    <Button variant="secondary" type="button" onClick={() => remove(idx)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="secondary" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
};

export default LotteryConfigPage;
