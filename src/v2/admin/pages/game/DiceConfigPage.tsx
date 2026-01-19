import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";

export default function DiceConfigPage() {
  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">주사위 설정 (Dice Config)</h1>
        <p className="text-sm text-zinc-400">주사위 게임의 승률 및 배율을 조절합니다.</p>
      </div>

       <div className="grid gap-4 md:grid-cols-2">
         <Card className="bg-[#18181B] border-white/5">
            <CardHeader><CardTitle className="text-white">Win Multiplier</CardTitle></CardHeader>
            <CardContent>
                <Input className="bg-black/50 border-white/10" defaultValue="1.95" />
            </CardContent>
         </Card>
       </div>
    </div>
  );
}
