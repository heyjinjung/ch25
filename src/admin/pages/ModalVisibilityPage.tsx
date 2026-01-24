import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAdminUiConfig, upsertAdminUiConfig } from "../api/adminUiConfigApi";
import { Save, RefreshCw, ToggleRight } from "lucide-react";
import { useToast } from "../../components/common/ToastProvider";

const CONFIG_KEY = "modal_visibility";

export default function ModalVisibilityPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [config, setConfig] = useState<any>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["adminUiConfig", CONFIG_KEY],
    queryFn: () => fetchAdminUiConfig(CONFIG_KEY),
  });

  useEffect(() => {
    if (data?.value) {
      setConfig(data.value);
    } else {
       // defaults (All True/Enabled)
       setConfig({
         attendance_streak_enabled: true,
         new_user_welcome_enabled: true,
         starter_missions_enabled: true,
         golden_hour_enabled: true,
         vip_promo_enabled: true,
         vip_eligibility_enabled: true,
         inbox_enabled: true,
         vault_info_enabled: true,
         withdrawal_conditions_enabled: true,
         withdrawal_progress_enabled: true,
         lottery_collection_enabled: true,
         limited_offer_enabled: true,
         season_pass_enabled: true,
         ticket_zero_enabled: true,
       });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (newVal: any) => upsertAdminUiConfig(CONFIG_KEY, { value: newVal }),
    onSuccess: () => {
      addToast("?€?¥ë˜?ˆìŠµ?ˆë‹¤.", "success");
      queryClient.invalidateQueries({ queryKey: ["adminUiConfig", CONFIG_KEY] });
    },
    onError: () => addToast("?€???¤íŒ¨", "error"),
  });

  const handleToggle = (key: string) => {
      setConfig((prev: any) => ({
          ...prev,
          [key]: prev[key] === false ? true : false
      })); // Logic: if undefined/true -> become false. if false -> become true.
  };

  const onSave = () => {
      mutation.mutate(config);
  };

  if (isLoading) return <div className="p-8 text-white">Loading...</div>;

  const toggles = [
      { key: "attendance_streak_enabled", label: "ì¶œì„ ?¤íŠ¸ë¦?(Streak)" },
      { key: "new_user_welcome_enabled", label: "? ê·œ ? ì? ?°ì»´ (NewUserWelcome)" },
      { key: "starter_missions_enabled", label: "?¤í???ë¯¸ì…˜ (StarterMissions)" },
      { key: "golden_hour_enabled", label: "ê³¨ë“  ?„ì›Œ (GoldenHour)" },
      { key: "vip_promo_enabled", label: "VIP ?„ë¡œëª¨ì…˜ (VipPromo)" },
      { key: "vip_eligibility_enabled", label: "VIP ?ê²© ?•ì¸ (VipEligibility)" },
      { key: "inbox_enabled", label: "?¸ë°•???Œë¦¼??(Inbox)" },
      { key: "vault_info_enabled", label: "ê¸ˆê³  ?•ë³´ (VaultInfo)" },
      { key: "withdrawal_conditions_enabled", label: "ì¶œê¸ˆ ì¡°ê±´ (WithdrawalConditions)" },
      { key: "withdrawal_progress_enabled", label: "ì¶œê¸ˆ ì§„í–‰ (WithdrawalProgress)" },
      { key: "lottery_collection_enabled", label: "ë³µê¶Œ ëª¨ìŒ (LotteryCollection)" },
      { key: "limited_offer_enabled", label: "?œì • ?¤í¼ (LimitedOffer)" },
      { key: "season_pass_enabled", label: "?œì¦Œ ?¨ìŠ¤ (SeasonPass)" },
      { key: "ticket_zero_enabled", label: "?°ì¼“ ?œë¡œ (TicketZero)" },
  ];

  return (
      <div className="p-8 max-w-4xl mx-auto text-admin-text-primary">
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <ToggleRight className="text-admin-brand" />
                ëª¨ë‹¬ ?¸ì¶œ ?œì–´ (Global Gate)
            </h1>
        </div>
        
        <div className="bg-admin-card rounded-xl p-6 border border-admin-border space-y-6 shadow-xl">
            <p className="text-sm text-admin-text-muted mb-4">
                ?´ê³³?ì„œ ???„ì²´??ì£¼ìš” ?ì—…/ëª¨ë‹¬ ?¸ì¶œ ?¬ë?ë¥?ê°•ì œë¡??œì–´?????ˆìŠµ?ˆë‹¤. <br/>
                ê¸´ê¸‰ ?í™©?´ê±°??UX ?ŒìŠ¤???œì—ë§?ë³€ê²½í•˜?¸ìš”. (OFF ???¬ìš©?ì—ê²??¨ì? ?ŠìŠµ?ˆë‹¤)
            </p>

            <div className="flex flex-col gap-4">
                {toggles.map((t) => {
                    const isEnabled = config[t.key] !== false;
                    return (
                        <div key={t.key} 
                             onClick={() => handleToggle(t.key)}
                             className={`group flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer select-none
                                ${isEnabled 
                                    ? 'bg-emerald-900/10 border-emerald-500/30 hover:bg-emerald-900/20' 
                                    : 'bg-red-900/10 border-red-500/30 hover:bg-red-900/20'}
                             `}>
                            <span className={`font-medium text-lg transition-colors ${isEnabled ? 'text-emerald-400' : 'text-red-400 opacity-60'}`}>
                                {t.label}
                            </span>
                            
                            <div className={`relative w-14 h-8 rounded-full transition-colors ${isEnabled ? 'bg-emerald-500' : 'bg-gray-700'}`}>
                                <div className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-200 
                                    ${isEnabled ? 'left-7' : 'left-1'}
                                `} />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-admin-border/50">
                 <button onClick={() => refetch()} className="px-4 py-2 bg-admin-card-hover rounded hover:bg-white/10 text-sm flex items-center gap-2 transition-colors">
                    <RefreshCw size={16} /> ?ˆë¡œê³ ì¹¨
                 </button>
                 <button onClick={onSave} disabled={mutation.isPending} className="btn-admin-primary flex items-center gap-2 px-6 py-2">
                    <Save size={16} /> ë³€ê²½ì‚¬???€??
                 </button>
            </div>
        </div>
      </div>
  );
}
