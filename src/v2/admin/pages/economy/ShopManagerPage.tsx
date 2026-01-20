import { Input } from "../../../components/ui/input";
import { Switch } from "../../../components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { 
    useAdminProducts, 
    useAdminUpdateProductStatus, 
    useAdminUpdateProductPrice,
    useExchangeRates,
    useUpdateExchangeRate
} from "../../../hooks/useV2Admin";
import { Skeleton } from "../../../components/ui/skeleton";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { RefreshCw, ArrowRightLeft } from "lucide-react";
import type { AdminProductDto, ExchangeRateDto } from "../../../api/adminApi";
import React from "react";

export default function ShopManagerPage() {
  const { data: products = [], isLoading: isProductsLoading } = useAdminProducts();
  const { data: rates = [], isLoading: isRatesLoading } = useExchangeRates();
  
  const statusMutation = useAdminUpdateProductStatus();
  const priceMutation = useAdminUpdateProductPrice();
  const rateMutation = useUpdateExchangeRate();

  const handleStatusChange = (id: number, checked: boolean) => {
    statusMutation.mutate({ id, isVisible: checked });
  };

  const handlePriceChange = (id: number, price: string) => {
      const numPrice = parseInt(price);
      if(!isNaN(numPrice)) {
          priceMutation.mutate({ id, price: numPrice });
      }
  };
  
  const handleRateUpdate = (id: string, rate: string) => {
      const numRate = parseFloat(rate);
      if (!isNaN(numRate)) {
          rateMutation.mutate({ id, rate: numRate });
      }
  };

  if (isProductsLoading || isRatesLoading) {
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
    <div className="space-y-8 text-white p-6 h-full overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">상점 관리 (Shop Manager)</h1>
        <p className="text-sm text-zinc-400">판매 상품을 등록하고 교환소 비율을 관리합니다.</p>
      </div>
      
      {/* Exchange Rate Section */}
      <section className="space-y-4">
          <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-zinc-200">Exchange Editor</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rates && rates.length > 0 ? (
                  rates.map((rate: ExchangeRateDto) => (
                    <Card key={rate.id} className="bg-[#18181B] border-white/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <RefreshCw className="w-16 h-16" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-zinc-400">
                                {rate.source} <span className="text-zinc-600">to</span> {rate.target}
                            </CardTitle>
                            <CardDescription className="text-xs text-zinc-500">
                                Last updated: {rate.updatedAt}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2">
                                <div className="flex-1 space-y-1">
                                    <label className="text-xs font-medium text-zinc-500">Rate</label>
                                    <Input 
                                        className="bg-black/50 border-white/10 text-lg font-bold h-10" 
                                        defaultValue={rate.rate}
                                        onBlur={(e) => handleRateUpdate(rate.id, e.target.value)}
                                    />
                                </div>
                                <div className="pb-2 text-zinc-500 text-sm font-mono">= 1 {rate.source}</div>
                            </div>
                        </CardContent>
                    </Card>
                  ))
              ) : (
                  <div className="col-span-full py-10 text-center text-zinc-500 border border-dashed border-white/10 rounded-xl">
                      환율 정보가 없습니다. Mock 데이터를 확인해주세요.
                  </div>
              )}
          </div>
      </section>

      {/* Product List Section */}
      <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-200">Product List</h2>
            <Button variant="outline" size="sm" className="h-8 gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300">
                <RefreshCw className="w-3 h-3" /> Sync Products
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {products.map((product: AdminProductDto) => (
                 <Card key={product.id} className="bg-[#18181B] border-white/5 transition-all hover:border-white/10 group">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="flex flex-col gap-1">
                            <CardTitle className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">{product.name}</CardTitle>
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
                        <div className="text-2xl font-bold text-white mb-4">₩ {(product.price || 0).toLocaleString()}</div>
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
      </section>
    </div>
  );
}
