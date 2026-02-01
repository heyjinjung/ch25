import { cn } from "../../lib/utils";

type InlineNoticeVariant = "info" | "warning";

export default function InlineNotice({
  title,
  description,
  variant = "info",
  className,
}: {
  title?: string;
  description: string;
  variant?: InlineNoticeVariant;
  className?: string;
}) {
  const styles =
    variant === "warning"
      ? "border-amber-500/20 bg-amber-500/10 text-amber-50"
      : "border-white/10 bg-white/5 text-white";

  return (
    <div className={cn("rounded-2xl border p-4", styles, className)}>
      {title ? (
        <div className="text-sm font-black tracking-tight">{title}</div>
      ) : null}
      <div className={cn("text-sm", title ? "mt-1" : undefined)}>
        {description}
      </div>
    </div>
  );
}
