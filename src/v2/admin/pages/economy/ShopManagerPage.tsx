import { Input } from "../../../components/ui/input";
import { Switch } from "../../../components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function ShopManagerPage() {
  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">상점 관리 (Shop Manager)</h1>
        <p className="text-sm text-zinc-400">판매 상품을 등록하고 진열 상태를 제어합니다.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-[#18181B] border-white/5">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">Premium Ticket</CardTitle>
                  <Switch checked={true} />
              </CardHeader>
              <CardContent>
                  <div className="text-2xl font-bold text-white">₩ 10,000</div>
                  <Input className="mt-4 bg-black/50 border-white/10" defaultValue="10000" />
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
