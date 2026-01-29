import React from "react";
import {
  useAdminCircuitBreakerStatus,
  useAdminResetCircuitBreaker,
} from "../../../hooks/useAdminEconomy";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { SlideToApprove } from "../../components/ui/SlideToApprove";
import { PulsatingDot } from "../../components/ui/PulsatingDot";
import { ShieldAlert, RotateCcw, Settings2, History } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "../../../components/ui/progress";
import type { AdminCircuitBreakerStatusDto } from "../../../api/adminApi";

const CircuitBreakerPage: React.FC = () => {
  const statusList = useAdminCircuitBreakerStatus().data;
  const isLoading = useAdminCircuitBreakerStatus().isLoading;
  const resetMutation = useAdminResetCircuitBreaker();

  const handleGlobalReset = async (assetType: string) => {
    try {
      await resetMutation.mutateAsync({
        asset_type: assetType,
        limit_type: "GLOBAL",
      });
      toast.success(`${assetType} 글로벌 한도가 초기화되었습니다.`);
    } catch (error) {
      console.error(error);
      toast.error("초기화 중 오류가 발생했습니다.");
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-zinc-400 text-center">
        데이터를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-8 bg-[#121214] min-h-screen text-zinc-200">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Circuit Breaker 관제
          </h1>
          <p className="text-sm text-zinc-400">
            시스템 자산 지급 임계치를 모니터링하고 차단 상태를 해제합니다.
          </p>
        </div>
        <Badge className="bg-red-500/10 text-red-500 border-none px-3 py-1 animate-pulse">
          <ShieldAlert className="w-4 h-4 mr-2" /> 실시간 모니터링 (Live)
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statusList?.map((status: AdminCircuitBreakerStatusDto) => {
          const usagePercent = Math.min(
            (status.global.current / status.global.limit) * 100,
            100,
          );
          const isWarning = usagePercent > 80;
          const isCritical = status.global.isBreached;

          return (
            <Card
              key={status.assetType}
              className={`bg-[#18181B] border-white/5 transition-all overflow-hidden ${isCritical ? "ring-2 ring-red-500/50" : ""}`}
            >
              <CardHeader className="pb-4 border-b border-white/5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold text-white uppercase tracking-wider">
                      {status.assetType}
                    </CardTitle>
                    {isCritical && <PulsatingDot color="red" />}
                  </div>
                  <Badge
                    variant={isCritical ? "destructive" : "outline"}
                    className={
                      !isCritical ? "text-zinc-500 border-zinc-800" : ""
                    }
                  >
                    {isCritical ? "차단됨 (BREACHED)" : "정상 (NOMINAL)"}
                  </Badge>
                </div>
                <CardDescription className="text-zinc-500 text-xs">
                  글로벌 지급 임계치 (Threshold)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Gauge Section */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-zinc-400">지급 진행도 (Usage)</span>
                    <span
                      className={`${isCritical ? "text-red-500" : isWarning ? "text-orange-400" : "text-lime-400"}`}
                    >
                      {usagePercent.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={usagePercent}
                    className={`h-2 bg-zinc-950 ${isCritical ? "[&>div]:bg-red-500" : isWarning ? "[&>div]:bg-orange-400" : "[&>div]:bg-lime-400"}`}
                  />
                  <div className="flex justify-between text-[10px] text-zinc-600 uppercase tracking-tighter">
                    <span>{status.global.current.toLocaleString()} 지급됨</span>
                    <span>한도: {status.global.limit.toLocaleString()}</span>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 py-2 border-y border-white/[0.03]">
                  <div>
                    <span className="block text-[10px] text-zinc-500 uppercase">
                      유저 한도 설정 (User Limit)
                    </span>
                    <span className="text-sm font-semibold text-zinc-300">
                      {status.config.userLimit.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] text-zinc-500 uppercase">
                      글로벌 한도 설정 (Global Limit)
                    </span>
                    <span className="text-sm font-semibold text-zinc-300">
                      {status.config.globalLimit.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Action Section */}
                <div className="pt-2">
                  {isCritical ? (
                    <SlideToApprove
                      text="글로벌 한도 초기화를 위해 슬라이드 (RESET)"
                      onApprove={() => handleGlobalReset(status.assetType)}
                      className="bg-red-500/20 text-red-500 border-red-500/20"
                    />
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 bg-white/5 border-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
                      >
                        <Settings2 className="w-3.5 h-3.5 mr-2" /> 수정
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-9 bg-white/5 border-white/5 text-zinc-500"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Operation Log Footnote */}
      <div className="p-4 bg-zinc-950/50 rounded-lg border border-white/5 flex items-center gap-4">
        <div className="p-2 bg-blue-500/10 rounded-full">
          <RotateCcw className="w-5 h-5 text-blue-400" />
        </div>
        <div className="text-sm">
          <span className="text-zinc-300 font-bold">
            운영 팁 (Operation Tip):
          </span>
          <span className="text-zinc-500 ml-2">
            Circuit Breaker 리셋은 모든 지급 카운트를 0으로 초기화합니다. 임계치
            근접 알람 발생 시 이상 유무를 반드시 먼저 확인하십시오.
          </span>
        </div>
      </div>
    </div>
  );
};

export default CircuitBreakerPage;
