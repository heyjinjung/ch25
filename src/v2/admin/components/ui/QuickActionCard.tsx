import { LucideIcon } from "lucide-react";
import { cn } from "../../../lib/utils";

interface QuickActionCardProps {
  icon: LucideIcon;
  label: string;
  description?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function QuickActionCard({
  icon: Icon,
  label,
  description,
  onClick,
  className,
}: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col items-start gap-2 rounded-xl border border-white/5 bg-zinc-900/50 p-4 text-left transition-all hover:border-white/20 hover:bg-zinc-900 active:scale-[0.98]",
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-zinc-400 transition-colors group-hover:bg-[#D2FD9C]/20 group-hover:text-[#D2FD9C]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h4 className="font-semibold text-zinc-100 group-hover:text-[#D2FD9C]">{label}</h4>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
    </button>
  );
}
