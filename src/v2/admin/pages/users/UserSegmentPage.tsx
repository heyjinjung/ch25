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
      addToast("AI 세그먼트 배치를 시작했습니다.", "success");
    } catch (e) {
      console.error("Batch failed", e);
      addToast("배치 실행 중 오류가 발생했습니다.", "error");
    }
  };

  const handleSyncCheck = async () => {
    try {
      await Promise.all([refetchStats(), refetchRules()]);
      addToast("전역 동기화 상태를 확인했습니다.", "success");
    } catch (e) {
      console.error("Sync check failed", e);
      addToast("동기화 확인 중 오류가 발생했습니다.", "error");
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
        addToast("규칙이 수정되었습니다.", "success");
      } else {
        await createRule.mutateAsync(formData);
        addToast("새 규칙이 생성되었습니다.", "success");
      }
      setIsRuleDialogOpen(false);
      setIsRuleDialogOpen(false);
    } catch {
      addToast("규칙 저장에 실패했습니다.", "error");
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm("정말 이 규칙을 삭제하시겠습니까?")) return;
    try {
      await deleteRule.mutateAsync(id);
      addToast("규칙이 삭제되었습니다.", "success");
    } catch {
      addToast("규칙 삭제에 실패했습니다.", "error");
    }
  };

  const handleToggleStatus = async (rule: SegmentRuleDto) => {
    const newStatus = rule.status === "Active" ? "Inactive" : "Active";
    try {
      await updateRule.mutateAsync({
        id: rule.id,
        data: { status: newStatus },
      });
      addToast(`규칙 상태가 ${newStatus}로 변경되었습니다.`, "success");
    } catch {
      addToast("상태 변경에 실패했습니다.", "error");
    }
  };

  const isLoading = isStatsLoading || isRulesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#121214] text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        분석 엔진 데이터를 불러오는 중...
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
              AI 세그먼트 엔진
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            유저 세그먼트 (User Segments)
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            사용자 행동 데이터를 분석하여 마케팅 및 운영 타겟 그룹을 분류합니다.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <Button
            variant="secondary"
            className="bg-zinc-900 border border-white/10 text-zinc-300 h-9 px-4 text-xs hover:bg-zinc-800"
            onClick={handleSyncCheck}
          >
            전역 동기화 점검
          </Button>
          <Button
            className="bg-[#D2FD9C] hover:bg-[#D2FD9C]/90 text-black font-bold h-10 px-6"
            onClick={handleRunBatch}
            disabled={runBatch.isPending}
          >
            <Play className="w-4 h-4 mr-2" />
            {runBatch.isPending ? "배치 중..." : "배치 즉시 실행"}
          </Button>
          {stats?.lastBatchTime && (
            <span className="text-[10px] text-zinc-500 font-mono uppercase">
              마지막 분석: {stats.lastBatchTime}
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
                  세그먼트 유저 상세 보기
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
                분류 규칙 (규칙 엔진)
              </CardTitle>
              <CardDescription className="text-zinc-500 text-xs mt-1">
                자동 분류 시스템의 핵심 로직입니다.
              </CardDescription>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="h-8 bg-zinc-800 text-white border-white/5 text-xs hover:bg-zinc-700"
              onClick={handleOpenCreateDialog}
            >
              <Plus className="w-3 h-3 mr-2" /> 규칙 추가
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
                          <Pencil className="w-3 h-3 mr-2" /> 수정
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
                          {rule.status === "Active" ? "비활성화" : "활성화"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-xs text-red-400 cursor-pointer focus:bg-red-950/30 focus:text-red-400"
                        >
                          <Trash2 className="w-3 h-3 mr-2" /> 삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
              {(!rules || rules.length === 0) && (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  등록된 규칙이 없습니다.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Targeted Actions */}
        <Card className="bg-[#18181B] border-white/8">
          <CardHeader className="pb-4 border-b border-white/5 mb-4">
            <CardTitle className="text-base font-bold">
              오토메이션 & 마케팅
            </CardTitle>
            <CardDescription className="text-zinc-500 text-xs mt-1">
              세그먼트 감지 시 자동 실행되는 트리거입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-indigo-400 mb-1">
                  휴면 유저 복귀 자동 쿠폰
                </h4>
                <p className="text-xs text-zinc-400">
                  DORMANT 상태 진입 즉시 텔레그램 메세지 및 복귀 혜택 발송.
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 flex items-start gap-3">
              <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-400 mb-1">
                  고위험군 VIP 전담 실적 배정
                </h4>
                <p className="text-xs text-zinc-400">
                  HIGH_RISK VIP 감지 시 운영팀 전용 관제실에 실시간 알림 전송.
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
              {editingRule ? "규칙 수정" : "새 규칙 추가"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs">
              유저를 자동으로 분류할 조건을 정의합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-400">
                규칙 이름 (Label)
              </Label>
              <Input
                placeholder="예: 7일간 미접속 유저"
                value={formData.label}
                onChange={(e) =>
                  setFormData({ ...formData, label: e.target.value })
                }
                className="bg-zinc-900 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-400">
                타겟 세그먼트
              </Label>
              <Select
                value={formData.targetSegment}
                onValueChange={(val) =>
                  setFormData({ ...formData, targetSegment: val })
                }
              >
                <SelectTrigger className="bg-zinc-900 border-white/10">
                  <SelectValue placeholder="세그먼트 선택" />
                </SelectTrigger>
                <SelectContent className="bg-[#18181B] border-white/10 text-white">
                  {segmentOptions.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      세그먼트 없음
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
                조건식 (Rule Condition)
              </Label>
              <div className="relative">
                <Input
                  placeholder="예: last_login_days > 7"
                  value={formData.rule}
                  onChange={(e) =>
                    setFormData({ ...formData, rule: e.target.value })
                  }
                  className="bg-zinc-900 border-white/10 font-mono text-xs text-indigo-300 pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">
                  SQL 유사
                </div>
              </div>
              <p className="text-[10px] text-zinc-500">
                사용 가능한 변수는 백엔드 규칙 엔진 기준으로 자동 동기화됩니다.
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-zinc-400">
                설명 (Description)
              </Label>
              <Textarea
                placeholder="규칙에 대한 상세 설명을 입력하세요."
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
              취소
            </Button>
            <Button
              onClick={handleSubmitRule}
              className="bg-[#D2FD9C] text-black font-bold hover:bg-[#D2FD9C]/90"
              disabled={createRule.isPending || updateRule.isPending}
            >
              {createRule.isPending || updateRule.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "저장"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
