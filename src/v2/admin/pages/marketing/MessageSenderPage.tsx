import { useMemo, useState } from "react";
import {
  useAdminMessages,
  useSendMessage,
} from "../../../hooks/useAdminMarketing";
import { useAdminSegmentStats } from "../../../hooks/useV2Admin";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Textarea } from "../../../components/ui/textarea";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Label } from "../../../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { Send, Clock, CheckCircle2 } from "lucide-react";

export default function MessageSenderPage() {
  const { data: messages = [], isLoading } = useAdminMessages();
  const sendMutation = useSendMessage();
  const { data: segmentStats } = useAdminSegmentStats();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetSegment, setTargetSegment] = useState("ALL");

  const segmentOptions = useMemo(() => {
    const segments = segmentStats?.segments ?? [];
    // 안정성을 위해 name 기준, 빈 값 제외
    return segments
      .filter((s) => Boolean(s?.name))
      .map((s) => ({
        value: s.name,
        label: s.label || s.name,
        count: s.count,
      }));
  }, [segmentStats?.segments]);

  const handleSend = () => {
    if (!title || !content) return;

    sendMutation.mutate(
      {
        title,
        content,
        targetSegment,
      },
      {
        onSuccess: () => {
          setTitle("");
          setContent("");
          setTargetSegment("ALL");
        },
      },
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            발송완료
          </Badge>
        );
      case "SCHEDULED":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-500 border-blue-500/20"
          >
            <Clock className="w-3 h-3 mr-1" />
            예약중
          </Badge>
        );
      default:
        return <Badge variant="secondary">임시저장</Badge>;
    }
  };

  return (
    <div className="space-y-6 text-white p-6 h-full overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">
          메시지 발송 (Message Sender)
        </h1>
        <p className="text-sm text-zinc-400">
          유저 인박스 메시지를 전송합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Form */}
        <div className="lg:col-span-2">
          <Card className="bg-[#18181B] border-white/5">
            <CardHeader>
              <CardTitle>메시지 작성</CardTitle>
              <CardDescription>
                푸시 알림 또는 인박스 메시지를 작성하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>제목</Label>
                <Input
                  placeholder="메시지 제목 입력"
                  className="bg-black/50 border-white/10"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>내용</Label>
                <Textarea
                  placeholder="메시지 내용 입력 (최대 500자)"
                  className="bg-black/50 border-white/10 min-h-[150px] resize-none"
                  maxLength={500}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <div className="text-xs text-zinc-500 text-right">
                  {content.length}/500
                </div>
              </div>

              <div className="space-y-2">
                <Label>발송 대상</Label>
                <Select value={targetSegment} onValueChange={setTargetSegment}>
                  <SelectTrigger className="bg-black/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">전체 유저</SelectItem>
                    {segmentOptions.map((seg) => (
                      <SelectItem key={seg.value} value={seg.value}>
                        {seg.label} ({seg.count.toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-zinc-500">
                  세그먼트 목록은{" "}
                  <span className="text-zinc-400">
                    /api/v2/admin/segments/stats
                  </span>{" "}
                  기준입니다.
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={handleSend}
                  disabled={!title || !content || sendMutation.isPending}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {sendMutation.isPending ? "발송 중..." : "즉시 발송"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Column */}
        <div className="space-y-6">
          <Card className="bg-[#18181B] border-white/5">
            <CardHeader>
              <CardTitle className="text-base">발송 통계</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">오늘 발송</span>
                <span className="text-2xl font-bold text-emerald-400">
                  1,240
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">이번 주</span>
                <span className="text-lg font-semibold">5,420</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-zinc-400">열람률</span>
                <span className="text-lg font-semibold text-blue-400">
                  68.5%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#18181B] border-white/5">
            <CardHeader>
              <CardTitle className="text-base">주의사항</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-zinc-400 space-y-2">
              <p>• 푸시 알림은 OS 설정에 따라 차단될 수 있습니다.</p>
              <p>
                • 스팸 방지를 위해 동일 유저에게 1시간 내 3회 이상 발송
                불가합니다.
              </p>
              <p>• 예약 발송은 최대 7일까지 가능합니다.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* History Table */}
      <Card className="bg-[#18181B] border-white/5">
        <CardHeader>
          <CardTitle>발송 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead>제목</TableHead>
                <TableHead>대상</TableHead>
                <TableHead>타입</TableHead>
                <TableHead>발송 수</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>생성일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-zinc-500"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : messages.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-10 text-zinc-500"
                  >
                    발송 내역이 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                messages.map((msg) => (
                  <TableRow
                    key={msg.id}
                    className="border-white/5 hover:bg-white/5"
                  >
                    <TableCell className="font-medium">{msg.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-zinc-800 border-zinc-700"
                      >
                        {msg.targetSegment}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400">
                      {msg.messageType}
                    </TableCell>
                    <TableCell className="text-emerald-400 font-semibold">
                      {msg.sentCount.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(msg.status)}</TableCell>
                    <TableCell className="text-zinc-500 text-xs">
                      {msg.createdAt}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
