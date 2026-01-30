import { HelpCircle } from "lucide-react"

import { cn } from "../../../lib/utils"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./hover-card"

type InfoTooltipProps = {
  title: string
  description: string
  formula?: string
  note?: string
  className?: string
  iconClassName?: string
}

export function InfoTooltip({
  title,
  description,
  formula,
  note,
  className,
  iconClassName,
}: InfoTooltipProps) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-sm text-zinc-500 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60",
            className
          )}
          aria-label={`${title} 도움말`}
        >
          <HelpCircle className={cn("h-4 w-4", iconClassName)} />
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="start" sideOffset={6} className="w-80">
        <div className="space-y-2">
          <div className="text-sm font-semibold text-white">{title}</div>
          <div className="text-sm leading-relaxed text-zinc-200 whitespace-pre-line">
            {description}
          </div>
          {formula ? (
            <div className="rounded-md bg-white/5 p-2 text-xs text-zinc-200 whitespace-pre-line">
              {formula}
            </div>
          ) : null}
          {note ? (
            <div className="text-xs text-zinc-400 whitespace-pre-line">{note}</div>
          ) : null}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
