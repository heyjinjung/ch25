import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { 
    Users, 
    Settings, 
    Play, 
    ShieldCheck,
    AlertCircle,
    BrainCircuit,
    Loader2
} from "lucide-react";
import { useRunSegmentBatch, useAdminSegmentStats, useAdminSegmentRules } from "../../../hooks/useV2Admin";
import { useToast } from "../../../../components/common/ToastProvider";

export default function UserSegmentPage() {
  const { data: stats, isLoading: isStatsLoading } = useAdminSegmentStats();
  const { data: rules, isLoading: isRulesLoading } = useAdminSegmentRules();
  const runBatch = useRunSegmentBatch();
  const { addToast } = useToast();

  const handleRunBatch = async () => {
      try {
          await runBatch.mutateAsync();
          addToast("AI 세그먼트 배치가 성공적으로 시작되었습니다.", "success");
      } catch (e) {
          console.error("Batch failed", e);
          addToast("배치 실행 중 오류가 발생했습니다.", "error");
      }
  };

  const isLoading = isStatsLoading || isRulesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#121214] text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        분석 엔진 데이터를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 bg-[#121214] min-h-screen text-white">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
           <div className="flex items-center gap-2 text-indigo-400 mb-2">
               <BrainCircuit className="w-4 h-4" />
               <span className="text-xs font-bold uppercase tracking-wider">AI Segmentation Engine</span>
           </div>
           <h1 className="text-2xl font-bold tracking-tight">고객 세그먼트 (User Segments)</h1>
           <p className="text-sm text-zinc-400 mt-1">
             사용자 행동 데이터를 분석하여 마케팅 및 운영 타겟 그룹을 분류합니다.
           </p>
        </div>
        <div className="flex flex-col items-end gap-3">
             <Button 
                className="bg-[#D2FD9C] hover:bg-[#D2FD9C]/90 text-black font-bold h-10 px-6"
                onClick={handleRunBatch}
                disabled={runBatch.isPending}
             >
                <Play className="w-4 h-4 mr-2" />
                {runBatch.isPending ? "Balancing..." : "배치 즉시 실행"}
             </Button>
             {stats?.lastBatchTime && (
               <span className="text-[10px] text-zinc-500 font-mono uppercase">
                 Last Analyzed: {stats.lastBatchTime}
               </span>
             )}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
          {stats?.segments.map((seg) => (
              <Card key={seg.name} className={`bg-[#18181B] border-white/5 ${seg.border} hover:bg-zinc-800/50 transition-all cursor-default`}>
                  <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className={`text-xs font-bold uppercase tracking-widest ${seg.color}`}>{seg.name}</CardTitle>
                        <Users className="w-4 h-4 text-zinc-600" />
                      </div>
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold mb-1">{seg.count.toLocaleString()}</div>
                      <p className="text-[10px] text-zinc-400 leading-tight min-h-[2.5em]">{seg.desc}</p>
                      <div className="mt-4 pt-3 border-t border-white/5">
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] w-full text-zinc-400 hover:text-white hover:bg-white/5">
                              세그먼트 유저 상세 보기
                          </Button>
                      </div>
                  </CardContent>
              </Card>
          ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
          {/* Segment Rules */}
          <Card className="bg-[#18181B] border-white/8 shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-white/5 mb-4">
                  <div>
                      <CardTitle className="text-base font-bold">분류 규칙 (Rule Engine)</CardTitle>
                      <CardDescription className="text-zinc-500 text-xs mt-1">자동 분류 시스템의 핵심 로직입니다.</CardDescription>
                  </div>
                  <Button variant="secondary" size="sm" className="h-8 bg-zinc-800 text-white border-white/5 text-xs">
                      <Settings className="w-3 h-3 mr-2 text-zinc-400" /> 규칙 관리
                  </Button>
              </CardHeader>
              <CardContent className="pt-0">
                  <div className="space-y-2">
                      {rules?.map((rule) => (
                          <div key={rule.id} className="flex justify-between items-center p-3 rounded-lg bg-zinc-900/50 border border-white/5">
                              <div>
                                  <div className="text-sm font-medium text-zinc-200">{rule.label}</div>
                                  <div className="text-xs text-indigo-400 font-mono mt-0.5">{rule.rule}</div>
                              </div>
                              <Badge className={`border-none h-5 text-[10px] ${rule.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
                                {rule.status}
                              </Badge>
                          </div>
                      ))}
                  </div>
              </CardContent>
          </Card>

          {/* Targeted Actions */}
          <Card className="bg-[#18181B] border-white/8">
              <CardHeader className="pb-4 border-b border-white/5 mb-4">
                  <CardTitle className="text-base font-bold">오토메이션 & 마케팅</CardTitle>
                  <CardDescription className="text-zinc-500 text-xs mt-1">세그먼트 감지 시 자동 실행되는 트리거입니다.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                  <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div>
                          <h4 className="text-sm font-bold text-indigo-400 mb-1">휴면 유저 복귀 자동 쿠폰</h4>
                          <p className="text-xs text-zinc-400">DORMANT 상태 진입 즉시 텔레그램 메세지 및 복귀 혜택 발송.</p>
                      </div>
                  </div>
                  <div className="p-4 rounded-xl border border-red-500/10 bg-red-500/5 flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                          <h4 className="text-sm font-bold text-red-400 mb-1">고위험군 VIP 전담 실적 배정</h4>
                          <p className="text-xs text-zinc-400">HIGH_RISK VIP 감지 시 운영팀 전용 관제실에 실시간 알림 전송.</p>
                      </div>
                  </div>
              </CardContent>
          </Card>
      </div>

    </div>
  );
}
