import { useState } from "react";
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../components/ui/collapsible";

import { useAdminAuditLogs } from "../../../hooks/useAdminGame";

// Action type color mapping
const ACTION_COLORS: Record<string, string> = {
  NUDGE_SEND: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ROI_CALCULATE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ROLLBACK_EXECUTE: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  MISSION_RESET: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  MISSION_RESET_ALL: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  STREAK_RESET: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  STREAK_SET_COUNT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  MILESTONE_FORCE_GRANT:
    "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  MILESTONE_DISTRIBUTE: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  STOCK_ADJUST: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  TICKET_GRANT: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  ITEM_LOG_CREATE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

// Category options
const CATEGORY_OPTIONS = [
  { value: "", label: "전체 카테고리" },
  { value: "GOLDEN", label: "골든" },
  { value: "USER", label: "유저" },
  { value: "MISSION", label: "미션" },
  { value: "STREAK", label: "스트릭" },
  { value: "INVENTORY", label: "인벤토리" },
  { value: "ECONOMY", label: "경제" },
  { value: "BATCH", label: "배치" },
];

// Action options
const ACTION_OPTIONS = [
  { value: "", label: "전체 액션" },
  { value: "NUDGE_SEND", label: "넛지 발송" },
  { value: "ROI_CALCULATE", label: "ROI 계산" },
  { value: "ROLLBACK_EXECUTE", label: "롤백 실행" },
  { value: "MISSION_RESET", label: "미션 리셋" },
  { value: "MISSION_RESET_ALL", label: "전체 미션 리셋" },
  { value: "STREAK_RESET", label: "스트릭 리셋" },
  { value: "STREAK_SET_COUNT", label: "스트릭 설정" },
  { value: "MILESTONE_FORCE_GRANT", label: "마일스톤 강제 지급" },
  { value: "MILESTONE_DISTRIBUTE", label: "마일스톤 배포" },
  { value: "STOCK_ADJUST", label: "재고 조정" },
  { value: "TICKET_GRANT", label: "티켓 지급" },
];

export default function AuditLogPage() {
  const formatKst = (value: string | Date) =>
    new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const [actionFilter, setActionFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const {
    data: auditData,
    isLoading,
    refetch,
  } = useAdminAuditLogs({
    action_filter: actionFilter || undefined,
    category_filter: categoryFilter || undefined,
    limit,
    offset,
  });

  const toggleExpand = (logId: number) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const getActionBadgeClass = (action: string) => {
    return (
      ACTION_COLORS[action] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
    );
  };

  const handleNextPage = () => {
    setOffset((prev) => prev + limit);
  };

  const handlePrevPage = () => {
    setOffset((prev) => Math.max(0, prev - limit));
  };

  return (
    <div className="space-y-6 min-h-screen p-6 text-white pb-20">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-indigo-400" />
            감사 로그
          </h1>
          <p className="text-zinc-400">관리자 액션 기록을 조회합니다.</p>
        </div>
        <Button
          variant="outline"
          className="border-white/10 text-white hover:bg-white/10"
          onClick={() => refetch()}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-zinc-900 border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-white flex items-center gap-2">
            <Filter className="w-5 h-5" />
            필터
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-zinc-400 mb-1 block">
                카테고리
              </label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-black/20 border-white/10">
                  <SelectValue placeholder="전체 카테고리" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-zinc-400 mb-1 block">액션</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="bg-black/20 border-white/10">
                  <SelectValue placeholder="전체 액션" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  {ACTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-[100px]">
              <label className="text-xs text-zinc-400 mb-1 block">
                표시 개수
              </label>
              <Select
                value={String(limit)}
                onValueChange={(v) => setLimit(Number(v))}
              >
                <SelectTrigger className="bg-black/20 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log List */}
      <Card className="bg-zinc-900 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">로그 목록</CardTitle>
          <CardDescription className="text-zinc-400">
            총 {auditData?.total ?? 0}건 중 {offset + 1} ~{" "}
            {Math.min(offset + limit, auditData?.total ?? 0)}건 표시
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-20 text-zinc-500">로딩중...</div>
          ) : !auditData?.logs?.length ? (
            <div className="text-center py-20 text-zinc-500">
              로그가 없습니다.
            </div>
          ) : (
            <div className="space-y-2">
              {auditData.logs.map((log) => (
                <Collapsible
                  key={log.id}
                  open={expandedLogs.has(log.id)}
                  onOpenChange={() => toggleExpand(log.id)}
                >
                  <div className="border border-white/5 rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-4 hover:bg-white/5 cursor-pointer">
                        <div className="flex items-center gap-4">
                          {expandedLogs.has(log.id) ? (
                            <ChevronDown className="w-4 h-4 text-zinc-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-zinc-500" />
                          )}
                          <Badge
                            variant="outline"
                            className={getActionBadgeClass(log.action)}
                          >
                            {log.action}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-zinc-500/30 text-zinc-400"
                          >
                            {log.category}
                          </Badge>
                          {log.target_id && (
                            <span className="text-sm text-zinc-400">
                              대상: {log.target_id}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-zinc-500">
                            Admin #{log.admin_id}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {formatKst(log.created_at)} KST
                          </span>
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 pt-0 border-t border-white/5">
                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                          {log.before_data && (
                            <div>
                              <h4 className="text-xs text-zinc-400 mb-2">
                                변경 전
                              </h4>
                              <pre className="bg-black/30 rounded-lg p-3 text-xs text-zinc-300 overflow-auto max-h-[200px]">
                                {JSON.stringify(log.before_data, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.after_data && (
                            <div>
                              <h4 className="text-xs text-zinc-400 mb-2">
                                변경 후
                              </h4>
                              <pre className="bg-black/30 rounded-lg p-3 text-xs text-zinc-300 overflow-auto max-h-[200px]">
                                {JSON.stringify(log.after_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}

          {/* Pagination */}
          {auditData && auditData.total > limit && (
            <div className="flex justify-center gap-4 mt-6">
              <Button
                variant="outline"
                className="border-white/10"
                onClick={handlePrevPage}
                disabled={offset === 0}
              >
                이전
              </Button>
              <Button
                variant="outline"
                className="border-white/10"
                onClick={handleNextPage}
                disabled={offset + limit >= auditData.total}
              >
                다음
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
