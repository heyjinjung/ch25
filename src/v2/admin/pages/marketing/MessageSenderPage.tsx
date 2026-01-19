import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function MessageSenderPage() {
  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">메시지 발송 (Message Sender)</h1>
        <p className="text-sm text-zinc-400">전체 또는 특정 대상에게 인게임 메시지를 발송합니다.</p>
      </div>

      <Card className="bg-[#18181B] border-white/5 max-w-2xl">
        <CardHeader>
            <CardTitle className="text-white">Compose Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <Input placeholder="Title" className="bg-black/50 border-white/10" />
            <Textarea placeholder="Type your message here." className="bg-black/50 border-white/10 min-h-[150px]" />
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">Send Message</Button>
        </CardContent>
      </Card>
    </div>
  );
}
