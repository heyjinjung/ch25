import React from "react";

export const OpsTaskList: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mt-4 space-y-3">{children}</div>
);

type OpsTaskCardProps = {
  header: React.ReactNode;
  children: React.ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  collapseLabel?: string;
};

export const OpsTaskCard: React.FC<OpsTaskCardProps> = ({
  header,
  children,
  collapsed = false,
  onToggleCollapse,
  collapseLabel,
}) => (
  <div className="rounded-2xl border border-admin-border bg-admin-bg/60 p-4 shadow-sm space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex-1 min-w-[220px]">{header}</div>
      {onToggleCollapse && (
        <button
          type="button"
          className="md:hidden rounded-lg border border-admin-border bg-admin-bg px-3 py-2 text-xs font-bold text-admin-text-secondary"
          onClick={onToggleCollapse}
          aria-label="작업 카드 접기/펼치기"
        >
          {collapseLabel ?? (collapsed ? "펼치기" : "접기")}
        </button>
      )}
    </div>

    <div className={collapsed ? "hidden md:block" : ""}>{children}</div>
  </div>
);

export const TaskEditor: React.FC<{ title: string; typeLabel: string; children: React.ReactNode }> = ({
  title,
  typeLabel,
  children,
}) => (
  <div className="w-full">
    <div className="rounded-xl border border-admin-border bg-admin-bg/60 p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-admin-text-primary font-semibold">{title}</div>
        <span className="rounded-md border border-admin-border bg-admin-bg px-2 py-0.5 text-[11px] font-bold text-admin-text-muted">
          {typeLabel}
        </span>
      </div>
      {children}
    </div>
  </div>
);
