import { useState } from "react";
import {
  useAdminMissions,
  useAdminUpdateMission,
} from "../../../hooks/useAdminGame";
import { type AdminMissionDto } from "../../../api/adminApi";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import { Card } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Switch } from "../../../components/ui/switch";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Ticket, Gift, Coins } from "lucide-react";

type MissionRewardTypeValue =
  | "NONE"
  | "DIAMOND"
  | "GOLD_KEY"
  | "DIAMOND_KEY"
  | "CASH_UNLOCK"
  | "TICKET_BUNDLE"
  | "TICKET_ROULETTE"
  | "TICKET_LOTTERY"
  | "TICKET_DICE"
  | "POINT"
  | "GIFTICON_BAEMIN"
  | "GIFTICON_COMPOSE"
  | "CC_POINT"
  | "GAME_XP"
  | "TICKET"
  | "BUNDLE";

const MISSION_REWARD_OPTIONS: readonly {
  value: MissionRewardTypeValue;
  label: string;
}[] = [
  { value: "POINT", label: "금고 포인트 (P)" },
  { value: "TICKET_ROULETTE", label: "룰렛 티켓" },
  { value: "TICKET_DICE", label: "다이스 티켓" },
  { value: "TICKET_LOTTERY", label: "복권 티켓" },
  { value: "DIAMOND", label: "다이아몬드" },
  { value: "TICKET_BUNDLE", label: "티켓 번들" },
  { value: "GIFTICON_BAEMIN", label: "기프티콘(배민)" },
  { value: "GIFTICON_COMPOSE", label: "기프티콘(컴포즈)" },
  // 마이그레이션/표준 타입(백엔드 enum에 존재)
  { value: "CC_POINT", label: "CC 포인트" },
  { value: "GAME_XP", label: "게임 XP" },
  { value: "TICKET", label: "만능 티켓" },
  { value: "BUNDLE", label: "번들" },
  // 기타
  { value: "GOLD_KEY", label: "골드 키" },
  { value: "DIAMOND_KEY", label: "다이아 키" },
  { value: "CASH_UNLOCK", label: "출금 잠금 해제" },
  { value: "NONE", label: "없음 (보상 없음)" },
] as const;

// Mock Categories for Tabs
const CATEGORIES = ["DAILY", "WEEKLY", "NEW_USER", "SPECIAL_EVENT"];

export default function MissionManagerPage() {
  const { data: missions = [], isLoading } = useAdminMissions();
  const updateMutation = useAdminUpdateMission();

  const [activeTab, setActiveTab] = useState("DAILY");

  // Filter missions by active tab
  const filteredMissions = missions.filter((m) => m.category === activeTab);

  const handleUpdate = (
    id: number,
    field: keyof AdminMissionDto,
    value: any,
  ) => {
    updateMutation.mutate({ id, data: { [field]: value } });
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "TICKET_ROULETTE":
      case "TICKET_DICE":
      case "TICKET_LOTTERY":
        return <Ticket className="w-4 h-4 text-emerald-400" />;
      case "POINT":
        return <Coins className="w-4 h-4 text-yellow-400" />;
      case "DIAMOND":
        return <Coins className="w-4 h-4 text-sky-400" />;
      case "TICKET_BUNDLE":
        return <Gift className="w-4 h-4 text-purple-400" />;
      case "GIFTICON_BAEMIN":
      case "GIFTICON_COMPOSE":
        return <Gift className="w-4 h-4 text-pink-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 text-white p-6 h-full overflow-y-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            미션 관리 (Mission Ops)
          </h1>
          <p className="text-sm text-zinc-400">
            일일 미션 및 스트릭 보상을 설정합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          >
            Active Season 25
          </Badge>
        </div>
      </div>

      {/* Search/Filter area or just the list directly */}
      <div className="space-y-4">
        <Tabs
          defaultValue="DAILY"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4 bg-[#18181B] border border-white/5">
            {CATEGORIES.map((cat) => (
              <TabsTrigger
                key={cat}
                value={cat}
                className="data-[state=active]:bg-zinc-800"
              >
                {cat}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-4">
            {isLoading ? (
              <div className="text-center py-20 text-zinc-500">
                Loading missions...
              </div>
            ) : filteredMissions.length === 0 ? (
              <div className="text-center py-20 text-zinc-500 border border-dashed border-white/10 rounded-xl">
                등록된 미션이 없습니다.
              </div>
            ) : (
              filteredMissions.map((mission) => (
                <Card
                  key={mission.id}
                  className="bg-[#18181B] border-white/5 transition-all hover:border-white/10"
                >
                  <div className="flex items-center p-4 gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-base text-zinc-200">
                          {mission.title}
                        </h4>
                        {!mission.isActive && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-5"
                          >
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {mission.condition}
                      </p>
                    </div>

                    {/* Reward Config */}
                    <div className="flex items-center gap-3 bg-black/30 px-4 py-3 rounded-xl border border-white/5">
                      <div className="flex items-center gap-2 min-w-[160px]">
                        {getRewardIcon(mission.rewardType)}
                        <Select
                          defaultValue={mission.rewardType}
                          onValueChange={(val) =>
                            handleUpdate(mission.id, "rewardType", val)
                          }
                        >
                          <SelectTrigger className="h-9 text-sm bg-transparent border-none font-medium text-zinc-200 hover:text-white focus:ring-0 focus:ring-offset-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#18181B] border-white/10 text-white max-h-[300px]">
                            {MISSION_REWARD_OPTIONS.map((item) => (
                              <SelectItem
                                key={item.value}
                                value={item.value}
                                className="text-sm py-2.5 cursor-pointer hover:bg-white/5 focus:bg-white/10"
                              >
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="h-9 w-24 text-right bg-black/50 border-white/10 text-sm font-mono text-white focus:border-emerald-500/50 focus-visible:ring-1 focus-visible:ring-emerald-500/20"
                          defaultValue={mission.rewardAmount}
                          onBlur={(e) =>
                            handleUpdate(
                              mission.id,
                              "rewardAmount",
                              parseInt(e.target.value),
                            )
                          }
                        />
                        <span className="text-xs text-zinc-500 font-medium">
                          개
                        </span>
                      </div>
                    </div>

                    <Switch
                      checked={mission.isActive}
                      onCheckedChange={(checked) =>
                        handleUpdate(mission.id, "isActive", checked)
                      }
                    />
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
