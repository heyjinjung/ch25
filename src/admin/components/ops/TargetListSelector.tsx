import React from "react";

import type { OpsTargetList } from "../../api/adminOpsPlanApi";

export type TargetListSelectorProps = {
  label?: string;
  value?: number | null;
  onChange: (value: number | null) => void;
  lists: OpsTargetList[];
  allowEmpty?: boolean;
  disabled?: boolean;
};

const TargetListSelector: React.FC<TargetListSelectorProps> = ({
  label = "?ÄÍπ?Î¶¨Ïä§??,
  value,
  onChange,
  lists,
  allowEmpty = true,
  disabled = false,
}) => {
  const selected = typeof value === "number" ? lists.find((tl) => tl.id === value) ?? null : null;

  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-bold text-admin-text-muted">{label}</label>
      <select
        className="w-full rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        disabled={disabled}
        aria-label={label}
      >
        {allowEmpty && <option value="">(?†ÌÉù ????</option>}
        {lists.map((tl) => (
          <option key={tl.id} value={tl.id}>
            #{tl.id} {tl.name} ({tl.count_snapshot}Î™?
          </option>
        ))}
      </select>
      {selected && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-admin-text-muted">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              selected.is_processed ? "bg-green-500/20 text-green-700" : "bg-yellow-500/20 text-yellow-700"
            }`}
          >
            {selected.is_processed ? "Ï≤òÎ¶¨?? : "?ÄÍ∏∞Ï§ë"}
          </span>
          <span>?Ä??{selected.count_snapshot}Î™?/span>
          <span>?åÏä§ {selected.source_type}</span>
        </div>
      )}
    </div>
  );
};

export default TargetListSelector;
