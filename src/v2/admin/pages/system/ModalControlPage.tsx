import { Switch } from "../../../components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function ModalControlPage() {
  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">모달 제어 (Modal Control)</h1>
        <p className="text-sm text-zinc-400">사용자에게 노출되는 각종 모달의 활성 상태를 제어합니다.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-[#18181B] border-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-white">Welcome Modal</CardTitle>
                <Switch checked={true} />
            </CardHeader>
            <CardContent>
                <p className="text-xs text-zinc-500">Shows on first login</p>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
