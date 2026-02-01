/**
 * CollapsibleSection - 접이식 섹션 컴포넌트
 * @module mission/components/CollapsibleSection
 */

import { useState, ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "../../../../../components/ui/card";
import { cn } from "../../../../../lib/utils";

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  iconColor?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  badge?: ReactNode;
}

export function CollapsibleSection({
  title,
  subtitle,
  icon,
  iconColor = "text-zinc-400",
  defaultOpen = false,
  children,
  badge,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className="bg-[#18181B] border-white/5 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg bg-white/5", iconColor)}>
            {icon}
          </div>
          <div className="text-left">
            <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
            {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
          </div>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-zinc-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-zinc-500" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pt-0 border-t border-white/5">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </Card>
  );
}

export default CollapsibleSection;
