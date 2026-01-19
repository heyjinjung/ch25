import { Input } from "../../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function LevelConfigPage() {
  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">레벨 설정 (Level Config)</h1>
        <p className="text-sm text-zinc-400">경험치 테이블 및 레벨별 혜택을 설정합니다.</p>
      </div>

      <Card className="bg-[#18181B] border-white/5">
        <CardHeader>
            <CardTitle className="text-white">XP Table</CardTitle>
        </CardHeader>
        <CardContent>
             <div className="flex items-center space-x-4 mb-2">
                <span className="w-16 text-zinc-400">Level 1</span>
                <Input defaultValue="0" className="w-32 bg-black/50 border-white/10" disabled />
                <span className="text-zinc-500">XP</span>
             </div>
             <div className="flex items-center space-x-4">
                <span className="w-16 text-zinc-400">Level 2</span>
                <Input defaultValue="1000" className="w-32 bg-black/50 border-white/10" />
                <span className="text-zinc-500">XP</span>
             </div>
        </CardContent>
      </Card>
    </div>
  );
}
