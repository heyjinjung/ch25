import { useState } from "react";
import { Eye, Save, RefreshCw, Power, ToggleLeft } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Switch } from "../../../components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { useAdminUiConfig, useAdminUpdateUiConfig } from "../../../hooks/useAdminUiConfig";
import { Skeleton } from "../../../components/ui/skeleton";
import V2StreakModal from "../../../components/mission/V2StreakModal";
import { useV2StreakRules } from "../../../hooks/useV2Mission";

const CONFIG_KEY = "modal_visibility";

const MODAL_TOGGLES = [
  { key: "attendance_streak_enabled", label: "출석 스트릭 모달", description: "연속 출석 보상 모달" },
  { key: "new_user_welcome_enabled", label: "신규 유저 웰컴", description: "신규 가입자 환영 모달" },
  { key: "starter_missions_enabled", label: "스타터 미션", description: "초보자 미션 안내 모달" },
  { key: "golden_hour_enabled", label: "골든아워", description: "골든아워 이벤트 모달" },
  { key: "vip_promo_enabled", label: "VIP 프로모션", description: "VIP 혜택 안내 모달" },
  { key: "vip_eligibility_enabled", label: "VIP 자격", description: "VIP 승급 안내 모달" },
  { key: "inbox_enabled", label: "인박스", description: "수신함 알림 모달" },
  { key: "vault_info_enabled", label: "볼트 정보", description: "볼트 시스템 설명 모달" },
  { key: "withdrawal_conditions_enabled", label: "출금 조건", description: "출금 요구사항 안내 모달" },
  { key: "withdrawal_progress_enabled", label: "출금 진행", description: "출금 진행상황 모달" },
  { key: "lottery_collection_enabled", label: "복권 수집", description: "복권 수집 현황 모달" },
  { key: "limited_offer_enabled", label: "한정 오퍼", description: "기간 한정 특가 모달" },
  { key: "season_pass_enabled", label: "시즌패스", description: "시즌 패스 광고 모달" },
  { key: "ticket_zero_enabled", label: "티켓 제로", description: "티켓 소진 안내 모달" },
];

export default function ModalControlPage() {
  const { data: configData, isLoading, refetch } = useAdminUiConfig(CONFIG_KEY);
  const updateMutation = useAdminUpdateUiConfig();
  const { data: streakRules = [] } = useV2StreakRules();

  const [localConfig, setLocalConfig] = useState<Record<string, boolean>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Initialize local config when data loads
  useState(() => {
    if (configData?.value) {
      setLocalConfig(configData.value as Record<string, boolean>);
    }
  });

  const handleToggle = (key: string) => {
    setLocalConfig((prev) => {
      const current = prev[key] !== false; // default true
      return { ...prev, [key]: !current };
    });
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        key: CONFIG_KEY,
        payload: { value: localConfig },
      });
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to save modal config:", error);
    }
  };

  const handleRefresh = () => {
    refetch();
    if (configData?.value) {
      setLocalConfig(configData.value as Record<string, boolean>);
    }
    setIsDirty(false);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-12 w-64 bg-zinc-800" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24 bg-zinc-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const currentConfig = configData?.value as Record<string, boolean> || {};

  return (
    <div className="space-y-6 p-6 text-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-3">
            <Power className="w-8 h-8 text-indigo-400" />
            모달 제어 (Modal Control)
          </h1>
          <p className="text-sm text-zinc-400">
            전체 모달의 노출 여부를 제어합니다. OFF 시 해당 모달은 완전히 차단됩니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-white/10 hover:bg-white/5 gap-2"
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </Button>
          <Button
            variant="outline"
            className="border-white/10 hover:bg-white/5 gap-2"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="w-4 h-4" />
            {showPreview ? "미리보기 닫기" : "모달 미리보기"}
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isPending}
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? "저장 중..." : "변경사항 저장"}
          </Button>
        </div>
      </div>

      {/* Toggle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODAL_TOGGLES.map((toggle) => {
          const isEnabled = (localConfig[toggle.key] ?? currentConfig[toggle.key]) !== false;
          return (
            <Card
              key={toggle.key}
              className={`bg-[#18181B] border transition-all cursor-pointer group hover:scale-[1.02] ${
                isEnabled
                  ? "border-emerald-500/30 hover:border-emerald-500/50"
                  : "border-red-500/30 hover:border-red-500/50"
              }`}
              onClick={() => handleToggle(toggle.key)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className={`text-base transition-colors ${
                      isEnabled ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {toggle.label}
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-500 mt-1">
                      {toggle.description}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleToggle(toggle.key)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-xs">
                  <ToggleLeft className={`w-4 h-4 ${isEnabled ? "text-emerald-500" : "text-red-500"}`} />
                  <span className={isEnabled ? "text-emerald-500" : "text-red-500"}>
                    {isEnabled ? "활성화됨" : "비활성화됨"}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview Section */}
      {showPreview && (
        <Card className="bg-[#18181B] border-white/5">
          <CardHeader>
            <CardTitle className="text-lg">모달 미리보기 - 출석 스트릭</CardTitle>
            <CardDescription>
              실제 사용자에게 표시되는 모달의 미리보기입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center items-center min-h-[400px] bg-black/20 rounded-lg">
            <div className="scale-90">
              <V2StreakModal
                open={true}
                onClose={() => setShowPreview(false)}
                currentStreak={3}
                claimableDay={3}
                rules={streakRules}
                onClaim={async () => {
                  console.log("Preview claim - no action");
                  return true;
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Footer */}
      {isDirty && (
        <div className="fixed bottom-6 right-6 bg-yellow-900/90 border border-yellow-500/50 rounded-lg px-4 py-2 shadow-xl">
          <p className="text-sm text-yellow-200">변경사항이 저장되지 않았습니다.</p>
        </div>
      )}
    </div>
  );
}
