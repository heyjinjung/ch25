import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Link,
  Link2,
  Link2Off,
  XCircle,
  Search,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Edit,
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
import { toast } from "sonner";
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
  by_segment: Record<
    string,
    { total: number; linked: number; pending: number }
  >;
}

interface UserSearchResult {
  id: number;
  nickname: string;
  telegram_username: string | null;
  telegram_id: number | null;
  total_charge_amount: number;
  last_login_at: string | null;
}

interface LinkedUser {
  id: number;
  nickname: string;
  external_nickname: string;
  hq_segment: string | null;
  telegram_username: string | null;
  external_linked_at: string | null;
}

// 미동기화 유저 관련 타입
interface PendingSyncUser {
  user_id: number;
  nickname: string;
  external_nickname: string;
  telegram_username: string | null;
  hq_match: {
    found: boolean;
    prospect_id?: number;
    segment?: string;
    total_charge?: number;
    total_margin?: number;
  };
}

interface PendingSyncUsersResponse {
  total: number;
  syncable: number;
  users: PendingSyncUser[];
}

interface SyncResult {
  success: boolean;
  message: string;
  synced: number;
  skipped: number;
  total_pending: number;
  details: Array<{
    user_id: number;
    nickname: string;
    external_nickname: string;
    action: string;
    segment?: string;
  }>;
}

interface LinkedUsersResponse {
  total: number;
  users: LinkedUser[];
}

// ==================== API Functions ====================

const fetchProspects = async (
  segment?: string,
  includeIgnored?: boolean,
): Promise<ProspectListResponse> => {
  const params = new URLSearchParams();
  if (segment && segment !== "ALL") params.append("segment", segment);
  if (includeIgnored) params.append("include_ignored", "true");
  params.append("limit", "100");

  const response = await v2Client.get<ProspectListResponse>(
    `/api/v2/admin/prospect/prospects?${params}`,
  );
  return response.data;
};

const fetchProspectStats = async (): Promise<ProspectStats> => {
  const response = await v2Client.get<ProspectStats>(
    "/api/v2/admin/prospect/prospects/stats",
  );
  return response.data;
};

const searchUsers = async (query: string): Promise<UserSearchResult[]> => {
  if (!query || query.length < 1) return [];
  const response = await v2Client.get<{ users: UserSearchResult[] }>(
    `/api/v2/admin/prospect/users/search?q=${encodeURIComponent(query)}`,
  );
  return response.data.users;
};

const linkProspect = async (prospectId: number, userId: number) => {
  const response = await v2Client.post(
    `/api/v2/admin/prospect/prospects/${prospectId}/link`,
    { user_id: userId },
  );
  return response.data;
};

const ignoreProspect = async (prospectId: number, reason?: string) => {
  const response = await v2Client.post(
    `/api/v2/admin/prospect/prospects/${prospectId}/ignore`,
    { reason },
  );
  return response.data;
};

// 연결된 유저 조회 (external_nickname 설정된 유저들)
const fetchLinkedUsers = async (
  search?: string,
): Promise<LinkedUsersResponse> => {
  const params = new URLSearchParams();
  if (search) params.append("search", search);
  params.append("limit", "100");

  const response = await v2Client.get<LinkedUsersResponse>(
    `/api/v2/admin/prospect/linked-users?${params}`,
  );
  return response.data;
};

// external_nickname 수정 (오타 교정)
const updateExternalNickname = async (userId: number, newNickname: string) => {
  const response = await v2Client.patch(
    `/api/v2/admin/prospect/users/${userId}/external-nickname`,
    { external_nickname: newNickname },
  );
  return response.data;
};

// external_nickname 연결 해제
const unlinkExternalNickname = async (userId: number) => {
  const response = await v2Client.delete(
    `/api/v2/admin/prospect/users/${userId}/external-link`,
  );
  return response.data;
};

// 미동기화 유저 목록 조회
const fetchPendingSyncUsers = async (): Promise<PendingSyncUsersResponse> => {
  const response = await v2Client.get<PendingSyncUsersResponse>(
    "/api/v2/admin/prospect/pending-sync-users",
  );
  return response.data;
};

// 미동기화 유저 일괄 동기화
const syncPendingUsers = async (): Promise<SyncResult> => {
  const response = await v2Client.post<SyncResult>(
    "/api/v2/admin/prospect/sync-pending-users",
  );
  return response.data;
};

// ==================== Component ====================

type SortField =
  | "nickname"
  | "total_margin"
  | "total_charge"
  | "inactive_days"
  | "similarity";
type SortOrder = "asc" | "desc";

export default function ProspectLinkingPage() {
  const queryClient = useQueryClient();

  // 탭 상태
  const [activeTab, setActiveTab] = useState<
    "prospects" | "linked" | "pending-sync"
  >("prospects");

  const [segmentFilter, setSegmentFilter] = useState<string>("ALL");
  const [includeIgnored, setIncludeIgnored] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(
    null,
  );
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isIgnoreDialogOpen, setIsIgnoreDialogOpen] = useState(false);
  const [ignoreReason, setIgnoreReason] = useState("");

  // 검색/필터/정렬 상태
  const [nicknameSearch, setNicknameSearch] = useState("");
  const [marginMin, setMarginMin] = useState<string>("");
  const [marginMax, setMarginMax] = useState<string>("");
  const [inactiveDaysMin, setInactiveDaysMin] = useState<string>("");
  const [inactiveDaysMax, setInactiveDaysMax] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("total_margin");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // 연결된 유저 관리 상태
  const [linkedUserSearch, setLinkedUserSearch] = useState("");
  const [selectedLinkedUser, setSelectedLinkedUser] =
    useState<LinkedUser | null>(null);
  const [isEditNicknameDialogOpen, setIsEditNicknameDialogOpen] =
    useState(false);
  const [isUnlinkDialogOpen, setIsUnlinkDialogOpen] = useState(false);
  const [editingNickname, setEditingNickname] = useState("");

  // Queries
  const {
    data: prospectsData,
    isLoading: isLoadingProspects,
    refetch,
  } = useQuery({
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

  // 연결된 유저 조회
  const {
    data: linkedUsersData,
    isLoading: isLoadingLinkedUsers,
    refetch: refetchLinkedUsers,
  } = useQuery({
    queryKey: ["linked-users", linkedUserSearch],
    queryFn: () => fetchLinkedUsers(linkedUserSearch || undefined),
    enabled: activeTab === "linked",
  });

  // 미동기화 유저 조회
  const {
    data: pendingSyncData,
    isLoading: isLoadingPendingSync,
    refetch: refetchPendingSync,
  } = useQuery({
    queryKey: ["pending-sync-users"],
    queryFn: fetchPendingSyncUsers,
    enabled: activeTab === "pending-sync",
  });

  // 미동기화 유저 동기화 뮤테이션
  const syncPendingMutation = useMutation({
    mutationFn: syncPendingUsers,
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["pending-sync-users"] });
      queryClient.invalidateQueries({ queryKey: ["linked-users"] });
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["prospect-stats"] });
    },
    onError: (error: Error) => {
      toast.error(`동기화 오류: ${error.message}`);
    },
  });

  // 연결된 유저 닉네임 수정 뮤테이션
  const updateNicknameMutation = useMutation({
    mutationFn: ({ userId, nickname }: { userId: number; nickname: string }) =>
      updateExternalNickname(userId, nickname),
    onSuccess: () => {
      toast.success("외부 닉네임이 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["linked-users"] });
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["prospect-stats"] });
      setIsEditNicknameDialogOpen(false);
      setSelectedLinkedUser(null);
    },
    onError: (error: Error) => {
      toast.error(`오류: ${error.message}`);
    },
  });

  // 연결 해제 뮤테이션
  const unlinkMutation = useMutation({
    mutationFn: (userId: number) => unlinkExternalNickname(userId),
    onSuccess: () => {
      toast.success("외부 닉네임 연결이 해제되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["linked-users"] });
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["prospect-stats"] });
      setIsUnlinkDialogOpen(false);
      setSelectedLinkedUser(null);
    },
    onError: (error: Error) => {
      toast.error(`오류: ${error.message}`);
    },
  });

  // 필터링 및 정렬된 목록 생성
  const filteredAndSortedProspects = useMemo(() => {
    if (!prospectsData?.prospects) return [];

    let filtered = [...prospectsData.prospects];

    // 닉네임 검색
    if (nicknameSearch.trim()) {
      const search = nicknameSearch.toLowerCase().trim();
      filtered = filtered.filter((p) =>
        p.nickname.toLowerCase().includes(search),
      );
    }

    // 마진 범위 필터
    if (marginMin) {
      const min = parseInt(marginMin, 10);
      if (!isNaN(min)) {
        filtered = filtered.filter((p) => (p.total_margin ?? 0) >= min);
      }
    }
    if (marginMax) {
      const max = parseInt(marginMax, 10);
      if (!isNaN(max)) {
        filtered = filtered.filter((p) => (p.total_margin ?? 0) <= max);
      }
    }

    // 비활성 일수 범위 필터
    if (inactiveDaysMin) {
      const min = parseInt(inactiveDaysMin, 10);
      if (!isNaN(min)) {
        filtered = filtered.filter((p) => (p.inactive_days ?? 0) >= min);
      }
    }
    if (inactiveDaysMax) {
      const max = parseInt(inactiveDaysMax, 10);
      if (!isNaN(max)) {
        filtered = filtered.filter((p) => (p.inactive_days ?? 0) <= max);
      }
    }

    // 정렬
    filtered.sort((a, b) => {
      let aVal: number = 0;
      let bVal: number = 0;

      switch (sortField) {
        case "nickname":
          return sortOrder === "asc"
            ? a.nickname.localeCompare(b.nickname)
            : b.nickname.localeCompare(a.nickname);
        case "total_margin":
          aVal = a.total_margin ?? 0;
          bVal = b.total_margin ?? 0;
          break;
        case "total_charge":
          aVal = a.total_charge ?? 0;
          bVal = b.total_charge ?? 0;
          break;
        case "inactive_days":
          aVal = a.inactive_days ?? 0;
          bVal = b.inactive_days ?? 0;
          break;
        case "similarity":
          aVal = a.suggestions[0]?.similarity ?? 0;
          bVal = b.suggestions[0]?.similarity ?? 0;
          break;
      }

      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [
    prospectsData?.prospects,
    nicknameSearch,
    marginMin,
    marginMax,
    inactiveDaysMin,
    inactiveDaysMax,
    sortField,
    sortOrder,
  ]);

  // 정렬 토글 함수
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // 정렬 아이콘 렌더링
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="w-3 h-3 text-zinc-600" />;
    return sortOrder === "asc" ? (
      <ArrowUp className="w-3 h-3 text-indigo-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-indigo-400" />
    );
  };

  // 필터 초기화
  const resetFilters = () => {
    setNicknameSearch("");
    setMarginMin("");
    setMarginMax("");
    setInactiveDaysMin("");
    setInactiveDaysMax("");
    setSortField("total_margin");
    setSortOrder("desc");
  };

  // Mutations
  const linkMutation = useMutation({
    mutationFn: ({
      prospectId,
      userId,
    }: {
      prospectId: number;
      userId: number;
    }) => linkProspect(prospectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["prospect-stats"] });
      setIsLinkDialogOpen(false);
      setSelectedProspect(null);
    },
  });

  const ignoreMutation = useMutation({
    mutationFn: ({
      prospectId,
      reason,
    }: {
      prospectId: number;
      reason?: string;
    }) => ignoreProspect(prospectId, reason),
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
      ignoreMutation.mutate({
        prospectId: selectedProspect.id,
        reason: ignoreReason,
      });
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

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("prospects")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "prospects"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          HQ 잠재 유저
        </button>
        <button
          onClick={() => setActiveTab("linked")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "linked"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <Link2 className="w-4 h-4 inline mr-2" />
          연결된 유저 관리
        </button>
        <button
          onClick={() => setActiveTab("pending-sync")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "pending-sync"
              ? "border-indigo-500 text-indigo-400"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          <AlertCircle className="w-4 h-4 inline mr-2" />
          미동기화 유저
          {pendingSyncData && pendingSyncData.total > 0 && (
            <Badge variant="destructive" className="ml-2 text-xs">
              {pendingSyncData.total}
            </Badge>
          )}
        </button>
      </div>

      {/* Tab Content: HQ Prospects */}
      {activeTab === "prospects" && (
        <>
          {/* Filters */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-400" />
                  필터 및 검색
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-zinc-400 hover:text-white"
                >
                  초기화
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 첫 번째 행: 세그먼트, 닉네임 검색, 무시 항목 */}
              <div className="flex flex-wrap gap-4 items-center">
                <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                  <SelectTrigger className="w-32 bg-zinc-800 border-zinc-700">
                    <SelectValue placeholder="세그먼트" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">전체</SelectItem>
                    <SelectItem value="VIP">VIP</SelectItem>
                    <SelectItem value="WHALE">WHALE</SelectItem>
                    <SelectItem value="AT_RISK">AT_RISK</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="닉네임 검색..."
                    value={nicknameSearch}
                    onChange={(e) => setNicknameSearch(e.target.value)}
                    className="pl-10 bg-zinc-800 border-zinc-700"
                  />
                </div>

                <label className="flex items-center gap-2 text-sm text-zinc-400">
                  <input
                    type="checkbox"
                    checked={includeIgnored}
                    onChange={(e) => setIncludeIgnored(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-900"
                  />
                  무시된 항목
                </label>
              </div>

              {/* 두 번째 행: 마진/비활성 필터 */}
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 whitespace-nowrap">
                    마진:
                  </span>
                  <Input
                    type="number"
                    placeholder="최소"
                    value={marginMin}
                    onChange={(e) => setMarginMin(e.target.value)}
                    className="w-24 bg-zinc-800 border-zinc-700 text-sm"
                  />
                  <span className="text-zinc-600">~</span>
                  <Input
                    type="number"
                    placeholder="최대"
                    value={marginMax}
                    onChange={(e) => setMarginMax(e.target.value)}
                    className="w-24 bg-zinc-800 border-zinc-700 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500 whitespace-nowrap">
                    비활성:
                  </span>
                  <Input
                    type="number"
                    placeholder="최소"
                    value={inactiveDaysMin}
                    onChange={(e) => setInactiveDaysMin(e.target.value)}
                    className="w-20 bg-zinc-800 border-zinc-700 text-sm"
                  />
                  <span className="text-zinc-600">~</span>
                  <Input
                    type="number"
                    placeholder="최대"
                    value={inactiveDaysMax}
                    onChange={(e) => setInactiveDaysMax(e.target.value)}
                    className="w-20 bg-zinc-800 border-zinc-700 text-sm"
                  />
                  <span className="text-xs text-zinc-500">일</span>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-zinc-500">정렬:</span>
                  <Select
                    value={sortField}
                    onValueChange={(v) => setSortField(v as SortField)}
                  >
                    <SelectTrigger className="w-28 bg-zinc-800 border-zinc-700 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total_margin">마진</SelectItem>
                      <SelectItem value="total_charge">충전</SelectItem>
                      <SelectItem value="inactive_days">비활성</SelectItem>
                      <SelectItem value="nickname">닉네임</SelectItem>
                      <SelectItem value="similarity">유사도</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                    }
                    className="border-zinc-700 px-2"
                  >
                    {sortOrder === "asc" ? (
                      <ArrowUp className="w-4 h-4" />
                    ) : (
                      <ArrowDown className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prospect List */}
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-lg">
                대기 중인 잠재 유저 ({filteredAndSortedProspects.length}명 /
                전체 {prospectsData?.total ?? 0}명)
              </CardTitle>
              <CardDescription>
                유사도 추천을 확인하고 연결하거나 무시 처리하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 테이블 헤더 - 정렬 가능 */}
              <div className="flex items-center px-4 py-2 mb-2 bg-zinc-800/30 rounded-lg text-xs text-zinc-500 font-medium">
                <div className="flex-1 min-w-[140px]">
                  <button
                    onClick={() => handleSort("nickname")}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    닉네임 <SortIcon field="nickname" />
                  </button>
                </div>
                <div className="w-20 text-center">세그먼트</div>
                <div className="w-28 text-right">
                  <button
                    onClick={() => handleSort("total_margin")}
                    className="flex items-center gap-1 justify-end hover:text-white transition-colors ml-auto"
                  >
                    마진 <SortIcon field="total_margin" />
                  </button>
                </div>
                <div className="w-28 text-right">
                  <button
                    onClick={() => handleSort("total_charge")}
                    className="flex items-center gap-1 justify-end hover:text-white transition-colors ml-auto"
                  >
                    충전 <SortIcon field="total_charge" />
                  </button>
                </div>
                <div className="w-20 text-right">
                  <button
                    onClick={() => handleSort("inactive_days")}
                    className="flex items-center gap-1 justify-end hover:text-white transition-colors ml-auto"
                  >
                    비활성 <SortIcon field="inactive_days" />
                  </button>
                </div>
                <div className="flex-1 px-4 min-w-[150px]">
                  <button
                    onClick={() => handleSort("similarity")}
                    className="flex items-center gap-1 hover:text-white transition-colors"
                  >
                    추천 매칭 <SortIcon field="similarity" />
                  </button>
                </div>
                <div className="w-32 text-right">액션</div>
              </div>

              {isLoadingProspects ? (
                <div className="text-center py-8 text-zinc-500">로딩 중...</div>
              ) : filteredAndSortedProspects.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  {nicknameSearch ||
                  marginMin ||
                  marginMax ||
                  inactiveDaysMin ||
                  inactiveDaysMax
                    ? "필터 조건에 맞는 잠재 유저가 없습니다."
                    : "대기 중인 잠재 유저가 없습니다."}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAndSortedProspects.map((prospect) => (
                    <div
                      key={prospect.id}
                      className="flex items-center px-4 py-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 hover:bg-zinc-800 transition-colors"
                    >
                      {/* 닉네임 */}
                      <div className="flex-1 min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">
                            {prospect.nickname}
                          </span>
                          {prospect.ignored && (
                            <Badge
                              variant="outline"
                              className="bg-zinc-700/50 text-zinc-500 text-[10px] px-1"
                            >
                              무시됨
                            </Badge>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-0.5">
                          ID: {prospect.cc_id}
                        </div>
                      </div>

                      {/* 세그먼트 */}
                      <div className="w-20 flex justify-center">
                        <Badge
                          variant="outline"
                          className={getSegmentBadge(prospect.segment)}
                        >
                          {prospect.segment}
                        </Badge>
                      </div>

                      {/* 마진 */}
                      <div className="w-28 text-right">
                        <span
                          className={`text-sm ${(prospect.total_margin ?? 0) >= 1000000 ? "text-emerald-400 font-semibold" : "text-zinc-300"}`}
                        >
                          ₩{(prospect.total_margin ?? 0).toLocaleString()}
                        </span>
                      </div>

                      {/* 충전 */}
                      <div className="w-28 text-right">
                        <span className="text-sm text-zinc-400">
                          ₩{(prospect.total_charge ?? 0).toLocaleString()}
                        </span>
                      </div>

                      {/* 비활성 */}
                      <div className="w-20 text-right">
                        <span
                          className={`text-sm ${(prospect.inactive_days ?? 0) > 30 ? "text-red-400" : "text-zinc-400"}`}
                        >
                          {prospect.inactive_days}일
                        </span>
                      </div>

                      {/* 추천 매칭 */}
                      <div className="flex-1 px-4 min-w-[150px]">
                        {prospect.suggestions.length > 0 ? (
                          <div className="space-y-0.5">
                            {prospect.suggestions.slice(0, 2).map((s) => (
                              <div
                                key={s.user_id}
                                className="flex items-center gap-2 text-sm"
                              >
                                <span className="text-emerald-400 truncate max-w-[80px]">
                                  {s.nickname}
                                </span>
                                <span
                                  className={`text-[10px] px-1 rounded ${
                                    s.similarity >= 90
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : s.similarity >= 70
                                        ? "bg-amber-500/20 text-amber-400"
                                        : "bg-zinc-500/20 text-zinc-400"
                                  }`}
                                >
                                  {s.similarity}%
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-600">없음</span>
                        )}
                      </div>

                      {/* 액션 */}
                      <div className="w-32 flex justify-end gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleLinkClick(prospect)}
                          disabled={prospect.ignored}
                          className="bg-indigo-600 hover:bg-indigo-700 h-7 text-xs px-2"
                        >
                          <Link className="w-3 h-3 mr-1" />
                          연결
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleIgnoreClick(prospect)}
                          disabled={prospect.ignored}
                          className="border-zinc-700 hover:bg-zinc-800 h-7 text-xs px-2"
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Tab Content: Linked Users Management */}
      {activeTab === "linked" && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-indigo-400" />
                  연결된 유저 관리
                </CardTitle>
                <CardDescription>
                  외부 닉네임이 설정된 유저 목록입니다. 오타를 수정하거나 연결을
                  해제할 수 있습니다.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => refetchLinkedUsers()}
                className="border-zinc-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                새로고침
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* 검색 */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="닉네임 또는 외부 닉네임으로 검색..."
                value={linkedUserSearch}
                onChange={(e) => setLinkedUserSearch(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700"
              />
            </div>

            {isLoadingLinkedUsers ? (
              <div className="text-center py-8 text-zinc-500">로딩 중...</div>
            ) : !linkedUsersData?.users ||
              linkedUsersData.users.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                연결된 유저가 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {/* 테이블 헤더 */}
                <div className="flex items-center px-4 py-2 mb-2 bg-zinc-800/30 rounded-lg text-xs text-zinc-500 font-medium">
                  <div className="w-20">ID</div>
                  <div className="flex-1 min-w-[120px]">V2 닉네임</div>
                  <div className="flex-1 min-w-[120px]">외부 닉네임</div>
                  <div className="w-24 text-center">세그먼트</div>
                  <div className="w-36">연결일시</div>
                  <div className="w-32 text-right">액션</div>
                </div>

                {/* 유저 목록 */}
                {linkedUsersData.users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center px-4 py-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                  >
                    <div className="w-20 text-zinc-400 text-sm">#{user.id}</div>
                    <div className="flex-1 min-w-[120px]">
                      <span className="font-medium">{user.nickname}</span>
                      {user.telegram_username && (
                        <span className="text-xs text-zinc-500 ml-1">
                          @{user.telegram_username}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <span className="text-amber-400 font-medium">
                        {user.external_nickname}
                      </span>
                    </div>
                    <div className="w-24 text-center">
                      {user.hq_segment ? (
                        <Badge className={getSegmentBadge(user.hq_segment)}>
                          {user.hq_segment}
                        </Badge>
                      ) : (
                        <span className="text-zinc-600 text-xs">-</span>
                      )}
                    </div>
                    <div className="w-36 text-xs text-zinc-400">
                      {user.external_linked_at
                        ? new Date(user.external_linked_at).toLocaleDateString(
                            "ko-KR",
                          )
                        : "-"}
                    </div>
                    <div className="w-32 flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedLinkedUser(user);
                          setEditingNickname(user.external_nickname);
                          setIsEditNicknameDialogOpen(true);
                        }}
                        className="border-zinc-700 hover:bg-zinc-700 h-7 text-xs px-2"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        수정
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedLinkedUser(user);
                          setIsUnlinkDialogOpen(true);
                        }}
                        className="border-red-800 text-red-400 hover:bg-red-900/20 h-7 text-xs px-2"
                      >
                        <Link2Off className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab Content: Pending Sync Users */}
      {activeTab === "pending-sync" && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                  미동기화 유저
                </CardTitle>
                <CardDescription>
                  외부 닉네임은 설정되었지만 HQ 세그먼트가 누락된 유저입니다.
                  <br />
                  HQ 데이터와 매칭하여 세그먼트와 CC 입금을 반영합니다.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => refetchPendingSync()}
                  className="border-zinc-700"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  새로고침
                </Button>
                {pendingSyncData && pendingSyncData.syncable > 0 && (
                  <Button
                    onClick={() => syncPendingMutation.mutate()}
                    disabled={syncPendingMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {syncPendingMutation.isPending ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    일괄 동기화 ({pendingSyncData.syncable}명)
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 요약 통계 */}
            {pendingSyncData && (
              <div className="flex gap-4 mb-4 p-3 bg-zinc-800/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm">전체 미동기화:</span>
                  <span className="text-lg font-bold text-amber-400">
                    {pendingSyncData.total}명
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm">동기화 가능:</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {pendingSyncData.syncable}명
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm">매칭 불가:</span>
                  <span className="text-lg font-bold text-zinc-400">
                    {pendingSyncData.total - pendingSyncData.syncable}명
                  </span>
                </div>
              </div>
            )}

            {isLoadingPendingSync ? (
              <div className="text-center py-8 text-zinc-500">로딩 중...</div>
            ) : !pendingSyncData?.users ||
              pendingSyncData.users.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-zinc-400">미동기화 유저가 없습니다.</p>
                <p className="text-zinc-500 text-sm">
                  모든 유저가 정상 동기화되어 있습니다.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* 테이블 헤더 */}
                <div className="flex items-center px-4 py-2 mb-2 bg-zinc-800/30 rounded-lg text-xs text-zinc-500 font-medium">
                  <div className="w-20">ID</div>
                  <div className="flex-1 min-w-[120px]">V2 닉네임</div>
                  <div className="flex-1 min-w-[120px]">외부 닉네임</div>
                  <div className="w-24 text-center">HQ 매칭</div>
                  <div className="w-24 text-center">세그먼트</div>
                  <div className="w-32 text-right">총 충전</div>
                </div>

                {/* 유저 목록 */}
                {pendingSyncData.users.map((user) => (
                  <div
                    key={user.user_id}
                    className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                      user.hq_match.found
                        ? "bg-emerald-900/20 border border-emerald-800/30"
                        : "bg-zinc-800/50"
                    }`}
                  >
                    <div className="w-20 text-zinc-400 text-sm">
                      #{user.user_id}
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <span className="font-medium">{user.nickname}</span>
                      {user.telegram_username && (
                        <span className="text-xs text-zinc-500 ml-1">
                          @{user.telegram_username}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <span className="text-amber-400 font-medium">
                        {user.external_nickname}
                      </span>
                    </div>
                    <div className="w-24 text-center">
                      {user.hq_match.found ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          매칭됨
                        </Badge>
                      ) : (
                        <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/30">
                          <XCircle className="w-3 h-3 mr-1" />
                          없음
                        </Badge>
                      )}
                    </div>
                    <div className="w-24 text-center">
                      {user.hq_match.segment ? (
                        <Badge
                          className={getSegmentBadge(user.hq_match.segment)}
                        >
                          {user.hq_match.segment}
                        </Badge>
                      ) : (
                        <span className="text-zinc-600 text-xs">-</span>
                      )}
                    </div>
                    <div className="w-32 text-right">
                      {user.hq_match.total_charge != null ? (
                        <span className="text-emerald-400 font-medium">
                          {user.hq_match.total_charge.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-zinc-600">-</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
            {selectedProspect?.suggestions &&
              selectedProspect.suggestions.length > 0 && (
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

      {/* Edit External Nickname Dialog */}
      <Dialog
        open={isEditNicknameDialogOpen}
        onOpenChange={setIsEditNicknameDialogOpen}
      >
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-indigo-400" />
              외부 닉네임 수정
            </DialogTitle>
            <DialogDescription>
              유저 "{selectedLinkedUser?.nickname}"의 외부 닉네임을 수정합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400">현재 외부 닉네임</label>
              <div className="mt-1 px-3 py-2 bg-zinc-800 rounded text-amber-400">
                {selectedLinkedUser?.external_nickname}
              </div>
            </div>
            <div>
              <label className="text-sm text-zinc-400">새 외부 닉네임</label>
              <Input
                placeholder="정확한 CC 닉네임을 입력하세요..."
                value={editingNickname}
                onChange={(e) => setEditingNickname(e.target.value)}
                className="mt-2 bg-zinc-800 border-zinc-700"
              />
              <p className="text-xs text-zinc-500 mt-1">
                HQ 데이터의 닉네임과 정확히 일치해야 매칭됩니다.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditNicknameDialogOpen(false)}
              className="border-zinc-700"
            >
              취소
            </Button>
            <Button
              onClick={() => {
                if (selectedLinkedUser && editingNickname.trim()) {
                  updateNicknameMutation.mutate({
                    userId: selectedLinkedUser.id,
                    nickname: editingNickname.trim(),
                  });
                }
              }}
              disabled={
                updateNicknameMutation.isPending || !editingNickname.trim()
              }
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              수정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink Confirmation Dialog */}
      <Dialog open={isUnlinkDialogOpen} onOpenChange={setIsUnlinkDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              연결 해제 확인
            </DialogTitle>
            <DialogDescription>
              유저 "{selectedLinkedUser?.nickname}"의 외부 닉네임 연결을
              해제합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-sm text-red-300">
              <strong>주의:</strong> 연결을 해제하면 HQ 세그먼트 정보와 외부
              닉네임이 모두 삭제됩니다. 유저는 다시 미니앱에서 닉네임을 입력해야
              합니다.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUnlinkDialogOpen(false)}
              className="border-zinc-700"
            >
              취소
            </Button>
            <Button
              onClick={() => {
                if (selectedLinkedUser) {
                  unlinkMutation.mutate(selectedLinkedUser.id);
                }
              }}
              disabled={unlinkMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              연결 해제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
