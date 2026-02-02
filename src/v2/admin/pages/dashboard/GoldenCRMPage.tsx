import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Users,
} from "lucide-react";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Checkbox } from "../../../../components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { v2Client } from "../../../api/client";
import { toast } from "sonner";

// ==================== Types ====================

interface PendingIntervention {
  id: number;
  user_id: number;
  nickname: string;
  trigger_id: string;
  trigger_condition: string | null;
  action_taken: string;
  user_balance_before: number | null;
  recent_results: string | null;
  created_at: string | null;
}

interface PendingInterventionResponse {
  total: number;
  pending: PendingIntervention[];
}

// ==================== API Functions ====================

const fetchPendingInterventions =
  async (): Promise<PendingInterventionResponse> => {
    const response = await v2Client.get<PendingInterventionResponse>(
      "/api/v2/admin/ops/interventions/pending?limit=100",
    );
    return response.data;
  };

const approveIntervention = async (
  interventionId: number,
  action: "APPROVE" | "REJECT",
) => {
  const response = await v2Client.post(
    `/api/v2/admin/ops/interventions/${interventionId}/approve`,
    { action },
  );
  return response.data;
};

const batchApproveInterventions = async (
  ids: number[],
  action: "APPROVE" | "REJECT",
) => {
  const response = await v2Client.post(
    `/api/v2/admin/ops/interventions/batch?action=${action}`,
    ids,
  );
  return response.data;
};

// ==================== Helper Functions ====================

const getTriggerLabel = (triggerId: string): string => {
  const labels: Record<string, string> = {
    TRG_LOSE_5: "5연패 감지",
    TRG_LOSE_7: "7연패 감지",
    TRG_ZERO_BAL: "잔액 0 감지",
    TRG_BAL_DROP_50: "잔액 50% 급감",
    TRG_BAL_DROP_70: "잔액 70% 급감",
    TRG_INACTIVE_7D: "7일 미접속",
    TRG_GOLDEN_HOUR: "골든아워 자동",
  };
  return labels[triggerId] || triggerId;
};

const getActionLabel = (action: string): string => {
  const labels: Record<string, string> = {
    Trigger_Pity_Win: "동정 승리 트리거",
    Offer_Zero_Ticket: "무료 티켓 지급",
    Send_Comeback_Reward: "복귀 보상 발송",
    Grant_Bonus_Spin: "보너스 스핀 지급",
    Send_VIP_Reward: "VIP 보상 발송",
  };
  return labels[action] || action;
};

// ==================== Component ====================

export default function GoldenCRMPage() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    action: "APPROVE" | "REJECT";
    ids: number[];
  }>({ open: false, action: "APPROVE", ids: [] });

  // Query
  const {
    data: pendingData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["pending-interventions"],
    queryFn: fetchPendingInterventions,
    refetchInterval: 30000, // 30초마다 갱신
  });

  // Mutations
  const approveMutation = useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: number;
      action: "APPROVE" | "REJECT";
    }) => approveIntervention(id, action),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["pending-interventions"] });
      toast.success(action === "APPROVE" ? "개입 승인됨" : "개입 거절됨");
    },
    onError: () => {
      toast.error("처리 실패");
    },
  });

  const batchMutation = useMutation({
    mutationFn: ({
      ids,
      action,
    }: {
      ids: number[];
      action: "APPROVE" | "REJECT";
    }) => batchApproveInterventions(ids, action),
    onSuccess: (data, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["pending-interventions"] });
      setSelectedIds(new Set());
      toast.success(
        `${data.processed_count}건 ${action === "APPROVE" ? "승인" : "거절"} 완료`,
      );
    },
    onError: () => {
      toast.error("일괄 처리 실패");
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked && pendingData?.pending) {
      setSelectedIds(new Set(pendingData.pending.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleBatchAction = (action: "APPROVE" | "REJECT") => {
    if (selectedIds.size === 0) {
      toast.warning("선택된 항목이 없습니다");
      return;
    }
    setConfirmDialog({ open: true, action, ids: Array.from(selectedIds) });
  };

  const confirmBatchAction = () => {
    batchMutation.mutate({
      ids: confirmDialog.ids,
      action: confirmDialog.action,
    });
    setConfirmDialog({ open: false, action: "APPROVE", ids: [] });
  };

  const pending = pendingData?.pending || [];
  const total = pendingData?.total || 0;
  const allSelected = pending.length > 0 && selectedIds.size === pending.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            Golden CRM - 개입 승인 관리
          </h1>
          <p className="text-obsidian-muted text-sm mt-1">
            자동 감지된 개입을 검토하고 승인/거절합니다
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          새로고침
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-obsidian-surface border-obsidian-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              대기 중
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{total}</p>
          </CardContent>
        </Card>
        <Card className="bg-obsidian-surface border-obsidian-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              선택됨
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{selectedIds.size}</p>
          </CardContent>
        </Card>
        <Card className="bg-obsidian-surface border-obsidian-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-400">일괄 처리</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => handleBatchAction("APPROVE")}
              disabled={selectedIds.size === 0}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              일괄 승인
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleBatchAction("REJECT")}
              disabled={selectedIds.size === 0}
            >
              <XCircle className="w-4 h-4 mr-1" />
              일괄 거절
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-obsidian-surface border-obsidian-border">
        <CardHeader>
          <CardTitle className="text-white">대기 중인 개입 목록</CardTitle>
          <CardDescription>
            자동으로 감지된 개입 요청을 검토하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-obsidian-muted">
              로딩 중...
            </div>
          ) : pending.length === 0 ? (
            <div className="text-center py-8 text-obsidian-muted">
              대기 중인 개입이 없습니다
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>유저</TableHead>
                  <TableHead>트리거</TableHead>
                  <TableHead>액션</TableHead>
                  <TableHead>잔액</TableHead>
                  <TableHead>최근 결과</TableHead>
                  <TableHead>감지 시각</TableHead>
                  <TableHead className="text-right">처리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={(checked) =>
                          handleSelectOne(item.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-white">
                          {item.nickname}
                        </span>
                        <span className="text-xs text-obsidian-muted">
                          ID: {item.user_id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-amber-500/50 text-amber-400"
                      >
                        {getTriggerLabel(item.trigger_id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-zinc-300">
                      {getActionLabel(item.action_taken)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.user_balance_before != null
                        ? `₩${item.user_balance_before.toLocaleString()}`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {item.recent_results ? (
                        <div className="flex gap-1">
                          {item.recent_results.split(",").map((r, i) => (
                            <span
                              key={i}
                              className={`text-xs px-1 rounded ${
                                r === "WIN"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : r === "LOSE"
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-zinc-500/20 text-zinc-400"
                              }`}
                            >
                              {r === "WIN" ? "W" : r === "LOSE" ? "L" : "D"}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-obsidian-muted">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString("ko-KR")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          onClick={() =>
                            approveMutation.mutate({
                              id: item.id,
                              action: "APPROVE",
                            })
                          }
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() =>
                            approveMutation.mutate({
                              id: item.id,
                              action: "REJECT",
                            })
                          }
                          disabled={approveMutation.isPending}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <Dialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
      >
        <DialogContent className="bg-obsidian-surface border-obsidian-border">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              일괄 처리 확인
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.ids.length}건의 개입을{" "}
              {confirmDialog.action === "APPROVE" ? "승인" : "거절"}
              하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setConfirmDialog({ open: false, action: "APPROVE", ids: [] })
              }
            >
              취소
            </Button>
            <Button
              className={
                confirmDialog.action === "APPROVE"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }
              onClick={confirmBatchAction}
            >
              {confirmDialog.action === "APPROVE" ? "승인" : "거절"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
