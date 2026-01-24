import { useState } from "react";
import {
  useAdminSurveys,
  useSurveyResults,
  useToggleSurvey,
} from "../../../hooks/useAdminMarketing";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Switch } from "../../../components/ui/switch";
import { Badge } from "../../../components/ui/badge";
import { 
  ClipboardList, 
  BarChart3, 
  Users, 
  RefreshCw,
  MessageSquare
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { format } from "date-fns";
import { cn } from "../../../lib/utils";

export default function SurveyPage() {
  const { data: surveys = [], isLoading, refetch } = useAdminSurveys();
  const toggleMutation = useToggleSurvey();
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);

  const { data: results = [], isLoading: isLoadingResults } = useSurveyResults(
    selectedSurveyId || 0
  );

  const handleToggle = async (surveyId: number, isActive: boolean) => {
    await toggleMutation.mutateAsync({ surveyId, isActive });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 pb-24 max-w-[1400px] mx-auto text-white">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            설문 조사 관리 (Surveys)
          </h1>
          <p className="text-zinc-400">
            유저들의 피드백을 수집하고 통계를 분석합니다.
          </p>
        </div>
        <Button 
          variant="outline" 
          className="border-white/10 hover:bg-white/5"
          onClick={() => refetch()}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          새로고침
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Survey List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardList className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold">설문 목록</h2>
          </div>
          
          {surveys.length === 0 ? (
            <div className="bg-zinc-900/50 border border-white/5 border-dashed rounded-2xl p-8 text-center text-zinc-500 italic">
              등록된 설문이 없습니다.
            </div>
          ) : (
            surveys.map((survey) => (
              <Card 
                key={survey.id}
                className={cn(
                  "bg-zinc-900 border-white/10 cursor-pointer transition-all hover:border-indigo-500/50",
                  selectedSurveyId === survey.id && "ring-2 ring-indigo-500 border-transparent shadow-[0_0_20px_rgba(79,70,229,0.2)]"
                )}
                onClick={() => setSelectedSurveyId(survey.id)}
              >
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant={survey.isActive ? "default" : "secondary"} className={survey.isActive ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-800 text-zinc-500"}>
                      {survey.isActive ? "진행 중" : "일시 중지"}
                    </Badge>
                    <Switch 
                      checked={survey.isActive}
                      onCheckedChange={(checked) => handleToggle(survey.id, checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{survey.title}</h3>
                  <p className="text-xs text-zinc-500 mb-4 line-clamp-2">{survey.description}</p>
                  
                  <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 uppercase tracking-wider border-t border-white/5 pt-4">
                    <div className="flex items-center gap-1.5 text-indigo-400">
                      <Users className="w-3.5 h-3.5" />
                      {survey.responseCount.toLocaleString()} 명 참여
                    </div>
                    <div>{format(new Date(survey.createdAt), "yyyy.MM.dd")}</div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Survey Analysis */}
        <div className="lg:col-span-2">
          {!selectedSurveyId ? (
            <div className="h-full flex flex-col items-center justify-center bg-zinc-900/30 border border-white/5 rounded-3xl gap-4 p-20 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-zinc-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-zinc-400 mb-2">분석할 설문을 선택하세요</h3>
                <p className="text-sm text-zinc-500">목록에서 설문을 클릭하면 상세 결과와 통계를 확인할 수 있습니다.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold">응답 통계 및 분석</h2>
              </div>

              {isLoadingResults ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-zinc-700" />
                  <p className="text-zinc-600 text-sm">데이터를 불러오는 중...</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {results.map((qResult) => (
                    <Card key={qResult.questionId} className="bg-zinc-900 border-white/10 overflow-hidden shadow-xl">
                      <CardHeader className="bg-white/5 border-b border-white/5 py-4">
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-black text-indigo-400">Q</span>
                          </div>
                          <div>
                            <CardTitle className="text-base text-zinc-200 leading-snug">{qResult.question}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        {qResult.responses.map((resp, idx) => (
                          <div key={idx} className="space-y-2">
                            <div className="flex justify-between text-sm font-bold">
                              <span className="text-zinc-300">{resp.option}</span>
                              <div className="flex gap-2">
                                <span className="text-zinc-500 font-mono">{resp.count}명</span>
                                <span className="text-emerald-400 font-mono">{resp.percentage}%</span>
                              </div>
                            </div>
                            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-1000"
                                style={{ width: `${resp.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                  
                  {results.length === 0 && (
                    <div className="bg-zinc-900/50 border border-white/5 border-dashed rounded-3xl p-20 text-center gap-4 flex flex-col items-center">
                        <MessageSquare className="w-12 h-12 text-zinc-800" />
                        <p className="text-zinc-500">아직 수집된 응답 데이터가 없습니다.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
