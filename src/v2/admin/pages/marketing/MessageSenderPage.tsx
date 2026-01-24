import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createV2AdminMessage,
  getAdminSegmentStats,
  type CreateMessageRequest,
} from "../../../api/adminApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Label } from "../../../components/ui/label";
import { Send, Users, AlertCircle, CheckCircle2 } from "lucide-react";

export default function MessageSenderPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetSegment, setTargetSegment] = useState("ALL");
  const [isSuccess, setIsSuccess] = useState(false);

  const { data: segmentStats } = useQuery({
    queryKey: ["segmentStats"],
    queryFn: getAdminSegmentStats,
  });

  const sendMutation = useMutation({
    mutationFn: (data: CreateMessageRequest) => createV2AdminMessage(data),
    onSuccess: () => {
      setIsSuccess(true);
      setTitle("");
      setBody("");
      setTimeout(() => setIsSuccess(false), 3000);
    },
  });

  const handleSend = () => {
    if (!title || !body) return;
    if (!confirm("정말 메시지를 발송하시겠습니까?")) return;

    sendMutation.mutate({
      title,
      body,
      targetSegment,
    });
  };

  const selectedSegmentStat = segmentStats?.segments.find(
    (s) => s.name === targetSegment,
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-white p-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-2">
          메시지 발송 (Message Sender)
        </h1>
        <p className="text-zinc-400">
          특정 세그먼트 또는 전체 유저에게 인박스(Inbox) 메시지를 발송합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-zinc-900 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">메시지 작성</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-400">수신 대상 (Target)</Label>
                <Select
                  value={targetSegment}
                  onValueChange={setTargetSegment}
                >
                  <SelectTrigger className="bg-black/20 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="ALL">전체 유저 (All Users)</SelectItem>
                    {segmentStats?.segments.map((seg) => (
                      <SelectItem key={seg.name} value={seg.name}>
                        {seg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSegmentStat && (
                  <p className="text-xs text-indigo-400 mt-1 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    예상 수신자: {selectedSegmentStat.count.toLocaleString()}명
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400">제목 (Title)</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="메시지 제목을 입력하세요"
                  className="bg-black/20 border-white/10"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400">내용 (Content)</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="메시지 본문을 입력하세요"
                  className="bg-black/20 border-white/10 min-h-[200px]"
                />
              </div>

              {isSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>메시지가 성공적으로 발송되었습니다.</span>
                </div>
              )}

              {sendMutation.isError && (
                 <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span>발송 실패: {sendMutation.error.message}</span>
                </div>
              )}

              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={handleSend}
                disabled={sendMutation.isPending || !title || !body}
              >
                {sendMutation.isPending ? (
                  "발송중..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    메시지 발송
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-zinc-900 border-white/10">
             <CardHeader>
              <CardTitle className="text-white text-sm">작성 가이드</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-zinc-400">
              <ul className="space-y-2 list-disc pl-4">
                <li>
                  <strong className="text-white">명확한 제목:</strong> 유저가 한눈에 알아볼 수 있는 제목을 사용하세요.
                </li>
                <li>
                  <strong className="text-white">대상 확인:</strong> 전체 발송 시 모든 유저에게 알림이 갈 수 있으니 주의하세요.
                </li>
                <li>
                  <strong className="text-white">이모지 활용:</strong> 적절한 이모지 사용은 주목도를 높입니다. 🎁 ✨
                </li>
              </ul>
            </CardContent>
          </Card>

           <Card className="bg-zinc-900 border-white/10">
             <CardHeader>
              <CardTitle className="text-white text-sm">세그먼트 현황</CardTitle>
              <CardDescription>실시간 타겟팅 모수</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
               {segmentStats?.segments.slice(0, 5).map(seg => (
                   <div key={seg.name} className="flex justify-between items-center text-sm">
                       <span className="text-zinc-400">{seg.label}</span>
                       <span className="font-mono text-white">{seg.count.toLocaleString()}</span>
                   </div>
               ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
