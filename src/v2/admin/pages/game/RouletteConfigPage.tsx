import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";

export default function RouletteConfigPage() {
  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">룰렛 설정 (Roulette Config)</h1>
        <p className="text-sm text-zinc-400">룰렛 당첨 확률 및 보상을 설정합니다.</p>
      </div>

      <Card className="bg-[#18181B] border-white/5">
          <CardHeader>
              <CardTitle className="text-white">Segment Probabilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
               <div className="flex justify-between items-center bg-zinc-900/50 p-2 rounded">
                  <span className="text-zinc-300">Gold Segment</span>
                  <Input className="w-24 bg-black/50 border-white/10 text-right" defaultValue="1.5" />
               </div>
          </CardContent>
      </Card>
    </div>
  );
}
