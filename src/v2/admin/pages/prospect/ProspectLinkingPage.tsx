import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Link,
  XCircle,
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { v2Client } from "../../../api/client";

// ==================== Types ====================

interface ProspectSuggestion {
  user_id: number;
  nickname: string;
  telegram_username: string | null;
  similarity: number;
}

interface Prospect {
  id: number;
  nickname: string;
  cc_id: string;
  segment: string;
  total_margin: number;
  total_charge: number;
  inactive_days: number;
  ignored: boolean;
  created_at: string | null;
  suggestions: ProspectSuggestion[];
}

interface ProspectListResponse {
  total: number;
  prospects: Prospect[];
}

interface ProspectStats {
  total_prospects: number;
  linked: number;
  ignored: number;
  pending: number;
  link_rate: number;
  by_segment: Record<string, { total: number; linked: number; pending: number }>;
}

interface UserSearchResult {
  id: number;
  nickname: string;
  telegram_username: string | null;
  telegram_id: number | null;
  total_charge_amount: number;
  last_login_at: string | null;
}

// ==================== API Functions ====================

const fetchProspects = async (
  segment?: string,
  includeIgnored?: boolean
): Promise<ProspectListResponse> => {
  const params = new URLSearchParams();
  if (segment && segment !== "ALL") params.append("segment", segment);
  if (includeIgnored) params.append("include_ignored", "true");
  params.append("limit", "100");

  const response = await v2Client.get<ProspectListResponse>(
    `/api/v2/admin/prospect/prospects?${params}`
  );
  return response.data;
};

const fetchProspectStats = async (): Promise<ProspectStats> => {
  const response = await v2Client.get<ProspectStats>(
    "/api/v2/admin/prospect/prospects/stats"
  );
  return response.data;
};

const searchUsers = async (query: string): Promise<UserSearchResult[]> => {
  if (!query || query.length < 1) return [];
  const response = await v2Client.get<{ users: UserSearchResult[] }>(
    `/api/v2/admin/prospect/users/search?q=${encodeURIComponent(query)}`
  );
  return response.data.users;
};

const linkProspect = async (prospectId: number, userId: number) => {
  const response = await v2Client.post(
    `/api/v2/admin/prospect/prospects/${prospectId}/link`,
    { user_id: userId }
  );
  return response.data;
};

const ignoreProspect = async (prospectId: number, reason?: string) => {
  const response = await v2Client.post(
    `/api/v2/admin/prospect/prospects/${prospectId}/ignore`,
    { reason }
  );
  return response.data;
};

// ==================== Component ====================

export default function ProspectLinkingPage() {
  const queryClient = useQueryClient();
  const [segmentFilter, setSegmentFilter] = useState<string>("ALL");
  const [includeIgnored, setIncludeIgnored] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isIgnoreDialogOpen, setIsIgnoreDialogOpen] = useState(false);
  const [ignoreReason, setIgnoreReason] = useState("");

  // Queries
  const { data: prospectsData, isLoading: isLoadingProspects, refetch } = useQuery({
    queryKey: ["prospects", segmentFilter, includeIgnored],
    queryFn: () => fetchProspects(segmentFilter, includeIgnored),
  });

  const { data: stats } = useQuery({
    queryKey: ["prospect-stats"],
    queryFn: fetchProspectStats,
  });

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["user-search", searchQuery],
    queryFn: () => searchUsers(searchQuery),
    enabled: searchQuery.length >= 1,
  });

  // Mutations
  const linkMutation = useMutation({
    mutationFn: ({ prospectId, userId }: { prospectId: number; userId: number }) =>
      linkProspect(prospectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["prospect-stats"] });
      setIsLinkDialogOpen(false);
      setSelectedProspect(null);
    },
  });

  const ignoreMutation = useMutation({
    mutationFn: ({ prospectId, reason }: { prospectId: number; reason?: string }) =>
      ignoreProspect(prospectId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["prospect-stats"] });
      setIsIgnoreDialogOpen(false);
      setSelectedProspect(null);
      setIgnoreReason("");
    },
  });

  const handleLinkClick = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setIsLinkDialogOpen(true);
    setSearchQuery("");
  };

  const handleIgnoreClick = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setIsIgnoreDialogOpen(true);
  };

  const handleConfirmLink = (userId: number) => {
    if (selectedProspect) {
      linkMutation.mutate({ prospectId: selectedProspect.id, userId });
    }
  };

  const handleConfirmIgnore = () => {
    if (selectedProspect) {
      ignoreMutation.mutate({ prospectId: selectedProspect.id, reason: ignoreReason });
    }
  };

  const getSegmentBadge = (segment: string) => {
    const colors: Record<string, string> = {
      VIP: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      WHALE: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      AT_RISK: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    };
    return colors[segment] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
  };

  return (
    <div className="space-y-6 p-6 min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 mb-2">
            <Users className="w-8 h-8 text-indigo-400" />
            잠재 유저 매칭
          </h1>
          <p className="text-zinc-400">
            HQ 데이터의 잠재 유저를 실제 V2 유저와 연결합니다.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          className="border-zinc-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">전체</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {stats.total_prospects}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">연결됨</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">
                {stats.linked}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">대기중</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">
                {stats.pending}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">무시됨</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-500">
                {stats.ignored}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-zinc-400">연결률</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-400">
                {stats.link_rate}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-40 bg-zinc-900 border-zinc-700">
            <SelectValue placeholder="세그먼트" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">전체</SelectItem>
            <SelectItem value="VIP">VIP</SelectItem>
            <SelectItem value="WHALE">WHALE</SelectItem>
            <SelectItem value="AT_RISK">AT_RISK</SelectItem>
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input
            type="checkbox"
            checked={includeIgnored}
            onChange={(e) => setIncludeIgnored(e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-900"
          />
          무시된 항목 포함
        </label>
      </div>

      {/* Prospect List */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg">
            대기 중인 잠재 유저 ({prospectsData?.total ?? 0})
          </CardTitle>
          <CardDescription>
            유사도 추천을 확인하고 연결하거나 무시 처리하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingProspects ? (
            <div className="text-center py-8 text-zinc-500">로딩 중...</div>
          ) : prospectsData?.prospects.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              대기 중인 잠재 유저가 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {prospectsData?.prospects.map((prospect) => (
                <div
                  key={prospect.id}
                  className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
                >
                  {/* Prospect Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-white">
                        {prospect.nickname}
                      </span>
                      <Badge
                        variant="outline"
                        className={getSegmentBadge(prospect.segment)}
                      >
                        {prospect.segment}
                      </Badge>
                      {prospect.ignored && (
                        <Badge variant="outline" className="bg-zinc-700/50 text-zinc-500">
                          무시됨
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 space-x-4">
                      <span>마진: ₩{prospect.total_margin?.toLocaleString()}</span>
                      <span>충전: ₩{prospect.total_charge?.toLocaleString()}</span>
                      <span>비활성: {prospect.inactive_days}일</span>
                    </div>
                  </div>

                  {/* Suggestions */}
                  <div className="flex-1 px-4">
                    {prospect.suggestions.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-xs text-zinc-500">추천 매칭:</span>
                        {prospect.suggestions.slice(0, 2).map((s) => (
                          <div
                            key={s.user_id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="text-emerald-400">{s.nickname}</span>
                            <span className="text-xs text-zinc-500">
                              ({s.similarity}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-600">
                        추천 매칭 없음
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleLinkClick(prospect)}
                      disabled={prospect.ignored}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      <Link className="w-4 h-4 mr-1" />
                      연결
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleIgnoreClick(prospect)}
                      disabled={prospect.ignored}
                      className="border-zinc-700 hover:bg-zinc-800"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      무시
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>유저 연결</DialogTitle>
            <DialogDescription>
              "{selectedProspect?.nickname}"을(를) V2 유저와 연결합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Suggested Matches */}
            {selectedProspect?.suggestions && selectedProspect.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2 text-zinc-400">
                  추천 매칭
                </h4>
                <div className="space-y-2">
                  {selectedProspect.suggestions.map((s) => (
                    <div
                      key={s.user_id}
                      className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors"
                      onClick={() => handleConfirmLink(s.user_id)}
                    >
                      <div>
                        <span className="font-medium">{s.nickname}</span>
                        {s.telegram_username && (
                          <span className="text-xs text-zinc-500 ml-2">
                            @{s.telegram_username}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/20 text-emerald-400">
                          {s.similarity}%
                        </Badge>
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Search */}
            <div>
              <h4 className="text-sm font-medium mb-2 text-zinc-400">
                수동 검색
              </h4>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  placeholder="닉네임으로 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700"
                />
              </div>

              {isSearching && (
                <div className="text-center py-4 text-zinc-500">검색 중...</div>
              )}

              {searchResults && searchResults.length > 0 && (
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors"
                      onClick={() => handleConfirmLink(user.id)}
                    >
                      <div>
                        <span className="font-medium">{user.nickname}</span>
                        {user.telegram_username && (
                          <span className="text-xs text-zinc-500 ml-2">
                            @{user.telegram_username}
                          </span>
                        )}
                      </div>
                      <CheckCircle className="w-4 h-4 text-zinc-500 hover:text-emerald-400" />
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && searchResults?.length === 0 && !isSearching && (
                <div className="text-center py-4 text-zinc-500">
                  검색 결과가 없습니다.
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsLinkDialogOpen(false)}
              className="border-zinc-700"
            >
              취소
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ignore Dialog */}
      <Dialog open={isIgnoreDialogOpen} onOpenChange={setIsIgnoreDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              무시 처리
            </DialogTitle>
            <DialogDescription>
              "{selectedProspect?.nickname}"을(를) 목록에서 제외합니다.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label className="text-sm text-zinc-400">사유 (선택)</label>
            <Input
              placeholder="무시 사유를 입력하세요..."
              value={ignoreReason}
              onChange={(e) => setIgnoreReason(e.target.value)}
              className="mt-2 bg-zinc-800 border-zinc-700"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsIgnoreDialogOpen(false)}
              className="border-zinc-700"
            >
              취소
            </Button>
            <Button
              onClick={handleConfirmIgnore}
              disabled={ignoreMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700"
            >
              무시 처리
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
