import { Input } from "../../../components/ui/input";
import { Switch } from "../../../components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { useAdminProducts, useAdminUpdateProductStatus, useAdminUpdateProductPrice } from "../../../hooks/useAdminEconomy";
import { Skeleton } from "../../../components/ui/skeleton";
import { Badge } from "../../../components/ui/badge";
import type { AdminProductDto } from "../../../api/adminApi";

export default function ShopManagerPage() {
  const { data: products = [], isLoading } = useAdminProducts();
  const statusMutation = useAdminUpdateProductStatus();
  const priceMutation = useAdminUpdateProductPrice();

  const handleStatusChange = (id: number, checked: boolean) => {
    statusMutation.mutate({ id, isVisible: checked });
  };

  const handlePriceChange = (id: number, price: string) => {
      const numPrice = parseInt(price);
      if(!isNaN(numPrice)) {
          priceMutation.mutate({ id, price: numPrice });
      }
  };

  if (isLoading) {
      return (
          <div className="p-6 space-y-6">
              <Skeleton className="h-8 w-64 bg-zinc-800" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 bg-zinc-800 rounded-xl" />)}
              </div>
          </div>
      )
  }

  return (
    <div className="space-y-6 text-white p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">상점 관리 (Shop Manager)</h1>
        <p className="text-sm text-zinc-400">판매 상품을 등록하고 진열 상태를 제어합니다.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product: AdminProductDto) => (
             <Card key={product.id} className="bg-[#18181B] border-white/5 transition-all hover:border-white/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="flex flex-col gap-1">
                        <CardTitle className="text-sm font-medium text-zinc-400">{product.name}</CardTitle>
                        <Badge variant="outline" className="w-fit text-[10px] h-5 bg-white/5 text-zinc-500 border-white/5">
                            {product.sku}
                        </Badge>
                    </div>
                    <Switch 
                        checked={product.isVisible} 
                        onCheckedChange={(checked: boolean) => handleStatusChange(product.id, checked)}
                    />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-white mb-4">₩ {product.price.toLocaleString()}</div>
                    <div className="relative">
                        <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">₩</span>
                        <Input 
                            className="bg-black/50 border-white/10 pl-8" 
                            defaultValue={product.price}
                            onBlur={(e: React.FocusEvent<HTMLInputElement>) => handlePriceChange(product.id, e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>
          ))}
          {/* Add New Placeholder */}
          <Card className="bg-[#18181B]/50 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/5 hover:border-white/20 h-[190px]">
               <div className="text-zinc-500 text-sm font-medium">+ New Product</div>
          </Card>
      </div>
    </div>
  );
}
