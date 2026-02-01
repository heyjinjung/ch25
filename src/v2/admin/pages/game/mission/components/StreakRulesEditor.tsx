/**
 * StreakRulesEditor - 스트릭 보상 규칙 편집 컴포넌트
 * @module mission/components/StreakRulesEditor
 */

import {
  Edit2,
  Save,
  Plus,
  Trash2,
  Flame,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Badge } from "../../../../../components/ui/badge";
import { Switch } from "../../../../../components/ui/switch";
import { Button } from "../../../../../components/ui/button";
import { Input } from "../../../../../components/ui/input";
import { Label } from "../../../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../../components/ui/select";
import { cn } from "../../../../../lib/utils";
import { TOKEN_TYPE_LABELS } from "../constants/missionConstants";
import type { StreakRule, StreakGrant } from "../utils/missionHelpers";

interface StreakRulesEditorProps {
  rules: StreakRule[];
  isEditing: boolean;
  isLoading: boolean;
  isSaving: boolean;
  onRulesChange: (rules: StreakRule[]) => void;
  onEditModeChange: (editing: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
}

const DEFAULT_RULES: StreakRule[] = [
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
];

export function StreakRulesEditor({
  rules,
  isEditing,
  isLoading,
  isSaving,
  onRulesChange,
  onEditModeChange,
  onSave,
  onCancel,
}: StreakRulesEditorProps) {
  const handleAddRule = () => {
    const existingDays = rules.map((r) => r.day);
    let newDay = 1;
    while (existingDays.includes(newDay)) newDay++;
    const newRule: StreakRule = {
      day: newDay,
      enabled: true,
      grants: [{ kind: "WALLET", token_type: "ROULETTE_TICKET", amount: 1 }],
    };
    onRulesChange([...rules, newRule].sort((a, b) => a.day - b.day));
  };

  const handleUpdateRule = (index: number, updates: Partial<StreakRule>) => {
    const newRules = [...rules];
    const rule = newRules[index];
    if (rule) {
      newRules[index] = { ...rule, ...updates } as StreakRule;
      if (updates.day !== undefined) {
        newRules.sort((a, b) => a.day - b.day);
      }
    }
    onRulesChange(newRules);
  };

  const handleDeleteRule = (index: number) => {
    onRulesChange(rules.filter((_, i) => i !== index));
  };

  const handleAddGrant = (ruleIndex: number) => {
    const newRules = [...rules];
    const rule = newRules[ruleIndex];
    if (rule) {
      rule.grants = [
        ...rule.grants,
        { kind: "WALLET" as const, token_type: "ROULETTE_TICKET", amount: 1 },
      ];
    }
    onRulesChange(newRules);
  };

  const handleUpdateGrant = (
    ruleIndex: number,
    grantIndex: number,
    updates: Partial<StreakGrant>,
  ) => {
    const newRules = [...rules];
    const rule = newRules[ruleIndex];
    const grant = rule?.grants[grantIndex];
    if (rule && grant) {
      rule.grants[grantIndex] = { ...grant, ...updates } as StreakGrant;
    }
    onRulesChange(newRules);
  };

  const handleDeleteGrant = (ruleIndex: number, grantIndex: number) => {
    const newRules = [...rules];
    const rule = newRules[ruleIndex];
    if (rule) {
      rule.grants = rule.grants.filter((_, i) => i !== grantIndex);
    }
    onRulesChange(newRules);
  };

  const handleCreateDefault = () => {
    onRulesChange(DEFAULT_RULES);
    onEditModeChange(true);
  };

  const getTokenLabel = (tokenType: string): string => {
    return TOKEN_TYPE_LABELS[tokenType] || tokenType;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        로딩 중...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          {isEditing && (
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
          {isEditing ? (
            <>
              <Button size="sm" variant="ghost" onClick={onCancel}>
                취소
              </Button>
              <Button
                size="sm"
                className="bg-blue-500 hover:bg-blue-600"
                disabled={isSaving}
                onClick={onSave}
              >
                {isSaving ? (
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
              onClick={() => onEditModeChange(true)}
            >
              <Edit2 className="w-4 h-4 mr-1" />
              편집 모드
            </Button>
          )}
        </div>
      </div>

      {/* Rules Grid */}
      {rules.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
          <Flame className="w-8 h-8 mx-auto mb-3 text-zinc-600" />
          <p className="text-zinc-500 mb-4">등록된 보상 규칙이 없습니다.</p>
          <Button
            size="sm"
            className="bg-blue-500 hover:bg-blue-600"
            onClick={handleCreateDefault}
          >
            <Plus className="w-4 h-4 mr-1" />
            기본 규칙 생성
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, ruleIdx) => (
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
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={rule.day}
                        onChange={(e) =>
                          handleUpdateRule(ruleIdx, {
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
                      disabled={!isEditing}
                      onCheckedChange={(checked) =>
                        handleUpdateRule(ruleIdx, { enabled: checked })
                      }
                    />
                  </div>
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                      onClick={() => handleDeleteRule(ruleIdx)}
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
                  {isEditing && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => handleAddGrant(ruleIdx)}
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
                      {isEditing ? (
                        <>
                          <Select
                            value={grant.kind}
                            onValueChange={(value: "WALLET" | "INVENTORY") =>
                              handleUpdateGrant(ruleIdx, grantIdx, {
                                kind: value,
                              })
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
                              handleUpdateGrant(ruleIdx, grantIdx, {
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
                              <SelectItem value="GOLD_KEY">골드 키</SelectItem>
                              <SelectItem value="DIAMOND">
                                다이아몬드
                              </SelectItem>
                              <SelectItem value="VAULT">금고 적립금</SelectItem>
                              <SelectItem value="XP">경험치</SelectItem>
                            </SelectContent>
                          </Select>

                          <Input
                            type="number"
                            min={1}
                            value={grant.amount}
                            onChange={(e) =>
                              handleUpdateGrant(ruleIdx, grantIdx, {
                                amount: parseInt(e.target.value) || 1,
                              })
                            }
                            className="w-20 h-8 bg-black/50 border-white/10 text-center text-xs"
                          />

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10"
                            onClick={() => handleDeleteGrant(ruleIdx, grantIdx)}
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
  );
}

export default StreakRulesEditor;
