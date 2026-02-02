/**
 * 세그먼트 상세 페이지
 *
 * 특정 세그먼트에 속한 유저 목록을 표시하고 액션을 수행합니다.
 * - 유저 목록 (닉네임, 마진, 마지막 활동일 등)
 * - 세그먼트별 필터링/정렬
 * - 유저 상세 이동, 메시지 발송 액션
 */
import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getSegmentUsers,
  getAdminSegmentStats,
  type SegmentUserDto,
} from "../../../api/adminApi";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  ArrowLeft,
  RefreshCw,
  MessageSquare,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

// 세그먼트 메타데이터
const SEGMENT_META: Record<
  string,
  { label: string; color: string; bgClass: string; borderClass: string }
> = {
  NEW: {
    label: "신규(7일)",
    color: "text-rose-400",
    bgClass: "bg-rose-500/10",
    borderClass: "border-rose-500/20",
  },
  COMMON: {
    label: "일반",
    color: "text-zinc-300",
    bgClass: "bg-zinc-500/10",
    borderClass: "border-zinc-500/20",
  },
  VIP: {
    label: "VIP",
    color: "text-blue-400",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/20",
  },
  WHALE: {
    label: "고액(Whale)",
    color: "text-purple-400",
    bgClass: "bg-purple-500/10",
    borderClass: "border-purple-500/20",
  },
  AT_RISK: {
    label: "이탈 위험",
    color: "text-amber-400",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/20",
  },
};

export default function SegmentDetailPage() {
  const { segment } = useParams<{ segment: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const segmentKey = segment?.toUpperCase() || "COMMON";
  const meta = SEGMENT_META[segmentKey] || SEGMENT_META.COMMON;

  // 세그먼트 통계
  const { data: stats } = useQuery({
    queryKey: ["admin", "segments", "stats"],
    queryFn: getAdminSegmentStats,
  });

  // 유저 목록
  const {
    data: usersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["admin", "segment-users", segmentKey, page, limit],
    queryFn: () => getSegmentUsers(segmentKey, page, limit),
    enabled: !!segmentKey,
  });

  const segmentStats = stats?.segments?.find((s) => s.name === segmentKey);
  const totalPages = usersData ? Math.ceil(usersData.total / limit) : 1;

  const formatLastActivity = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: ko,
      });
    } catch {
      return "-";
    }
  };

  const formatCurrency = (amount: number) => {
    return `₩${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6 p-6 pb-20 max-w-[1600px] mx-auto text-white">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{meta.label} 유저</h1>
            <Badge
              variant="outline"
              className={`${meta.bgClass} ${meta.borderClass} ${meta.color}`}
            >
              {segmentKey}
            </Badge>
          </div>
          <p className="text-zinc-400 text-sm">
            {segmentStats?.desc || "세그먼트별 유저 목록"}
          </p>
        </div>
        <Button
          variant="outline"
          className="border-white/10 hover:bg-white/5"
          onClick={() => refetch()}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={`${meta.bgClass} ${meta.borderClass} border`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-400">총 유저 수</p>
                <p className="text-2xl font-bold text-white">
                  {usersData?.total.toLocaleString() ?? "-"}
                </p>
              </div>
              <Users className={`h-8 w-8 ${meta.color} opacity-50`} />
            </div>
          </CardContent>
        </Card>

        {/* 다른 세그먼트 바로가기 */}
        {Object.entries(SEGMENT_META)
          .filter(([key]) => key !== segmentKey)
          .slice(0, 3)
          .map(([key, m]) => {
            const segCount =
              stats?.segments?.find((s) => s.name === key)?.count ?? 0;
            return (
              <Link key={key} to={`/admin/segments/${key.toLowerCase()}`}>
                <Card
                  className={`${m.bgClass} ${m.borderClass} border hover:opacity-80 transition-opacity cursor-pointer`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-zinc-400">{m.label}</p>
                        <p className="text-lg font-semibold text-white">
                          {segCount.toLocaleString()}
                        </p>
                      </div>
                      <ExternalLink className={`h-4 w-4 ${m.color} opacity-50`} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
      </div>

      {/* User Table */}
      <Card className="bg-zinc-900 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white">유저 목록</CardTitle>
            <CardDescription>
              {meta.label} 세그먼트에 속한 유저 ({usersData?.total ?? 0}명)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">표시 개수:</span>
            <Select
              value={String(limit)}
              onValueChange={(v) => {
                setLimit(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[100px] bg-black/20 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : usersData?.users && usersData.users.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-zinc-400">ID</TableHead>
                    <TableHead className="text-zinc-400">닉네임</TableHead>
                    <TableHead className="text-zinc-400">총 마진</TableHead>
                    <TableHead className="text-zinc-400">총 충전</TableHead>
                    <TableHead className="text-zinc-400">마지막 활동</TableHead>
                    <TableHead className="text-zinc-400">가입일</TableHead>
                    <TableHead className="text-zinc-400 text-right">
                      액션
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersData.users.map((user: SegmentUserDto) => (
                    <TableRow
                      key={user.userId}
                      className="border-white/5 hover:bg-white/5"
                    >
                      <TableCell className="font-mono text-sm text-zinc-300">
                        {user.userId}
                      </TableCell>
                      <TableCell className="font-medium text-white">
                        {user.nickname || `User#${user.userId}`}
                      </TableCell>
                      <TableCell
                        className={
                          user.totalMargin >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {formatCurrency(user.totalMargin)}
                      </TableCell>
                      <TableCell className="text-blue-400">
                        {formatCurrency(user.totalCharge)}
                      </TableCell>
                      <TableCell className="text-zinc-400 text-sm">
                        {formatLastActivity(user.lastActivityAt)}
                      </TableCell>
                      <TableCell className="text-zinc-500 text-sm">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-white"
                            onClick={() =>
                              navigate(`/admin/users/${user.userId}`)
                            }
                            title="상세 보기"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-zinc-400 hover:text-blue-400"
                            title="메시지 발송"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <p className="text-sm text-zinc-400">
                  총 {usersData.total.toLocaleString()}명 중{" "}
                  {(page - 1) * limit + 1}~
                  {Math.min(page * limit, usersData.total)}명 표시
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="border-white/10 hover:bg-white/5 disabled:opacity-30"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    이전
                  </Button>
                  <span className="text-sm text-zinc-400 px-2">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="border-white/10 hover:bg-white/5 disabled:opacity-30"
                  >
                    다음
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <Users className="h-12 w-12 mb-4 opacity-30" />
              <p>해당 세그먼트에 유저가 없습니다</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
