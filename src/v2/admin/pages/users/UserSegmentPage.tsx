import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAdminSegmentRules,
  createSegmentRule,
  deleteSegmentRule,
  getAdminSegmentStats,
  runV2SegmentBatch,
  type CreateSegmentRuleRequest,
} from "../../../api/adminApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Plus, Trash2, RefreshCw, Play, Users } from "lucide-react";
import { format } from "date-fns";

export default function UserSegmentPage() {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState<CreateSegmentRuleRequest>({
    label: "",
    rule: "",
    targetSegment: "COMMON",
    description: "",
  });

  // Queries
  const { data: rules = [], isLoading: isLoadingRules } = useQuery({
    queryKey: ["admin", "segments", "rules"],
    queryFn: getAdminSegmentRules,
  });

  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ["admin", "segments", "stats"],
    queryFn: getAdminSegmentStats,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createSegmentRule,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "segments", "rules"],
      });
      setIsDialogOpen(false);
      setNewRule({
        label: "",
        rule: "",
        targetSegment: "COMMON",
        description: "",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSegmentRule,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "segments", "rules"],
      });
    },
  });

  const runBatchMutation = useMutation({
    mutationFn: runV2SegmentBatch,
    onSuccess: () => {
      alert("배치 작업이 시작되었습니다.");
      queryClient.invalidateQueries({
        queryKey: ["admin", "segments", "stats"],
      });
    },
  });

  const handleDelete = async (id: number) => {
    if (confirm("정말 이 규칙을 삭제하시겠습니까?")) {
      await deleteMutation.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-8 p-6 pb-20 max-w-[1600px] mx-auto text-white">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            유저 세그먼트 (Segmentation)
          </h1>
          <p className="text-zinc-400">
            유저 등급 및 행동 패턴에 따른 분류 규칙을 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-white/10 hover:bg-white/5"
            onClick={() => {
              queryClient.invalidateQueries({
                queryKey: ["admin", "segments"],
              });
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
          <Button
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={runBatchMutation.isPending}
            onClick={() => runBatchMutation.mutate()}
          >
            <Play className="w-4 h-4 mr-2" />
            세그먼트 배치 실행
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingStats ? (
          <div className="col-span-full flex items-center justify-center py-8">
            <div className="text-white/50">Loading stats...</div>
          </div>
        ) : stats?.segments && stats.segments.length > 0 ? (
          stats.segments.map((seg) => (
            <Card key={seg.name} className="bg-zinc-900 border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Badge
                    variant="outline"
                    className="bg-black/20"
                    style={{
                      borderColor: seg.color || "#555",
                      color: seg.color || "#ccc",
                    }}
                  >
                    {seg.label}
                  </Badge>
                  <Users className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {seg.count.toLocaleString()}
                </div>
                <p className="text-xs text-zinc-500">{seg.desc}</p>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full flex items-center justify-center py-8">
            <div className="text-white/50">No stats available</div>
          </div>
        )}
      </div>

      {/* Rules Table */}
      <Card className="bg-zinc-900 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">세그먼트 규칙 목록</CardTitle>
            <CardDescription>
              각 세그먼트에 유저를 할당하는 SQL 기반 규칙입니다.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />
                규칙 추가
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-white/10 text-white">
              <DialogHeader>
                <DialogTitle>새 규칙 추가</DialogTitle>
                <DialogDescription>
                  새로운 세그먼트 분류 규칙을 생성합니다. (SQL WHERE 절 형태)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>규칙 이름 (Label)</Label>
                  <Input
                    value={newRule.label}
                    onChange={(e) =>
                      setNewRule({ ...newRule, label: e.target.value })
                    }
                    placeholder="예: 고액 입금자"
                    className="bg-black/20 border-white/10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>SQL 조건 (WHERE Clause)</Label>
                  <Input
                    value={newRule.rule}
                    onChange={(e) =>
                      setNewRule({ ...newRule, rule: e.target.value })
                    }
                    placeholder="예: total_deposit >= 1000000"
                    className="bg-black/20 border-white/10 font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>대상 세그먼트</Label>
                  <Select
                    value={newRule.targetSegment}
                    onValueChange={(v) =>
                      setNewRule({ ...newRule, targetSegment: v })
                    }
                  >
                    <SelectTrigger className="bg-black/20 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="NEW">신규(7일)</SelectItem>
                      <SelectItem value="COMMON">일반</SelectItem>
                      <SelectItem value="VIP">VIP</SelectItem>
                      <SelectItem value="WHALE">고액(Whale)</SelectItem>
                      <SelectItem value="AT_RISK">이탈 위험</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>설명 (Optional)</Label>
                  <Input
                    value={newRule.description || ""}
                    onChange={(e) =>
                      setNewRule({ ...newRule, description: e.target.value })
                    }
                    className="bg-black/20 border-white/10"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>
                  취소
                </Button>
                <Button
                  onClick={() => createMutation.mutate(newRule)}
                  disabled={
                    createMutation.isPending || !newRule.label || !newRule.rule
                  }
                >
                  {createMutation.isPending ? "저장 중..." : "저장"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-zinc-400 w-[50px]">ID</TableHead>
                <TableHead className="text-zinc-400 w-[200px]">이름</TableHead>
                <TableHead className="text-zinc-400">규칙 (SQL)</TableHead>
                <TableHead className="text-zinc-400 w-[150px]">
                  대상 세그먼트
                </TableHead>
                <TableHead className="text-zinc-400 w-[100px]">상태</TableHead>
                <TableHead className="text-zinc-400 w-[80px] text-right">
                  삭제
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingRules ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-zinc-500"
                  >
                    로딩중...
                  </TableCell>
                </TableRow>
              ) : rules.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-zinc-500"
                  >
                    등록된 규칙이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule) => (
                  <TableRow
                    key={rule.id}
                    className="border-white/5 hover:bg-white/5"
                  >
                    <TableCell className="text-zinc-500">{rule.id}</TableCell>
                    <TableCell className="font-medium text-white">
                      {rule.label}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-indigo-300 bg-indigo-950/30 px-2 py-1 rounded">
                      {rule.rule}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-zinc-300 border-zinc-700"
                      >
                        {rule.targetSegment}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          rule.status === "Active"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-zinc-500/20 text-zinc-400"
                        }
                      >
                        {rule.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400"
                        onClick={() => handleDelete(rule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="text-right text-xs text-zinc-500">
        마지막 배치 실행:{" "}
        {stats?.lastBatchTime
          ? format(new Date(stats.lastBatchTime), "yyyy-MM-dd HH:mm:ss")
          : "-"}
      </div>
    </div>
  );
}
