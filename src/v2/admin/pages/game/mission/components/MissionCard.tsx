/**
 * MissionCard - 미션 카드 컴포넌트
 * @module mission/components/MissionCard
 */

import {
  Edit2,
  Copy,
  Trash2,
  MoreHorizontal,
  Ticket,
  Gift,
  Coins,
} from "lucide-react";
import { Badge } from "../../../../../components/ui/badge";
import { Switch } from "../../../../../components/ui/switch";
import { Button } from "../../../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../../../../components/ui/dropdown-menu";
import { cn } from "../../../../../lib/utils";
import { type AdminMissionDto } from "../../../../../api/adminApi";
import {
  CATEGORY_COLORS,
  MISSION_REWARD_OPTIONS,
} from "../constants/missionConstants";

function getRewardIcon(rewardType: string) {
  switch (rewardType) {
    case "TICKET_ROULETTE":
    case "TICKET_DICE":
    case "TICKET_LOTTERY":
      return <Ticket className="w-4 h-4 text-amber-400" />;
    case "GOLD_KEY":
    case "DIAMOND_KEY":
      return <Gift className="w-4 h-4 text-purple-400" />;
    case "VAULT":
    case "XP":
    default:
      return <Coins className="w-4 h-4 text-emerald-400" />;
  }
}

interface MissionCardProps {
  mission: AdminMissionDto;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
  onDuplicate: () => void;
}

export function MissionCard({
  mission,
  onEdit,
  onDelete,
  onToggleActive,
  onDuplicate,
}: MissionCardProps) {
  const categoryStyle: { bg: string; text: string; border: string } =
    CATEGORY_COLORS[mission.category] ?? {
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/20",
    };
  const rewardLabel =
    MISSION_REWARD_OPTIONS.find((r) => r.value === mission.rewardType)?.label ||
    mission.rewardType;

  return (
    <div className="group relative bg-[#0D0D0F] rounded-xl border border-white/5 hover:border-white/10 transition-all overflow-hidden">
      {/* Status indicator */}
      <div
        className={cn(
          "absolute top-0 left-0 w-1 h-full",
          mission.isActive ? "bg-emerald-500" : "bg-zinc-600",
        )}
      />

      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Mission Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <h4 className="font-semibold text-zinc-100 truncate">
                {mission.title}
              </h4>
              {!mission.isActive && (
                <Badge
                  variant="secondary"
                  className="text-[10px] h-5 bg-zinc-800 text-zinc-400"
                >
                  비활성
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge
                className={cn(
                  "text-[10px]",
                  categoryStyle.bg,
                  categoryStyle.text,
                  categoryStyle.border,
                )}
              >
                {mission.category}
              </Badge>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400 font-mono">
                {mission.actionType || "N/A"}
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400">
                목표: {mission.targetValue}회
              </span>
            </div>

            {mission.condition && (
              <p className="text-xs text-zinc-500 mt-2 truncate">
                {mission.condition}
              </p>
            )}
          </div>

          {/* Right: Reward & Actions */}
          <div className="flex items-center gap-3">
            {/* Reward Display */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/5">
              {getRewardIcon(mission.rewardType)}
              <span className="text-sm font-medium text-zinc-200">
                {mission.rewardAmount}
              </span>
              <span className="text-[10px] text-zinc-500 max-w-20 truncate">
                {rewardLabel}
              </span>
            </div>

            {/* Toggle */}
            <Switch
              checked={mission.isActive}
              onCheckedChange={onToggleActive}
              className="data-[state=checked]:bg-emerald-500"
            />

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-zinc-500 hover:text-white"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-[#18181B] border-white/10 text-white"
              >
                <DropdownMenuItem
                  onClick={onEdit}
                  className="cursor-pointer hover:bg-white/5"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  편집
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDuplicate}
                  className="cursor-pointer hover:bg-white/5"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  복제
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={onDelete}
                  className="cursor-pointer hover:bg-red-500/10 text-red-400 focus:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MissionCard;
