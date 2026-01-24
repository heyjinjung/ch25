import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Users,
  Play,
  ShieldCheck,
  AlertCircle,
  BrainCircuit,
  Loader2,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  useRunSegmentBatch,
  useAdminSegmentStats,
  useAdminSegmentRules,
  useCreateSegmentRule,
  useUpdateSegmentRule,
  useDeleteSegmentRule,
} from "../../../hooks/useV2Admin";
import { useToast } from "../../../../components/common/ToastProvider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { SegmentRuleDto } from "../../../api/adminApi";

export default function UserSegmentPage() {
  const {
    data: stats,
    isLoading: isStatsLoading,
    refetch: refetchStats,
  } = useAdminSegmentStats();
  const {
    data: rules,
    isLoading: isRulesLoading,
    refetch: refetchRules,
  } = useAdminSegmentRules();
  const runBatch = useRunSegmentBatch();
  const createRule = useCreateSegmentRule();
  const updateRule = useUpdateSegmentRule();
  const deleteRule = useDeleteSegmentRule();
  const { addToast } = useToast();

  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<SegmentRuleDto | null>(null);
  const [formData, setFormData] = useState<{
    label: string;
    rule: string;
    targetSegment: string;
    description: string;
  }>({
    label: "",
    rule: "",
    targetSegment: "",
    description: "",
  });

  const segmentOptions = useMemo(() => {
    const map = new Map<string, string>();
    stats?.segments.forEach((seg) => {
      map.set(seg.name, seg.label || seg.name);
    });
    rules?.forEach((rule) => {
      if (!map.has(rule.targetSegment)) {
        map.set(rule.targetSegment, rule.targetSegment);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [stats?.segments, rules]);

  const handleRunBatch = async () => {
    try {
      await runBatch.mutateAsync();
      addToast("AI ?¸ê·¸ë¨¼íŠ¸ ë°°ì¹˜ë¥??œì‘?ˆìŠµ?ˆë‹¤.", "success");
    } catch (e) {
      console.error("Batch failed", e);
      addToast("ë°°ì¹˜ ?¤í–‰ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.", "error");
    }
  };

  const handleSyncCheck = async () => {
    try {
      await Promise.all([refetchStats(), refetchRules()]);
      addToast("?„ì—­ ?™ê¸°???íƒœë¥??•ì¸?ˆìŠµ?ˆë‹¤.", "success");
    } catch (e) {
      console.error("Sync check failed", e);
      addToast("?™ê¸°???•ì¸ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.", "error");
    }
  };

  const handleOpenCreateDialog = () => {
    setEditingRule(null);
    const defaultSegment = segmentOptions[0]?.value ?? "";
    setFormData({
      label: "",
      rule: "",
      targetSegment: defaultSegment,
      description: "",
    });
    setIsRuleDialogOpen(true);
  };

  const handleOpenEditDialog = (rule: SegmentRuleDto) => {
    setEditingRule(rule);
    setFormData({
      label: rule.label,
      rule: rule.rule,
      targetSegment: rule.targetSegment || segmentOptions[0]?.value || "",
      description: rule.description || "",
    });
    setIsRuleDialogOpen(true);
  };

  const handleSubmitRule = async () => {
    try {
      if (editingRule) {
        await updateRule.mutateAsync({ id: editingRule.id, data: formData });
        addToast("ê·œì¹™???˜ì •?˜ì—ˆ?µë‹ˆ??", "success");
      } else {
        await createRule.mutateAsync(formData);
        addToast("??ê·œì¹™???ì„±?˜ì—ˆ?µë‹ˆ??", "success");
      }
      setIsRuleDialogOpen(false);
      setIsRuleDialogOpen(false);
    } catch {
      addToast("ê·œì¹™ ?€?¥ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.", "error");
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm("?•ë§ ??ê·œì¹™???? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?")) return;
    try {
      await deleteRule.mutateAsync(id);
      addToast("ê·œì¹™???? œ?˜ì—ˆ?µë‹ˆ??", "success");
    } catch {
      addToast("ê·œì¹™ ?? œ???¤íŒ¨?ˆìŠµ?ˆë‹¤.", "error");
    }
  };

  const handleToggleStatus = async (rule: SegmentRuleDto) => {
    const newStatus = rule.status === "Active" ? "Inactive" : "Active";
    try {
      await updateRule.mutateAsync({
        id: rule.id,
        data: { status: newStatus },
      });
      addToast(`ê·œì¹™ ?íƒœê°€ ${newStatus}ë¡?ë³€ê²½ë˜?ˆìŠµ?ˆë‹¤.`, "success");
    } catch {
      addToast("?íƒœ ë³€ê²½ì— ?¤íŒ¨?ˆìŠµ?ˆë‹¤.", "error");
    }
  };

  const isLoading = isStatsLoading || isRulesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#121214] text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        ë¶„ì„ ?”ì§„ ?°ì´?°ë? ë¶ˆëŸ¬?¤ëŠ” ì¤?..
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-[#121214] min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <BrainCircuit className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">
              AI ?¸ê·¸ë¨¼íŠ¸ ?”ì§„
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            ? ì? ?¸ê·¸ë¨¼íŠ¸ (User Segments)
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            ?¬ìš©???‰ë™ ?°ì´?°ë? ë¶„ì„?˜ì—¬ ë§ˆì???ë°??´ì˜ ?€ê²?ê·¸ë£¹??ë¶„ë¥˜?©ë‹ˆ??
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <Button
            variant="secondary"
            className="bg-zinc-900 border border-white/10 text-zinc-300 h-9 px-4 text-xs hover:bg-zinc-800"
            onClick={handleSyncCheck}
          >
            ?„ì—­ ?™ê¸°???ê?
          </Button>
          <Button
            className="bg-[#D2FD9C] hover:bg-[#D2FD9C]/90 text-black font-bold h-10 px-6"
            onClick={handleRunBatch}
            disabled={runBatch.isPending}
          >
            <Play className="w-4 h-4 mr-2" />
            {runBatch.isPending ? "ë°°ì¹˜ ì¤?.." : "ë°°ì¹˜ ì¦‰ì‹œ ?¤í–‰"}
          </Button>
          {stats?.lastBatchTime && (
            <span className="text-[10px] text-zinc-500 font-mono uppercase">
              ë§ˆì?ë§?ë¶„ì„: {stats.lastBatchTime}
            </span>
          )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats?.segments.map((seg) => (
          <Card
            key={seg.name}
            className={`bg-[#18181B] border-white/5 ${seg.border} hover:bg-zinc-800/50 transition-all cursor-default`}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle
                  className={`text-xs font-bold uppercase tracking-widest ${seg.color}`}
                >
                  {seg.name}
                </CardTitle>
                <Users className="w-4 h-4 text-zinc-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {seg.count.toLocaleString()}
              </div>
              <p className="text-[10px] text-zinc-400 leading-tight min-h-[2.5em]">
                {seg.desc}
              </p>
              <div className="mt-4 pt-3 border-t border-white/5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[10px] w-full text-zinc-400 hover:text-white hover:bg-white/5"
                >
                  ?¸ê·¸ë¨¼íŠ¸ ? ì? ?ì„¸ ë³´ê¸°
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Segment Rules */}
        <Card className="bg-[#18181B] border-white/8 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/5 mb-4">
            <div>
              <CardTitle className="text-base font-bold">
                ë¶„ë¥˜ ê·œì¹™ (ê·œì¹™ ?”ì§„)
              </CardTitle>
              <CardDescription className="text-zinc-500 text-xs mt-1">
                ?ë™ ë¶„ë¥˜ ?œìŠ¤?œì˜ ?µì‹¬ ë¡œì§?…ë‹ˆ??
              </CardDescription>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 bg-zinc-800 text-white border-white/5 text-xs hover:bg-zinc-700"
              onClick={handleOpenCreateDialog}
            >
              <Plus className="w-3 h-3 mr-2" /> ê·œì¹™ ì¶”ê?
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {rules?.map((rule) => (
                <div
                  key={rule.id}
                  className="group flex justify-between items-start p-3 rounded-lg bg-zinc-900/50 border border-white/5 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-zinc-200">
                        {rule.label}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1 text-zinc-500 border-zinc-700"
                      >
                        {rule.targetSegment}
                      </Badge>
                    </div>
                    <div className="text-xs text-indigo-400 font-mono bg-indigo-950/30 px-2 py-1 rounded w-fit mb-1">
                      {rule.rule}
                    </div>
                    {rule.description && (
                      <p className="text-[10px] text-zinc-500">
                        {rule.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`border-none h-5 text-[10px] cursor-pointer ${rule.status === "Active" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : "bg-zinc-500/10 text-zinc-500 hover:bg-zinc-500/20"}`}
                      onClick={() => handleToggleStatus(rule)}
                    >
                      {rule.status === "Active" ? "Active" : "Inactive"}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-zinc-500 hover:text-white"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="bg-[#18181B] border-white/10 text-zinc-200"
                      >
                        <DropdownMenuItem
                          onClick={() => handleOpenEditDialog(rule)}
                          className="text-xs cursor-pointer focus:bg-zinc-800 focus:text-white"
                        >
                          <Pencil className="w-3 h-3 mr-2" /> ?˜ì •
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(rule)}
                          className="text-xs cursor-pointer focus:bg-zinc-800 focus:text-white"
                        >
                          {rule.status === "Active" ? (
                            <ToggleLeft className="w-3 h-3 mr-2" />
                          ) : (
                            <ToggleRight className="w-3 h-3 mr-2" />
                          )}
                          {rule.status === "Active" ? "ë¹„í™œ?±í™”" : "?œì„±??}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-xs text-red-400 cursor-pointer focus:bg-red-950/30 focus:text-red-400"
                        >
                          <Trash2 className="w-3 h-3 mr-2" /> ?? œ
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
              {(!rules || rules.length === 0) && (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  ?±ë¡??ê·œì¹™???†ìŠµ?ˆë‹¤.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Targeted Actions */}
        <Card className="bg-[#18181B] border-white/8">
          <CardHeader className="pb-4 border-b border-white/5 mb-4">
            <CardTitle className="text-base font-bold">
              ?¤í† ë©”ì´??& ë§ˆì???
            </CardTitle>
            <CardDescription className="text-zinc-500 text-xs mt-1">
              ?¸ê·¸ë¨¼íŠ¸ ê°ì? ???ë™ ?¤í–‰?˜ëŠ” ?¸ë¦¬ê±°ì…?ˆë‹¤.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-indigo-400 mb-1">
                  ?´ë©´ ? ì? ë³µê? ?ë™ ì¿ í°
                </h4>
                <p className="text-xs text-zinc-400">
                  DORMANT ?íƒœ ì§„ì… ì¦‰ì‹œ ?”ë ˆê·¸ë¨ ë©”ì„¸ì§€ ë°?ë³µê? ?œíƒ ë°œì†¡.
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-400 mb-1">
                  ê³ ìœ„?˜êµ° VIP ?„ë‹´ ?¤ì  ë°°ì •
                </h4>
                <p className="text-xs text-zinc-400">
                  HIGH_RISK VIP ê°ì? ???´ì˜?€ ?„ìš© ê´€?œì‹¤???¤ì‹œê°??Œë¦¼ ?„ì†¡.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="bg-[#18181B] border-white/10 text-white sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {editingRule ? "ê·œì¹™ ?˜ì •" : "??ê·œì¹™ ì¶”ê?"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              ? ì?ë¥??ë™?¼ë¡œ ë¶„ë¥˜??ì¡°ê±´???•ì˜?©ë‹ˆ??
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-400">
                ê·œì¹™ ?´ë¦„ (Label)
              </Label>
              <Input
                placeholder="?? 7?¼ê°„ ë¯¸ì ‘??? ì?"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                className="bg-zinc-900 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-400">
                ?€ê²??¸ê·¸ë¨¼íŠ¸
              </Label>
              <Select
                value={formData.targetSegment}
                onValueChange={(val) =>
                  setFormData({ ...formData, targetSegment: val })
                }
              >
                <SelectTrigger className="bg-zinc-900 border-white/10">
                  <SelectValue placeholder="?¸ê·¸ë¨¼íŠ¸ ? íƒ" />
                </SelectTrigger>
                <SelectContent className="bg-[#18181B] border-white/10 text-white">
                  {segmentOptions.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      ?¸ê·¸ë¨¼íŠ¸ ?†ìŒ
                    </SelectItem>
                  ) : (
                    segmentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-400">
                ì¡°ê±´??(Rule Condition)
              </Label>
              <div className="relative">
                <Input
                  placeholder="?? last_login_days > 7"
                  value={formData.rule}
                  onChange={(e) =>
                    setFormData({ ...formData, rule: e.target.value })
                  }
                  className="bg-zinc-900 border-white/10 font-mono text-xs text-indigo-300 pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                  SQL ? ì‚¬
                </div>
              </div>
              <p className="text-[10px] text-zinc-500">
                ?¬ìš© ê°€?¥í•œ ë³€?˜ëŠ” ë°±ì—”??ê·œì¹™ ?”ì§„ ê¸°ì??¼ë¡œ ?ë™ ?™ê¸°?”ë©?ˆë‹¤.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-400">
                ?¤ëª… (Description)
              </Label>
              <Textarea
                placeholder="ê·œì¹™???€???ì„¸ ?¤ëª…???…ë ¥?˜ì„¸??"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="bg-zinc-900 border-white/10 min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsRuleDialogOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              ì·¨ì†Œ
            </Button>
            <Button
              onClick={handleSubmitRule}
              className="bg-[#D2FD9C] text-black font-bold hover:bg-[#D2FD9C]/90"
              disabled={createRule.isPending || updateRule.isPending}
            >
              {createRule.isPending || updateRule.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "?€??
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
