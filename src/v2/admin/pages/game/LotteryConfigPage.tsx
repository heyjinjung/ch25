import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Textarea } from "../../../components/ui/textarea";

export default function LotteryConfigPage() {
  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">로또 설정 (Lottery Config)</h1>
        <p className="text-sm text-zinc-400">회차별 당첨 번호 및 상금을 관리합니다.</p>
      </div>

      <Card className="bg-[#18181B] border-white/5">
        <CardHeader><CardTitle className="text-white">Winning Numbers</CardTitle></CardHeader>
         <CardContent>
            <Textarea className="bg-black/50 border-white/10" placeholder="Enter comma separated numbers" />
         </CardContent>
      </Card>
    </div>
  );
}
