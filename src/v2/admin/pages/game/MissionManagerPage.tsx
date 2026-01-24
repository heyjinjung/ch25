import { useState } from "react";
import {
  useAdminMissions,
  useAdminUpdateMission,
  useAdminCreateMission,
  useAdminDeleteMission,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Label } from "../../../components/ui/label";
import { Ticket, Gift, Coins, Plus, Trash2, Edit2 } from "lucide-react";
import { REWARD_ITEMS } from "../../../constants/rewardItems";

/**
 * V2 SoT-compliant mission reward options
 * 근거: docs/v2_specs/01_core/v2_reward_type_standard_sot_ko.md
 */
const MISSION_REWARD_OPTIONS = REWARD_ITEMS;

// Mock Categories for Tabs
const CATEGORIES = ["DAILY", "WEEKLY", "NEW_USER", "SPECIAL_EVENT"];

export default function MissionManagerPage() {
  const { data: missions = [], isLoading } = useAdminMissions();
  const updateMutation = useAdminUpdateMission();
  const createMutation = useAdminCreateMission();
  const deleteMutation = useAdminDeleteMission();

  const [activeTab, setActiveTab] = useState("DAILY");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<AdminMissionDto | null>(null);
  const [createForm, setCreateForm] = useState({
    category: "DAILY",
    title: "",
    condition: "",
    rewardType: "VAULT",
    rewardAmount: 100,
    targetValue: 1,
    logicKey: "PLAY_GAME",
  });

  const handleCreate = () => {
    createMutation.mutate(createForm, {
      onSuccess: () => {
        setIsCreateOpen(false);
        setCreateForm({
          category: "DAILY",
          title: "",
          condition: "",
          rewardType: "VAULT",
          rewardAmount: 100,
          targetValue: 1,
          logicKey: "PLAY_GAME",
        });
      },
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("정말 이 미션을 삭제하시겠습니까?")) {
      deleteMutation.mutate(id);
    }
  };

  const openEdit = (mission: AdminMissionDto) => {
    setEditForm({ ...mission });
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editForm) return;
    updateMutation.mutate(
      {
        id: editForm.id,
        data: {
          category: editForm.category,
          title: editForm.title,
          condition: editForm.condition,
          targetValue: editForm.targetValue,
          logicKey: editForm.logicKey,
          rewardType: editForm.rewardType,
          rewardAmount: editForm.rewardAmount,
          isActive: editForm.isActive,
        },
      },
      {
        onSuccess: () => setIsEditOpen(false),
      },
    );
  };

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
      // V2 SoT: Game Tickets
      case "ROULETTE_TICKET":
      case "DICE_TICKET":
      case "LOTTERY_TICKET":
        return <Ticket className="w-4 h-4 text-emerald-400" />;
      // V2 SoT: Vault
      case "VAULT":
        return <Coins className="w-4 h-4 text-yellow-400" />;
      // V2 SoT: Currency
      case "DIAMOND":
        return <Coins className="w-4 h-4 text-sky-400" />;
      // V2 SoT: Premium Tickets
      case "GOLD_KEY_TICKET":
      case "DIAMOND_TICKET":
        return <Gift className="w-4 h-4 text-purple-400" />;
      // V2 SoT: Fragments
      case "GOLD_KEY_FRAGMENT":
      case "DIAMOND_FRAGMENT":
        return <Gift className="w-4 h-4 text-amber-400" />;
      // V2 SoT: Puzzle Pieces
      case "PUZZLE_C1":
      case "PUZZLE_C2":
      case "PUZZLE_J":
      case "PUZZLE_M":
        return <Gift className="w-4 h-4 text-indigo-400" />;
      // V2 SoT: Gifticoms
      case "CHICKEN_GIFTICON_5000":
      case "CHICKEN_GIFTICON_10000":
      case "STARBUCKS_GIFTICON_2000":
      case "STARBUCKS_GIFTICON_10000":
      case "PIZZA_GIFTICON_5000":
      case "PIZZA_GIFTICON_10000":
      case "GOOGLE_GIFTICON_5000":
      case "GOOGLE_GIFTICON_10000":
        return <Gift className="w-4 h-4 text-pink-400" />;
      // V2 SoT: Special
      case "NONE":
        return null;
      // Legacy support
      case "TICKET_ROULETTE":
      case "TICKET_DICE":
      case "TICKET_LOTTERY":
        return <Ticket className="w-4 h-4 text-emerald-400 opacity-50" />;
      case "POINT":
        return <Coins className="w-4 h-4 text-yellow-400 opacity-50" />;
      case "GOLD_KEY":
      case "DIAMOND_KEY":
        return <Gift className="w-4 h-4 text-purple-400 opacity-50" />;
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
            데일리 미션 리스트 및 보상을 설정합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          >
            Active Season 25
          </Badge>
          <Button
            size="sm"
            className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="w-4 h-4" />
            미션 생성
          </Button>
        </div>
      </div>

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

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-zinc-500 hover:text-indigo-400 hover:bg-indigo-500/10"
                      onClick={() => openEdit(mission)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDelete(mission.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>새 미션 생성</DialogTitle>
            <DialogDescription className="text-zinc-400">
              신규 미션의 기본 정보와 보상을 설정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right text-zinc-400">
                카테고리
              </Label>
              <Select
                value={createForm.category}
                onValueChange={(val) =>
                  setCreateForm({ ...createForm, category: val })
                }
              >
                <SelectTrigger className="col-span-3 bg-black/50 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#18181B] border-white/10 text-white">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="title" className="text-right text-zinc-400">
                제목
              </Label>
              <Input
                id="title"
                value={createForm.title}
                onChange={(e) =>
                  setCreateForm({ ...createForm, title: e.target.value })
                }
                className="col-span-3 bg-black/50 border-white/10"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="logicKey" className="text-right text-zinc-400">
                로직 키
              </Label>
              <Input
                id="logicKey"
                value={createForm.logicKey}
                onChange={(e) =>
                  setCreateForm({ ...createForm, logicKey: e.target.value })
                }
                className="col-span-3 bg-black/50 border-white/10"
                placeholder="PLAY_ROULETTE, ATTENDANCE..."
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="condition" className="text-right text-zinc-400">
                설명/조건
              </Label>
              <Input
                id="condition"
                value={createForm.condition}
                onChange={(e) =>
                  setCreateForm({ ...createForm, condition: e.target.value })
                }
                className="col-span-3 bg-black/50 border-white/10"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="targetValue" className="text-right text-zinc-400">
                목표 점수
              </Label>
              <Input
                id="targetValue"
                type="number"
                value={createForm.targetValue}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    targetValue: parseInt(e.target.value),
                  })
                }
                className="col-span-3 bg-black/50 border-white/10"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reward" className="text-right text-zinc-400">
                보상
              </Label>
              <div className="col-span-3 flex gap-2">
                <Select
                  value={createForm.rewardType}
                  onValueChange={(val) =>
                    setCreateForm({ ...createForm, rewardType: val })
                  }
                >
                  <SelectTrigger className="flex-1 bg-black/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-white/10 text-white max-h-[200px]">
                    {MISSION_REWARD_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  className="w-24 bg-black/50 border-white/10"
                  value={createForm.rewardAmount}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      rewardAmount: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsCreateOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              취소
            </Button>
            <Button
              onClick={handleCreate}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>미션 편집</DialogTitle>
            <DialogDescription className="text-zinc-400">
              기존 미션의 조건/보상을 수정합니다.
            </DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-zinc-400">카테고리</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(val) =>
                    setEditForm({ ...editForm, category: val as any })
                  }
                >
                  <SelectTrigger className="col-span-3 bg-black/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#18181B] border-white/10 text-white">
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-zinc-400">제목</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="col-span-3 bg-black/50 border-white/10"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-zinc-400">로직 키</Label>
                <Input
                  value={editForm.logicKey}
                  onChange={(e) =>
                    setEditForm({ ...editForm, logicKey: e.target.value })
                  }
                  className="col-span-3 bg-black/50 border-white/10"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-zinc-400">설명/조건</Label>
                <Input
                  value={editForm.condition}
                  onChange={(e) =>
                    setEditForm({ ...editForm, condition: e.target.value })
                  }
                  className="col-span-3 bg-black/50 border-white/10"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-zinc-400">목표 점수</Label>
                <Input
                  type="number"
                  value={editForm.targetValue}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      targetValue: parseInt(e.target.value),
                    })
                  }
                  className="col-span-3 bg-black/50 border-white/10"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-zinc-400">보상</Label>
                <div className="col-span-3 flex gap-2">
                  <Select
                    value={editForm.rewardType}
                    onValueChange={(val) =>
                      setEditForm({ ...editForm, rewardType: val })
                    }
                  >
                    <SelectTrigger className="flex-1 bg-black/50 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#18181B] border-white/10 text-white max-h-[200px]">
                      {MISSION_REWARD_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    className="w-24 bg-black/50 border-white/10"
                    value={editForm.rewardAmount}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        rewardAmount: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-end">
                <Switch
                  checked={editForm.isActive}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, isActive: checked })
                  }
                />
                <span className="ml-2 text-sm text-zinc-400">활성</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsEditOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              취소
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
