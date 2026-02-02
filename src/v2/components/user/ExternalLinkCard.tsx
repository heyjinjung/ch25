import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link2,
  Unlink,
  Gift,
  CheckCircle,
  AlertCircle,
  Loader2,
  Crown,
  Star,
} from "lucide-react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Badge } from "../../components/ui/badge";
import { v2Client } from "../../api/client";

// ==================== Types ====================

interface LinkStatus {
  is_linked: boolean;
  external_nickname: string | null;
  linked_at: string | null;
  segment: string | null;
  benefits: string[];
}

interface LinkResponse {
  success: boolean;
  message: string;
  segment: string | null;
  total_margin?: number;
  total_charge?: number;
  pending?: boolean;
}

// ==================== API Functions ====================

const fetchLinkStatus = async (): Promise<LinkStatus> => {
  const response = await v2Client.get<LinkStatus>("/api/v2/user/link-status");
  return response.data;
};

const linkExternalAccount = async (nickname: string): Promise<LinkResponse> => {
  const response = await v2Client.post<LinkResponse>(
    "/api/v2/user/link-external",
    {
      external_nickname: nickname,
    },
  );
  return response.data;
};

const unlinkExternalAccount = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await v2Client.delete<{ success: boolean; message: string }>(
    "/api/v2/user/link-external",
  );
  return response.data;
};

// ==================== Component ====================

export default function ExternalLinkCard() {
  const queryClient = useQueryClient();
  const [externalNickname, setExternalNickname] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [linkResult, setLinkResult] = useState<LinkResponse | null>(null);

  // Query
  const { data: linkStatus, isLoading } = useQuery({
    queryKey: ["link-status"],
    queryFn: fetchLinkStatus,
  });

  // Mutations
  const linkMutation = useMutation({
    mutationFn: linkExternalAccount,
    onSuccess: (data) => {
      setLinkResult(data);
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["link-status"] });
        queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      }
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: unlinkExternalAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["link-status"] });
      setLinkResult(null);
    },
  });

  const handleLink = () => {
    if (externalNickname.trim()) {
      linkMutation.mutate(externalNickname.trim());
    }
  };

  const handleUnlink = () => {
    unlinkMutation.mutate();
  };

  const getSegmentIcon = (segment: string | null) => {
    switch (segment) {
      case "WHALE":
        return <Crown className="w-5 h-5 text-blue-400" />;
      case "VIP":
        return <Star className="w-5 h-5 text-purple-400" />;
      default:
        return <Gift className="w-5 h-5 text-zinc-400" />;
    }
  };

  const getSegmentColor = (segment: string | null) => {
    switch (segment) {
      case "WHALE":
        return "from-blue-500/20 to-blue-600/10 border-blue-500/30";
      case "VIP":
        return "from-purple-500/20 to-purple-600/10 border-purple-500/30";
      case "AT_RISK":
        return "from-orange-500/20 to-orange-600/10 border-orange-500/30";
      default:
        return "from-zinc-800 to-zinc-900 border-zinc-700";
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </CardContent>
      </Card>
    );
  }

  // 이미 연동된 경우
  if (linkStatus?.is_linked) {
    return (
      <Card
        className={`bg-gradient-to-br ${getSegmentColor(linkStatus.segment)} border`}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            {getSegmentIcon(linkStatus.segment)}
            계정 연동 완료
            {linkStatus.segment && (
              <Badge
                className={
                  linkStatus.segment === "WHALE"
                    ? "bg-blue-500/30 text-blue-300"
                    : linkStatus.segment === "VIP"
                      ? "bg-purple-500/30 text-purple-300"
                      : "bg-orange-500/30 text-orange-300"
                }
              >
                {linkStatus.segment}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {linkStatus.external_nickname}로 연동됨
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Benefits */}
          {linkStatus.benefits.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-zinc-300">적용된 혜택</h4>
              <ul className="space-y-1">
                {linkStatus.benefits.map((benefit, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-sm text-zinc-400"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Unlink Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnlink}
            disabled={unlinkMutation.isPending}
            className="border-zinc-600 text-zinc-400 hover:text-white"
          >
            <Unlink className="w-4 h-4 mr-2" />
            연동 해제
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 연동 안된 경우
  return (
    <>
      <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Link2 className="w-5 h-5 text-indigo-400" />
            외부 계정 연동
          </CardTitle>
          <CardDescription className="text-zinc-400">
            외부 카지노 계정을 연동하면 특별 혜택을 받을 수 있습니다!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Benefits Preview */}
          <div className="space-y-2 p-3 bg-black/20 rounded-lg">
            <h4 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-400" />
              VIP/WHALE 회원 혜택
            </h4>
            <ul className="space-y-1 text-xs text-zinc-500">
              <li>• 일일 보너스 2~3배 지급</li>
              <li>• 전용 이벤트 참여 자격</li>
              <li>• 우선/즉시 출금 처리</li>
              <li>• 전담 매니저 배정</li>
            </ul>
          </div>

          {/* Link Button */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                <Link2 className="w-4 h-4 mr-2" />
                계정 연동하기
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
              <DialogHeader>
                <DialogTitle>외부 계정 연동</DialogTitle>
                <DialogDescription>
                  외부 카지노에서 사용하는 닉네임을 입력해주세요.
                </DialogDescription>
              </DialogHeader>

              {/* Result Display */}
              {linkResult && (
                <div
                  className={`p-4 rounded-lg ${
                    linkResult.segment
                      ? "bg-emerald-500/20 border border-emerald-500/30"
                      : linkResult.pending
                        ? "bg-amber-500/20 border border-amber-500/30"
                        : "bg-zinc-800 border border-zinc-700"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {linkResult.segment ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                    ) : linkResult.pending ? (
                      <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-zinc-400 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {linkResult.message}
                      </p>
                      {linkResult.segment && (
                        <div className="mt-2 text-xs text-zinc-400">
                          <p>세그먼트: {linkResult.segment}</p>
                          {linkResult.total_margin !== undefined && (
                            <p>
                              총 마진: ₩
                              {linkResult.total_margin.toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Input */}
              {!linkResult?.segment && (
                <div className="space-y-2">
                  <label className="text-sm text-zinc-400">외부 닉네임</label>
                  <Input
                    placeholder="예: 큰손고래123"
                    value={externalNickname}
                    onChange={(e) => setExternalNickname(e.target.value)}
                    className="bg-zinc-800 border-zinc-700"
                    disabled={linkMutation.isPending}
                  />
                </div>
              )}

              <DialogFooter>
                {linkResult?.segment ? (
                  <Button
                    onClick={() => {
                      setIsDialogOpen(false);
                      setLinkResult(null);
                      setExternalNickname("");
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    완료
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setLinkResult(null);
                        setExternalNickname("");
                      }}
                      className="border-zinc-700"
                    >
                      취소
                    </Button>
                    <Button
                      onClick={handleLink}
                      disabled={
                        !externalNickname.trim() || linkMutation.isPending
                      }
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      {linkMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Link2 className="w-4 h-4 mr-2" />
                      )}
                      연동하기
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </>
  );
}
