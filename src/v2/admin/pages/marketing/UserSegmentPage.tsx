
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { 
    Users, 
    Settings, 
    Play, 
    ShieldCheck,
    AlertCircle,
    BrainCircuit
} from "lucide-react";
import { useRunSegmentBatch } from "../../../hooks/useV2Admin";
import { useState } from "react";

export default function UserSegmentPage() {
  const runBatch = useRunSegmentBatch();
  const [lastBatchTime, setLastBatchTime] = useState<string>("2 hours ago");

  const segments = [
      { name: "WHALE", label: "고액 입금자 (Whales)", count: 12, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", desc: "누적 입금 1,000만 원 이상" },
      { name: "HIGH_RISK", label: "고위험 이탈 (At Risk)", count: 8, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", desc: "이탈 확률 85% 초과" },
      { name: "DORMANT", label: "휴면 (Dormant)", count: 142, color: "text-zinc-500", bg: "bg-zinc-500/10", border: "border-zinc-500/20", desc: "최근 7일간 활동 없음" },
      { name: "GRINDER", label: "성실 유저 (Grinders)", count: 56, color: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20", desc: "매일 10회 이상 게임 참여" },
  ];

  const handleRunBatch = async () => {
      try {
          await runBatch.mutateAsync();
          setLastBatchTime("Just now");
      } catch (e) {
          console.error("Batch failed", e);
      }
  };

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
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 px-6"
                onClick={handleRunBatch}
                disabled={runBatch.isPending}
             >
                <Play className="w-4 h-4 mr-2" />
                {runBatch.isPending ? "Balancing..." : "배치 실행 (Run Batch)"}
             </Button>
             <span className="text-[10px] text-zinc-500">Last batch: {lastBatchTime}</span>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
          {segments.map((seg) => (
              <Card key={seg.name} className={`bg-[#18181B] border-white/5 ${seg.border} hover:border-white/20 transition-all`}>
                  <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className={`text-xs font-bold uppercase tracking-widest ${seg.color}`}>{seg.name}</CardTitle>
                        <Users className="w-4 h-4 text-zinc-600" />
                      </div>
                  </CardHeader>
                  <CardContent>
                      <div className="text-2xl font-bold mb-1">{seg.count}</div>
                      <p className="text-[10px] text-zinc-500 leading-tight">{seg.desc}</p>
                      <div className="mt-3 pt-3 border-t border-white/5">
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] w-full text-zinc-400 hover:text-white hover:bg-white/5">
                              유저 목록 보기
                          </Button>
                      </div>
                  </CardContent>
              </Card>
          ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
          {/* Segment Rules */}
          <Card className="bg-[#18181B] border-white/5">
              <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                      <CardTitle className="text-lg">세그먼트 규칙 (Rule Engine)</CardTitle>
                      <CardDescription className="text-zinc-500">자동 분류 로직을 정의합니다.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 border-white/10 text-xs shadow-none">
                      <Settings className="w-3 h-3 mr-2" /> 규칙 수정
                  </Button>
              </CardHeader>
              <CardContent>
                  <div className="space-y-3">
                      {[
                          { label: "Churn Probability", rule: "> 85%", status: "Active" },
                          { label: "Daily Play Count", rule: ">= 10", status: "Active" },
                          { label: "Total Deposit", rule: ">= 10,000,000", status: "Active" },
                          { label: "Last Login", rule: "> 7 days", status: "Active" }
                      ].map((rule, i) => (
                          <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-black/20 border border-white/5">
                              <div>
                                  <div className="text-sm font-medium">{rule.label}</div>
                                  <div className="text-xs text-indigo-400 font-mono">{rule.rule}</div>
                              </div>
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-none h-5 text-[10px]">Active</Badge>
                          </div>
                      ))}
                  </div>
              </CardContent>
          </Card>

          {/* Targeted Actions */}
          <Card className="bg-[#18181B] border-white/5">
              <CardHeader>
                  <CardTitle className="text-lg">그룹별 마케팅 액션</CardTitle>
                  <CardDescription className="text-zinc-500">세그먼트별 자동 실행 설정입니다.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 flex items-start gap-3">
                      <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                      <div>
                          <h4 className="text-sm font-bold text-indigo-400 mb-1">DORMANT 유저 복귀 유도</h4>
                          <p className="text-xs text-zinc-400">휴면 전환 시 24시간 내 복귀 쿠폰 자동 발송 (Configured)</p>
                      </div>
                  </div>
                  <div className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                          <h4 className="text-sm font-bold text-amber-400 mb-1">HIGH_RISK 밀착 관리</h4>
                          <p className="text-xs text-zinc-400">위기 감지 시 텔레그램 개입 호출 (Configured)</p>
                      </div>
                  </div>
              </CardContent>
          </Card>
      </div>

    </div>
  );
}
