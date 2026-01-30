import { useState } from "react";
import { Package, AlertTriangle, Gift, Plus, RefreshCw } from "lucide-react";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Badge } from "../../../components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
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
import { Textarea } from "../../../components/ui/textarea";

import {
  useAdminStockAlerts,
  useAdminGifticonDeliveries,
  useAdminAdjustStock,
} from "../../../hooks/useAdminGame";

export default function StockManagementPage() {
  const formatKst = (value: string | Date) =>
    new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const [activeTab, setActiveTab] = useState("alerts");
  const [alertThreshold, setAlertThreshold] = useState(10);
  const [deliveryStatus, setDeliveryStatus] = useState<
    "PENDING" | "DELIVERED" | "FAILED" | undefined
  >(undefined);

  // Stock Adjust Dialog
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustUserId, setAdjustUserId] = useState("");
  const [adjustItemType, setAdjustItemType] = useState("");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  // Data Hooks
  const {
    data: stockAlerts,
    isLoading: isLoadingAlerts,
    refetch: refetchAlerts,
  } = useAdminStockAlerts(alertThreshold);
  const {
    data: gifticonDeliveries,
    isLoading: isLoadingDeliveries,
    refetch: refetchDeliveries,
  } = useAdminGifticonDeliveries({
    status: deliveryStatus,
    limit: 50,
  });

  const adjustStockMutation = useAdminAdjustStock();

  const formatCount = (value?: number) =>
    typeof value === "number" ? `${value}건` : "-";
  const alertTotalText =
    typeof stockAlerts?.total_alerts === "number"
      ? `${stockAlerts.total_alerts}건`
      : "-";
  const alertCriticalText =
    typeof stockAlerts?.critical_count === "number"
      ? `${stockAlerts.critical_count}건`
      : "-";
  const pendingText = formatCount(gifticonDeliveries?.pending);
  const deliveredText = formatCount(gifticonDeliveries?.delivered);

  const handleAdjustStock = async () => {
    const userId = Number(adjustUserId);
    const delta = Number(adjustDelta);

    if (!userId || !adjustItemType || !delta || !adjustReason) {
      alert("모든 필드를 입력해주세요.");
      return;
    }

    try {
      await adjustStockMutation.mutateAsync({
        user_id: userId,
        item_type: adjustItemType,
        delta,
        reason: adjustReason,
      });
      setIsAdjustOpen(false);
      setAdjustUserId("");
      setAdjustItemType("");
      setAdjustDelta("");
      setAdjustReason("");
      refetchAlerts();
    } catch (err: any) {
      alert(`오류: ${err?.message || "재고 조정 실패"}`);
    }
  };

  return (
    <div className="space-y-6 min-h-screen p-6 text-white pb-20">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 mb-2">
            <Package className="w-8 h-8 text-indigo-400" />
            재고 관리
          </h1>
          <p className="text-zinc-400">
            재고 알림, Gifticon 배송 추적, 재고 조정을 관리합니다.
          </p>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={() => setIsAdjustOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          재고 조정
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              총 알림
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400">
              {alertTotalText}
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              임계값 {alertThreshold} 이하
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              긴급 알림
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-400">
              {alertCriticalText}
            </div>
            <p className="text-xs text-zinc-500 mt-1">임계값 50% 이하</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              배송 대기
            </CardTitle>
            <Gift className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">
              {pendingText}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">
              배송 완료
            </CardTitle>
            <Gift className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">
              {deliveredText}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-zinc-900 border border-white/10 p-1">
          <TabsTrigger
            value="alerts"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            재고 알림 ({typeof stockAlerts?.total_alerts === "number" ? stockAlerts.total_alerts : 0})
          </TabsTrigger>
          <TabsTrigger
            value="gifticon"
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
          >
            Gifticon 배송
          </TabsTrigger>
        </TabsList>

        {/* Stock Alerts Tab */}
        <TabsContent value="alerts" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">재고 부족 알림</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">임계값:</span>
                <Select
                  value={String(alertThreshold)}
                  onValueChange={(v) => setAlertThreshold(Number(v))}
                >
                  <SelectTrigger className="w-24 bg-zinc-900 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-white/10">
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-white/10"
                onClick={() => refetchAlerts()}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Card className="bg-zinc-900 border-white/10">
            <CardContent className="pt-6">
              {isLoadingAlerts ? (
                <div className="text-center py-10 text-zinc-500">로딩중...</div>
              ) : !stockAlerts?.alerts?.length ? (
                <div className="text-center py-10 text-zinc-500">
                  재고 부족 알림이 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {stockAlerts.alerts.map((alert, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        alert.is_critical
                          ? "bg-rose-500/10 border-rose-500/30"
                          : "bg-amber-500/10 border-amber-500/30"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`p-2 rounded-lg ${
                            alert.is_critical
                              ? "bg-rose-500/20"
                              : "bg-amber-500/20"
                          }`}
                        >
                          <AlertTriangle
                            className={`w-5 h-5 ${
                              alert.is_critical
                                ? "text-rose-400"
                                : "text-amber-400"
                            }`}
                          />
                        </div>
                        <div>
                          <p className="font-bold text-white">
                            {alert.item_type}
                          </p>
                          <p className="text-sm text-zinc-400">
                            현재: {alert.current_stock}개 / 임계:{" "}
                            {alert.threshold}개
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={
                            alert.is_critical
                              ? "border-rose-500/50 text-rose-400"
                              : "border-amber-500/50 text-amber-400"
                          }
                        >
                          {alert.is_critical ? "긴급" : "경고"}
                        </Badge>
                        {alert.last_updated && (
                          <span className="text-xs text-zinc-500">
                            {formatKst(alert.last_updated)} KST
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gifticon Deliveries Tab */}
        <TabsContent value="gifticon" className="mt-6 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">Gifticon 배송 추적</h3>
            <div className="flex items-center gap-4">
              <Select
                value={deliveryStatus ?? "ALL"}
                onValueChange={(v) =>
                  setDeliveryStatus(
                    v === "ALL" ? undefined : (v as typeof deliveryStatus),
                  )
                }
              >
                <SelectTrigger className="w-32 bg-zinc-900 border-white/10">
                  <SelectValue placeholder="전체" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="ALL">전체</SelectItem>
                  <SelectItem value="PENDING">대기중</SelectItem>
                  <SelectItem value="DELIVERED">배송완료</SelectItem>
                  <SelectItem value="FAILED">실패</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="border-white/10"
                onClick={() => refetchDeliveries()}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Card className="bg-zinc-900 border-white/10">
            <CardHeader>
              <CardTitle className="text-white">배송 목록</CardTitle>
              <CardDescription className="text-zinc-400">
                총 {gifticonDeliveries?.total ?? 0}건 (대기:{" "}
                {gifticonDeliveries?.pending ?? 0} / 완료:{" "}
                {gifticonDeliveries?.delivered ?? 0} / 실패:{" "}
                {gifticonDeliveries?.failed ?? 0})
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDeliveries ? (
                <div className="text-center py-10 text-zinc-500">로딩중...</div>
              ) : !gifticonDeliveries?.items?.length ? (
                <div className="text-center py-10 text-zinc-500">
                  배송 내역이 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2 text-zinc-400">유저</th>
                        <th className="text-left py-2 text-zinc-400">아이템</th>
                        <th className="text-center py-2 text-zinc-400">상태</th>
                        <th className="text-right py-2 text-zinc-400">
                          생성일
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {gifticonDeliveries.items.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-white/5 hover:bg-white/5"
                        >
                          <td className="py-3">
                            <div>
                              <p className="text-white font-medium">
                                {item.nickname}
                              </p>
                              <p className="text-xs text-zinc-500">
                                UID: {item.user_id}
                              </p>
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge
                              variant="outline"
                              className="border-indigo-500/50 text-indigo-400"
                            >
                              {item.item_type}
                            </Badge>
                          </td>
                          <td className="py-3 text-center">
                            <Badge
                              variant="outline"
                              className={
                                item.status === "DELIVERED"
                                  ? "border-emerald-500/50 text-emerald-400"
                                  : item.status === "FAILED"
                                    ? "border-rose-500/50 text-rose-400"
                                    : "border-amber-500/50 text-amber-400"
                              }
                            >
                              {item.status === "DELIVERED"
                                ? "배송완료"
                                : item.status === "FAILED"
                                  ? "실패"
                                  : "대기중"}
                            </Badge>
                          </td>
                          <td className="py-3 text-right text-zinc-400">
                            {formatKst(item.created_at)} KST
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stock Adjust Dialog */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>재고 조정</DialogTitle>
            <DialogDescription className="text-zinc-400">
              유저의 아이템 재고를 조정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-zinc-400">유저 ID</label>
              <Input
                type="number"
                placeholder="유저 ID"
                value={adjustUserId}
                onChange={(e) => setAdjustUserId(e.target.value)}
                className="bg-black/20 border-white/10 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400">아이템 타입</label>
              <Input
                placeholder="예: GIFTICON_STARBUCKS"
                value={adjustItemType}
                onChange={(e) => setAdjustItemType(e.target.value)}
                className="bg-black/20 border-white/10 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400">
                조정 수량 (양수: 증가, 음수: 감소)
              </label>
              <Input
                type="number"
                placeholder="예: 10 또는 -5"
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
                className="bg-black/20 border-white/10 text-white mt-1"
              />
            </div>
            <div>
              <label className="text-sm text-zinc-400">사유</label>
              <Textarea
                placeholder="조정 사유"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="bg-black/20 border-white/10 text-white mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setIsAdjustOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              취소
            </Button>
            <Button
              onClick={handleAdjustStock}
              disabled={adjustStockMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {adjustStockMutation.isPending ? "처리중..." : "조정"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
