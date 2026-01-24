import { useMemo, useState } from "react";
import {
  useAdminMessages,
  useSendMessage,
} from "../../../hooks/useAdminMarketing";
import { useAdminSegmentStats } from "../../../hooks/useV2Admin";
import type { AdminMessageDto } from "../../../api/adminApi";
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
  const { data: messages = [] as AdminMessageDto[], isLoading } =
    useAdminMessages();
  const sendMutation = useSendMessage();
  const { data: segmentStats } = useAdminSegmentStats();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetSegment, setTargetSegment] = useState("ALL");

  const segmentOptions = useMemo(() => {
    const segments = segmentStats?.segments ?? [];
    // ?ˆì •?±ì„ ?„í•´ name ê¸°ì?, ë¹?ê°??œì™¸
    return segments
      .filter((s) => Boolean(s?.name))
      .map(
        (s) =>
          ({
            value: s.name,
            label: s.label || s.name,
            count: s.count,
          }) as { value: string; label: string; count: number },
      );
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

  const getStatusBadge = (status: AdminMessageDto["status"]) => {
    switch (status) {
      case "SENT":
        return (
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          >
            <CheckCircle2 className="w-3 h-3 mr-1" />
            ë°œì†¡?„ë£Œ
          </Badge>
        );
      case "SCHEDULED":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 text-blue-500 border-blue-500/20"
          >
            <Clock className="w-3 h-3 mr-1" />
            ?ˆì•½ì¤?
          </Badge>
        );
      default:
        return <Badge variant="secondary">?„ì‹œ?€??/Badge>;
    }
  };

  return (
    <div className="space-y-6 text-white p-6 h-full overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">
          ë©”ì‹œì§€ ë°œì†¡ (Message Sender)
        </h1>
        <p className="text-sm text-zinc-400">
          ? ì? ?¸ë°•??ë©”ì‹œì§€ë¥??„ì†¡?©ë‹ˆ??
        </p>
      </div>

      <div className="space-y-6">
        <Card className="bg-[#18181B] border-white/5">
          <CardHeader>
            <CardTitle>ë©”ì‹œì§€ ?‘ì„±</CardTitle>
            <CardDescription>
              ?¸ì‹œ ?Œë¦¼ ?ëŠ” ?¸ë°•??ë©”ì‹œì§€ë¥??‘ì„±?˜ì„¸??
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>?œëª©</Label>
              <Input
                placeholder="ë©”ì‹œì§€ ?œëª© ?…ë ¥"
                className="bg-black/50 border-white/10"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>?´ìš©</Label>
              <Textarea
                placeholder="ë©”ì‹œì§€ ?´ìš© ?…ë ¥ (ìµœë? 500??"
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
              <Label>ë°œì†¡ ?€??/Label>
              <Select value={targetSegment} onValueChange={setTargetSegment}>
                <SelectTrigger className="bg-black/50 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">?„ì²´ ? ì?</SelectItem>
                  {segmentOptions.map((seg) => (
                    <SelectItem key={seg.value} value={seg.value}>
                      {seg.label} ({seg.count.toLocaleString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-zinc-500">
                ?¸ê·¸ë¨¼íŠ¸ ëª©ë¡?€{" "}
                <span className="text-zinc-400">
                  /api/admin/segments/stats
                </span>{" "}
                ê¸°ì??…ë‹ˆ??
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={handleSend}
                disabled={!title || !content || sendMutation.isPending}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold"
              >
                <Send className="w-4 h-4 mr-2" />
                {sendMutation.isPending ? "ë°œì†¡ ì¤?.." : "ì¦‰ì‹œ ë°œì†¡"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card className="bg-[#18181B] border-white/5">
        <CardHeader>
          <CardTitle>ë°œì†¡ ?´ì—­</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead>?œëª©</TableHead>
                <TableHead>?€??/TableHead>
                <TableHead>?€??/TableHead>
                <TableHead>ë°œì†¡ ??/TableHead>
                <TableHead>?íƒœ</TableHead>
                <TableHead>?ì„±??/TableHead>
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
                    ë°œì†¡ ?´ì—­???†ìŠµ?ˆë‹¤.
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
