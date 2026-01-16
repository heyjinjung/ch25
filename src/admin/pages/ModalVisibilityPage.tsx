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
         bailout_enabled: true,
       });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (newVal: any) => upsertAdminUiConfig(CONFIG_KEY, { value: newVal }),
    onSuccess: () => {
      addToast("저장되었습니다.", "success");
      queryClient.invalidateQueries({ queryKey: ["adminUiConfig", CONFIG_KEY] });
    },
    onError: () => addToast("저장 실패", "error"),
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
      { key: "attendance_streak_enabled", label: "출석 스트릭 모달 (AttendanceStreak)" },
      { key: "new_user_welcome_enabled", label: "신규 유저 웰컴 모달 (NewUserWelcome)" },
      { key: "starter_missions_enabled", label: "스타터 미션 모달 (StarterMissions)" },
      { key: "bailout_enabled", label: "구제(Bailout) 모달 (Ticket/Coin Zero)" },
  ];

  return (
      <div className="p-8 max-w-4xl mx-auto text-admin-text-primary">
        <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <ToggleRight className="text-admin-brand" />
                모달 노출 제어 (Global Gate)
            </h1>
        </div>
        
        <div className="bg-admin-card rounded-xl p-6 border border-admin-border space-y-6 shadow-xl">
            <p className="text-sm text-admin-text-muted mb-4">
                이곳에서 앱 전체의 주요 팝업/모달 노출 여부를 강제로 제어할 수 있습니다. <br/>
                긴급 상황이거나 UX 테스트 시에만 변경하세요. (OFF 시 사용자에게 뜨지 않습니다)
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
                    <RefreshCw size={16} /> 새로고침
                 </button>
                 <button onClick={onSave} disabled={mutation.isPending} className="btn-admin-primary flex items-center gap-2 px-6 py-2">
                    <Save size={16} /> 변경사항 저장
                 </button>
            </div>
        </div>
      </div>
  );
}
