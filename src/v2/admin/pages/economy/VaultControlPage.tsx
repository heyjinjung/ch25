import { Card } from "../../../components/ui/card";
import { Slider } from "../../../components/ui/slider";

export default function VaultControlPage() {
  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">금고 제어 (Vault Control)</h1>
        <p className="text-sm text-zinc-400">출금 승인 및 금고 보안 상태를 관리합니다.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="bg-[#18181B] border-white/5 p-6">
              <h3 className="text-lg font-bold mb-4">Pending Requests</h3>
              <div className="space-y-4">
                  {/* Mock Item */}
                  <div className="p-4 rounded-lg bg-zinc-900 border border-white/5 flex flex-col gap-3">
                      <div className="flex justify-between">
                          <span className="font-bold">User #1234</span>
                          <span className="text-emerald-400">₩ 50,000</span>
                      </div>
                      <Slider defaultValue={[0]} max={100} step={1} className="w-full" />
                      <p className="text-xs text-center text-zinc-500">Slide to Approve</p>
                  </div>
              </div>
          </Card>
      </div>
    </div>
  );
}
