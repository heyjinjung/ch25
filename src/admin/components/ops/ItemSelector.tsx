import React, { useMemo, useState } from "react";

import { OPS_PLAYBOOK_ACTIONS } from "../../constants/opsPlaybookCatalog";
import { REWARD_TYPES } from "../../constants/rewardTypes";

type ItemCategory = "CURRENCY" | "TICKET" | "ITEM" | "ALL";

type ItemOption = {
  code: string;
  label: string;
  category: Exclude<ItemCategory, "ALL">;
};

const CATEGORY_LABEL: Record<Exclude<ItemCategory, "ALL">, string> = {
  CURRENCY: "?¨Ìôî",
  TICKET: "?∞Ïºì/??,
  ITEM: "?ÑÏù¥??Í∏∞Ì?",
};

function inferCategory(code: string): Exclude<ItemCategory, "ALL"> {
  const upper = code.toUpperCase();
  if (upper === "POINT" || upper === "CC_POINT" || upper === "GAME_XP") return "CURRENCY";
  if (upper.includes("TICKET") || upper.endsWith("_TOKEN") || upper.endsWith("_COIN") || upper.endsWith("_KEY")) return "TICKET";
  return "ITEM";
}

function buildItemOptions(): ItemOption[] {
  const map = new Map<string, ItemOption>();

  REWARD_TYPES.forEach((reward) => {
    const code = reward.value;
    const category = inferCategory(code);
    map.set(code, { code, label: reward.label, category });
  });

  OPS_PLAYBOOK_ACTIONS.forEach((action) => {
    const payload = action.payload_json as Record<string, unknown>;
    const items = Array.isArray(payload.items) ? payload.items : [];
    items.forEach((raw) => {
      const item = raw as Record<string, unknown>;
      const code = String(item.item_type ?? "").trim();
      if (!code) return;
      if (!map.has(code)) {
        map.set(code, { code, label: code, category: inferCategory(code) });
      }
    });
  });

  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

export type ItemSelectorProps = {
  value: string;
  onChange: (value: string) => void;
  categoryFilter?: ItemCategory;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
};

const ItemSelector: React.FC<ItemSelectorProps> = ({
  value,
  onChange,
  categoryFilter = "ALL",
  label = "?ÑÏù¥???†ÌÉù",
  placeholder = "?ÑÏù¥??Í≤Ä??,
  disabled = false,
}) => {
  const [query, setQuery] = useState<string>("");
  const options = useMemo(() => buildItemOptions(), []);
  const optionsByCategory = useMemo(() => {
    const groups = new Map<Exclude<ItemCategory, "ALL">, ItemOption[]>();
    options.forEach((opt) => {
      if (categoryFilter !== "ALL" && opt.category !== categoryFilter) return;
      if (query) {
        const q = query.toLowerCase();
        if (!opt.code.toLowerCase().includes(q) && !opt.label.toLowerCase().includes(q)) return;
      }
      if (!groups.has(opt.category)) groups.set(opt.category, []);
      groups.get(opt.category)!.push(opt);
    });
    return groups;
  }, [categoryFilter, options, query]);

  const knownCodes = useMemo(() => new Set(options.map((opt) => opt.code)), [options]);
  const showUnknown = value && !knownCodes.has(value);
  const showEmpty = !value;

  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-bold text-admin-text-muted">{label}</label>
      <input
        className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={`${label} Í≤Ä??}
      />
      <select
        className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={label}
      >
        {showEmpty && <option value="">(?†ÌÉù ????</option>}
        {showUnknown && <option value={value}>{value} (?±Î°ù?òÏ? ?äÏùå)</option>}
        {Array.from(optionsByCategory.entries()).map(([category, opts]) => (
          <optgroup key={category} label={CATEGORY_LABEL[category]}>
            {opts.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {showUnknown && (
        <div className="text-[11px] text-admin-warning">?±Î°ù?òÏ? ?äÏ? ÏΩîÎìú?ÖÎãà?? ?†ÌÉù Î™©Î°ù???ïÏù∏?¥Ï£º?∏Ïöî.</div>
      )}
    </div>
  );
};

export default ItemSelector;
