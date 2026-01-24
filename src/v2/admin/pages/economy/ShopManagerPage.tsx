import { Input } from "../../../components/ui/input";
import { Switch } from "../../../components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Label } from "../../../components/ui/label";
import {
  useAdminProducts,
  useAdminUpdateProductPrice,
  useAdminUpdateProductStatus,
  useExchangeRates,
  useSyncAdminProducts,
  useUpdateExchangeRate,
} from "../../../hooks/useV2Admin";
import { useAdminDeleteProduct, useAdminCreateProduct, useAdminUpdateProduct } from "../../../hooks/useAdminShop";
import { Skeleton } from "../../../components/ui/skeleton";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { RefreshCw, ArrowRightLeft, Trash2, Plus, Edit } from "lucide-react";
import type { AdminProductDto, ExchangeRateDto } from "../../../api/adminApi";
import { SOT_REWARD_TYPES } from "../../../constants/rewardTypes";
import { useState } from "react";

export default function ShopManagerPage() {
  const { data: products = [], isLoading: isProductsLoading } =
    useAdminProducts();
  const { data: rates = [], isLoading: isRatesLoading } = useExchangeRates();

  const statusMutation = useAdminUpdateProductStatus();
  const priceMutation = useAdminUpdateProductPrice();
  const syncMutation = useSyncAdminProducts();
  const rateMutation = useUpdateExchangeRate();
  const deleteMutation = useAdminDeleteProduct();
  const createMutation = useAdminCreateProduct();
  const updateMutation = useAdminUpdateProduct();

  // Dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProductDto | null>(null);
  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    cost_type: "VAULT",
    cost_amount: 100,
    reward_type: "ROULETTE_TICKET",
    reward_amount: 1,
    is_visible: true,
  });

  const handleStatusChange = (id: number, checked: boolean) => {
    statusMutation.mutate({ id, isVisible: checked });
  };

  const handlePriceChange = (id: number, price: string) => {
    const numPrice = parseInt(price);
    if (!isNaN(numPrice)) {
      priceMutation.mutate({ id, price: numPrice });
    }
  };

  const handleRateUpdate = (id: string, rate: string) => {
    const numRate = parseFloat(rate);
    if (!isNaN(numRate)) {
      rateMutation.mutate({ id, rate: numRate });
    }
  };

  const handleDelete = (productId: number, productName: string) => {
    if (confirm(`"${productName}" 상품을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(productId);
    }
  };

  const handleCreate = () => {
    createMutation.mutate(formData, {
      onSuccess: () => {
        setIsCreateOpen(false);
        setFormData({
          sku: "",
          name: "",
          cost_type: "VAULT",
          cost_amount: 100,
          reward_type: "ROULETTE_TICKET",
          reward_amount: 1,
          is_visible: true,
        });
      },
    });
  };

  const handleEditClick = (product: AdminProductDto) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      cost_type: product.costType,
      cost_amount: product.costAmount,
      reward_type: product.rewardType,
      reward_amount: product.rewardAmount,
      is_visible: product.isVisible,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingProduct) return;
    updateMutation.mutate(
      {
        productId: editingProduct.id,
        data: {
          name: formData.name,
          cost_type: formData.cost_type,
          cost_amount: formData.cost_amount,
          reward_type: formData.reward_type,
          reward_amount: formData.reward_amount,
          is_visible: formData.is_visible,
        },
      },
      {
        onSuccess: () => {
          setIsEditOpen(false);
          setEditingProduct(null);
        },
      }
    );
  };

  if (isProductsLoading || isRatesLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64 bg-zinc-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 bg-zinc-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 text-white p-6 h-full overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">
          상점 관리 (Shop Manager)
        </h1>
        <p className="text-sm text-zinc-400">
          판매 상품을 등록하고 교환소 비율을 관리합니다.
        </p>
      </div>

      {/* Exchange Rate Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-zinc-400" />
          <h2 className="text-lg font-semibold text-zinc-200">
            Exchange Editor
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rates && rates.length > 0 ? (
            rates.map((rate: ExchangeRateDto) => (
              <Card
                key={rate.id}
                className="bg-[#18181B] border-white/5 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <RefreshCw className="w-16 h-16" />
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-zinc-400">
                    {rate.source} <span className="text-zinc-600">to</span>{" "}
                    {rate.target}
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    Last updated: {rate.updatedAt}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium text-zinc-500">
                        Rate
                      </label>
                      <Input
                        className="bg-black/50 border-white/10 text-lg font-bold h-10"
                        defaultValue={rate.rate}
                        onBlur={(e) =>
                          handleRateUpdate(rate.id, e.target.value)
                        }
                      />
                    </div>
                    <div className="pb-2 text-zinc-500 text-sm font-mono">
                      = 1 {rate.source}
                    </div>
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
          <Button
            variant="outline"
            size="sm"
            disabled={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
            className="h-8 gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300"
          >
            <RefreshCw className="w-3 h-3" /> Sync Products
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product: AdminProductDto) => (
            <Card
              key={product.id}
              className="bg-[#18181B] border-white/5 transition-all hover:border-white/10 group"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-sm font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    {product.name}
                  </CardTitle>
                  <Badge
                    variant="outline"
                    className="w-fit text-[10px] h-5 bg-white/5 text-zinc-500 border-white/5"
                  >
                    {product.sku}
                  </Badge>
                </div>
                <Switch
                  checked={product.isVisible}
                  onCheckedChange={(checked: boolean) =>
                    handleStatusChange(product.id, checked)
                  }
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-4">
                  ₩ {(product.costAmount || 0).toLocaleString()}
                </div>
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">
                      ₩
                    </span>
                    <Input
                      className="bg-black/50 border-white/10 pl-8"
                      defaultValue={product.costAmount}
                      onChange={(e) =>
                        handlePriceChange(product.id, e.target.value)
                      }
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/30"
                      onClick={() => handleEditClick(product)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                      onClick={() => handleDelete(product.id, product.name)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {/* Create Product Button */}
          <Card
            className="bg-[#18181B]/50 border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/5 hover:border-white/20 h-[190px]"
            onClick={() => setIsCreateOpen(true)}
          >
            <div className="flex flex-col items-center gap-2 text-zinc-500">
              <Plus className="w-8 h-8" />
              <span className="text-sm font-medium">New Product</span>
            </div>
          </Card>
        </div>
      </section>

      {/* Create Product Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>새 상품 생성</DialogTitle>
            <DialogDescription className="text-zinc-400">
              20개 SoT 재화를 활용한 교환 상품을 추가합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="bg-black/50 border-white/10"
                  placeholder="PRODUCT_001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">상품명 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-black/50 border-white/10"
                  placeholder="특별 상품"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>결제 재화 (Cost Type) *</Label>
                <Select
                  value={formData.cost_type}
                  onValueChange={(value) => setFormData({ ...formData, cost_type: value })}
                >
                  <SelectTrigger className="bg-black/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {Object.values(SOT_REWARD_TYPES).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost_amount">결제 수량 *</Label>
                <Input
                  id="cost_amount"
                  type="number"
                  value={formData.cost_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, cost_amount: parseInt(e.target.value) || 0 })
                  }
                  className="bg-black/50 border-white/10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>획득 재화 (Reward Type) *</Label>
                <Select
                  value={formData.reward_type}
                  onValueChange={(value) => setFormData({ ...formData, reward_type: value })}
                >
                  <SelectTrigger className="bg-black/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {Object.values(SOT_REWARD_TYPES).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reward_amount">획득 수량 *</Label>
                <Input
                  id="reward_amount"
                  type="number"
                  value={formData.reward_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, reward_amount: parseInt(e.target.value) || 0 })
                  }
                  className="bg-black/50 border-white/10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateOpen(false)}
              className="border-white/10 hover:bg-white/5"
            >
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !formData.sku || !formData.name}
              className="bg-blue-600 hover:bg-blue-700"
            >
              생성
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle>상품 수정</DialogTitle>
            <DialogDescription className="text-zinc-400">
              SKU: {editingProduct?.sku}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_name">상품명 *</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-black/50 border-white/10"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>결제 재화 (Cost Type) *</Label>
                <Select
                  value={formData.cost_type}
                  onValueChange={(value) => setFormData({ ...formData, cost_type: value })}
                >
                  <SelectTrigger className="bg-black/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {Object.values(SOT_REWARD_TYPES).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_cost_amount">결제 수량 *</Label>
                <Input
                  id="edit_cost_amount"
                  type="number"
                  value={formData.cost_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, cost_amount: parseInt(e.target.value) || 0 })
                  }
                  className="bg-black/50 border-white/10"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>획득 재화 (Reward Type) *</Label>
                <Select
                  value={formData.reward_type}
                  onValueChange={(value) => setFormData({ ...formData, reward_type: value })}
                >
                  <SelectTrigger className="bg-black/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    {Object.values(SOT_REWARD_TYPES).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_reward_amount">획득 수량 *</Label>
                <Input
                  id="edit_reward_amount"
                  type="number"
                  value={formData.reward_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, reward_amount: parseInt(e.target.value) || 0 })
                  }
                  className="bg-black/50 border-white/10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              className="border-white/10 hover:bg-white/5"
            >
              취소
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending || !formData.name}
              className="bg-blue-600 hover:bg-blue-700"
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
