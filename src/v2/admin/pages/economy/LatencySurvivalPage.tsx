import React, { useState } from "react";
import { 
  useAdminLatencyEvidences, 
  useAdminVerifyLatencyEvidence, 
  useAdminRejectLatencyEvidence 
} from "../../../hooks/useAdminEconomy";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Check, X, Search, Info } from "lucide-react";
import { toast } from "sonner";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import type { AdminLatencyEvidenceDto } from "../../../api/adminApi";

const LatencySurvivalPage: React.FC = () => {
  const { data: evidences, isLoading } = useAdminLatencyEvidences();
  const verifyMutation = useAdminVerifyLatencyEvidence();
  const rejectMutation = useAdminRejectLatencyEvidence();
  
  const [selectedEvidence, setSelectedEvidence] = useState<AdminLatencyEvidenceDto | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  const handleVerify = async (id: number) => {
    try {
      // 실제 구현에서는 매칭될 로그 ID를 찾는 로직이 필요하나, 
      // 여기서는 예시로 0(자동매칭) 또는 선택 프로세스를 가정
      await verifyMutation.mutateAsync({ id, logId: 0 });
      toast.success("증거가 확인되었습니다.");
    } catch (error) {
      console.error(error);
      toast.error("확인 중 오류가 발생했습니다.");
    }
  };

  const handleReject = async () => {
    if (!selectedEvidence || !rejectReason) return;
    try {
      await rejectMutation.mutateAsync({ 
        id: selectedEvidence.id, 
        reason: rejectReason 
      });
      toast.success("증거가 반려되었습니다.");
      setIsRejectDialogOpen(false);
      setRejectReason("");
    } catch (error) {
      console.error(error);
      toast.error("반려 중 오류가 발생했습니다.");
    }
  };

  if (isLoading) {
    return <div className="p-8 text-zinc-400">데이터를 불러오는 중...</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-8 bg-[#121214] min-h-screen text-zinc-200">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">지연 극복 (Latency Survival) 관제</h1>
          <p className="text-sm text-zinc-400">유저가 제출한 TX 증거와 실제 입금 내역을 매칭합니다.</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-400">
            대기중: {evidences?.filter(e => e.status === 'PENDING').length || 0}
          </Badge>
        </div>
      </div>

      <Card className="bg-[#18181B] border-white/5 shadow-2xl">
        <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between py-4">
          <CardTitle className="text-lg font-medium">증거 제출 목록</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              placeholder="TX ID 또는 유저 검색" 
              className="w-full bg-zinc-950 border-white/5 rounded-md pl-9 pr-3 py-1.5 text-sm focus:ring-1 ring-lime-400/50 outline-none transition-all"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-950/50">
              <TableRow className="border-none">
                <TableHead className="text-zinc-500 font-medium">ID / 유저</TableHead>
                <TableHead className="text-zinc-500 font-medium text-center">TX ID (증거)</TableHead>
                <TableHead className="text-zinc-500 font-medium text-right">금액</TableHead>
                <TableHead className="text-zinc-500 font-medium text-center">상태</TableHead>
                <TableHead className="text-zinc-500 font-medium text-right">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evidences?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-zinc-600">
                    현재 대기 중인 증거가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                evidences?.map((evidence: AdminLatencyEvidenceDto) => (
                  <TableRow key={evidence.id} className="border-white/5 hover:bg-white/[0.02] transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-zinc-200">{evidence.nickname || `User ${evidence.userId}`}</span>
                        <span className="text-xs text-zinc-500">ID: {evidence.userId}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-zinc-400">
                      <div className="flex items-center justify-center gap-1">
                        {evidence.txId}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-600 hover:text-lime-400">
                          <Info className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-lime-400 font-bold">
                      {evidence.claimedAmount.toLocaleString()} CC
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={evidence.status} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {evidence.status === 'PENDING' || evidence.status === 'PROVISIONAL' ? (
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="bg-red-500/10 text-red-500 hover:bg-red-500/20 h-8 border-none"
                            onClick={() => {
                              setSelectedEvidence(evidence);
                              setIsRejectDialogOpen(true);
                            }}
                          >
                            <X className="w-4 h-4 mr-1" /> 반려
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-lime-400 text-black hover:bg-lime-500 h-8 font-bold border-none"
                            onClick={() => handleVerify(evidence.id)}
                          >
                            <Check className="w-4 h-4 mr-1" /> 승인
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600">{new Date(evidence.createdAt).toLocaleDateString()}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 반려 다이얼로그 */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-zinc-200">
          <DialogHeader>
            <DialogTitle>증거 반려</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="text-sm text-zinc-400">
              반려 사유를 입력해주세요. 유저의 히스토리에 기록됩니다.
            </div>
            <Textarea 
              className="bg-zinc-950 border-white/5 focus:ring-red-500/50" 
              placeholder="예: TX ID 불일치, 이미 처리된 거래 등"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRejectDialogOpen(false)}>취소</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectReason}>반려 확정</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LatencySurvivalPage;
