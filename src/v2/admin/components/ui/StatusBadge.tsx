import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";

export type StatusType = 
  | "PENDING" 
  | "APPROVED" 
  | "REJECTED" 
  | "PAID" 
  | "ACTIVE" 
  | "INACTIVE" 
  | "BANNED"
  | "WAITING";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20",
  WAITING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20 hover:bg-yellow-500/20",
  
  APPROVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20",
  PAID: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20",
  ACTIVE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20",
  
  REJECTED: "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20",
  BANNED: "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20",
  
  INACTIVE: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20 hover:bg-zinc-500/20",
  DEFAULT: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20 hover:bg-zinc-500/20",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status?.toUpperCase() || "DEFAULT";
  const style = STATUS_STYLES[normalizedStatus] || STATUS_STYLES.DEFAULT;

  return (
    <Badge variant="outline" className={cn("capitalize px-2 py-0.5 h-6", style, className)}>
      {status?.toLowerCase()}
    </Badge>
  );
}
