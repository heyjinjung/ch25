/**
 * 스트릭 보상 규칙 설정 섹션
 */
import { useState, useEffect } from "react";
import { Badge } from "../../../../../components/ui/badge";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import { Switch } from "../../../../../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components/ui/select";
import {
  Plus,
  Trash2,
  Edit2,
  Save,
  Flame,
  Loader2,
  AlertCircle,
  Settings,
} from "lucide-react";
import { cn } from "../../../../../lib/utils";
import { CollapsibleSection } from "./CollapsibleSection";
import {
  useAdminUiConfig,
  useAdminUpdateUiConfig,
} from "../../../../../hooks/useAdminUiConfig";
import type { StreakRule, StreakGrant } from "../types";

export function StreakRulesSection() {
  const [editingRules, setEditingRules] = useState<StreakRule[]>([]);
  const [isRulesEditing, setIsRulesEditing] = useState(false);

  const { data: streakRulesConfig, isLoading: isRulesLoading } =
    useAdminUiConfig("streak_reward_rules");
  const updateRulesMutation = useAdminUpdateUiConfig();

  useEffect(() => {
    if (streakRulesConfig?.value) {
      const config = streakRulesConfig.value as { rules?: StreakRule[] };
      setEditingRules(config.rules || []);
    }
  }, [streakRulesConfig]);

  const handleAddRule = () => {
    const existingDays = editingRules.map((r) => r.day);
    let newDay = 1;
    while (existingDays.includes(newDay)) newDay++;
    const newRule: StreakRule = {
      day: newDay,
      enabled: true,
      grants: [
        { kind: "WALLET" as const, token_type: "ROULETTE_TICKET", amount: 1 },
      ],
    };
    setEditingRules([...editingRules, newRule].sort((a, b) => a.day - b.day));
  };

  const handleSaveRules = () => {
    updateRulesMutation.mutate({
      key: "streak_reward_rules",
      payload: { value: { rules: editingRules } },
    });
    setIsRulesEditing(false);
  };

  const handleCancelEdit = () => {
    if (streakRulesConfig?.value) {
      const config = streakRulesConfig.value as { rules?: StreakRule[] };
      setEditingRules(config.rules || []);
    }
    setIsRulesEditing(false);
  };

  const handleCreateDefaultRules = () => {
    setEditingRules([
      {
        day: 3,
        enabled: true,
        grants: [
          { kind: "WALLET", token_type: "ROULETTE_TICKET", amount: 1 },
          { kind: "WALLET", token_type: "DICE_TICKET", amount: 1 },
          { kind: "WALLET", token_type: "LOTTERY_TICKET", amount: 1 },
        ],
      },
      {
        day: 7,
        enabled: true,
        grants: [{ kind: "WALLET", token_type: "DIAMOND", amount: 1 }],
      },
      {
        day: 14,
        enabled: true,
        grants: [{ kind: "WALLET", token_type: "DIAMOND", amount: 2 }],
      },
      {
        day: 30,
        enabled: true,
        grants: [{ kind: "WALLET", token_type: "DIAMOND", amount: 5 }],
      },
    ]);
    setIsRulesEditing(true);
  };

  const updateRule = (ruleIdx: number, updates: Partial<StreakRule>) => {
    const newRules = [...editingRules];
    const currentRule = newRules[ruleIdx];
    if (!currentRule) return;
    newRules[ruleIdx] = { ...currentRule, ...updates };
    if (updates.day !== undefined) {
      newRules.sort((a, b) => a.day - b.day);
    }
    setEditingRules(newRules);
  };

  const updateGrant = (
    ruleIdx: number,
    grantIdx: number,
    updates: Partial<StreakGrant>,
  ) => {
    const newRules = [...editingRules];
    const targetRule = newRules[ruleIdx];
    if (!targetRule) return;
    const currentGrant = targetRule.grants[grantIdx];
    if (!currentGrant) return;
    targetRule.grants[grantIdx] = { ...currentGrant, ...updates };
    setEditingRules(newRules);
  };

  const addGrant = (ruleIdx: number) => {
    const newRules = [...editingRules];
    const currentRule = newRules[ruleIdx];
    if (!currentRule) return;
    newRules[ruleIdx] = {
      ...currentRule,
      grants: [
        ...currentRule.grants,
        { kind: "WALLET", token_type: "ROULETTE_TICKET", amount: 1 },
      ],
    };
    setEditingRules(newRules);
  };

  const deleteGrant = (ruleIdx: number, grantIdx: number) => {
    const newRules = [...editingRules];
    const targetRule = newRules[ruleIdx];
    if (targetRule) {
      targetRule.grants = targetRule.grants.filter((_, i) => i !== grantIdx);
    }
    setEditingRules(newRules);
  };

  const getTokenLabel = (tokenType: string) => {
    const labels: Record<string, string> = {
      ROULETTE_TICKET: "룰렛 티켓",
      DICE_TICKET: "주사위 티켓",
      LOTTERY_TICKET: "복권 티켓",
      GOLD_KEY: "골드 키",
      DIAMOND: "다이아몬드",
      VAULT: "금고 적립금",
      XP: "경험치",
    };
    return labels[tokenType] || tokenType;
  };

  return (
    <CollapsibleSection
      title="스트릭 보상 규칙 설정"
      subtitle="연속 출석 일수별 보상 조건 관리 (CRUD)"
      icon={<Settings className="w-4 h-4" />}
      iconColor="text-blue-400"
      badge={
        <Badge
          variant="outline"
          className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]"
        >
          {editingRules.length}개 규칙
        </Badge>
      }
    >
      <div className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            {isRulesEditing && (
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                onClick={handleAddRule}
              >
                <Plus className="w-4 h-4 mr-1" />
                규칙 추가
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isRulesEditing ? (
              <>
                <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                  취소
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600"
                  disabled={updateRulesMutation.isPending}
                  onClick={handleSaveRules}
                >
                  {updateRulesMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  저장
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setIsRulesEditing(true)}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                편집 모드
              </Button>
            )}
          </div>
        </div>

        {/* Rules Grid */}
        {isRulesLoading ? (
          <div className="flex items-center justify-center py-8 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            로딩 중...
          </div>
        ) : editingRules.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
            <Flame className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
            <p className="text-zinc-500 mb-4">등록된 보상 규칙이 없습니다.</p>
            <Button
              size="sm"
              className="bg-blue-500 hover:bg-blue-600"
              onClick={handleCreateDefaultRules}
            >
              <Plus className="w-4 h-4 mr-1" />
              기본 규칙 생성
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {editingRules.map((rule, ruleIdx) => (
              <div
                key={`rule-${rule.day}-${ruleIdx}`}
                className={cn(
                  "p-4 rounded-xl border transition-all",
                  rule.enabled
                    ? "bg-gradient-to-r from-black/40 to-black/20 border-white/10"
                    : "bg-zinc-900/30 border-white/5 opacity-50",
                )}
              >
                {/* Rule Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    {isRulesEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={rule.day}
                          onChange={(e) =>
                            updateRule(ruleIdx, {
                              day: parseInt(e.target.value) || 1,
                            })
                          }
                          className="w-20 h-8 bg-black/50 border-white/10 text-center font-bold"
                        />
                        <span className="text-zinc-400 text-sm">일차</span>
                      </div>
                    ) : (
                      <Badge
                        className={cn(
                          "text-base px-3 py-1",
                          rule.day <= 3
                            ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
                            : rule.day <= 7
                              ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
                              : rule.day <= 14
                                ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                        )}
                      >
                        <Flame className="w-4 h-4 mr-1" />
                        {rule.day}일차
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">활성화</span>
                      <Switch
                        checked={rule.enabled}
                        disabled={!isRulesEditing}
                        onCheckedChange={(checked) =>
                          updateRule(ruleIdx, { enabled: checked })
                        }
                      />
                    </div>
                    {isRulesEditing && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                        onClick={() =>
                          setEditingRules(
                            editingRules.filter((_, i) => i !== ruleIdx),
                          )
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Grants List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-zinc-500 uppercase">
                      보상 목록
                    </Label>
                    {isRulesEditing && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => addGrant(ruleIdx)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        보상 추가
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-2">
                    {rule.grants.map((grant, grantIdx) => (
                      <div
                        key={`grant-${ruleIdx}-${grantIdx}`}
                        className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-black/30 border border-white/5"
                      >
                        {isRulesEditing ? (
                          <>
                            <Select
                              value={grant.kind}
                              onValueChange={(value: "WALLET" | "INVENTORY") =>
                                updateGrant(ruleIdx, grantIdx, { kind: value })
                              }
                            >
                              <SelectTrigger className="w-28 h-8 bg-black/50 border-white/10 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#18181B] border-white/10 text-white">
                                <SelectItem value="WALLET">WALLET</SelectItem>
                                <SelectItem value="INVENTORY">
                                  INVENTORY
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <Select
                              value={grant.token_type}
                              onValueChange={(value) =>
                                updateGrant(ruleIdx, grantIdx, {
                                  token_type: value,
                                })
                              }
                            >
                              <SelectTrigger className="flex-1 min-w-32 h-8 bg-black/50 border-white/10 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-[#18181B] border-white/10 text-white max-h-48">
                                <SelectItem value="ROULETTE_TICKET">
                                  룰렛 티켓
                                </SelectItem>
                                <SelectItem value="DICE_TICKET">
                                  주사위 티켓
                                </SelectItem>
                                <SelectItem value="LOTTERY_TICKET">
                                  복권 티켓
                                </SelectItem>
                                <SelectItem value="GOLD_KEY">
                                  골드 키
                                </SelectItem>
                                <SelectItem value="DIAMOND">
                                  다이아몬드
                                </SelectItem>
                                <SelectItem value="VAULT">
                                  금고 적립금
                                </SelectItem>
                                <SelectItem value="XP">경험치</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              min={1}
                              value={grant.amount}
                              onChange={(e) =>
                                updateGrant(ruleIdx, grantIdx, {
                                  amount: parseInt(e.target.value) || 1,
                                })
                              }
                              className="w-20 h-8 bg-black/50 border-white/10 text-center text-xs"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                              onClick={() => deleteGrant(ruleIdx, grantIdx)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Badge
                              variant="outline"
                              className="bg-white/5 border-white/10 text-[10px]"
                            >
                              {grant.kind}
                            </Badge>
                            <span className="text-zinc-300 text-sm">
                              {getTokenLabel(grant.token_type)}
                            </span>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              x{grant.amount}
                            </Badge>
                          </>
                        )}
                      </div>
                    ))}
                    {rule.grants.length === 0 && (
                      <div className="text-center py-3 text-zinc-500 text-xs border border-dashed border-white/10 rounded-lg">
                        보상이 없습니다. 추가해주세요.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <div className="flex items-start gap-2 text-xs text-blue-400">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold mb-1">스트릭 보상 작동 방식</p>
              <ul className="text-blue-400/80 space-y-0.5">
                <li>• 유저가 해당 일차에 도달하면 보상 클레임 가능</li>
                <li>• 한 번 클레임한 마일스톤은 다시 클레임 불가</li>
                <li>• 비활성화된 규칙은 보상 지급되지 않음</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
