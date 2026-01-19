import { useState } from "react";
import { useAdminSurveys, useSurveyResults, useToggleSurvey } from "../../../hooks/useAdminMarketing";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Switch } from "../../../components/ui/switch";
import { Badge } from "../../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { ClipboardList, BarChart3, Users } from "lucide-react";

export default function SurveyPage() {
  const { data: surveys = [], isLoading } = useAdminSurveys();
  const toggleMutation = useToggleSurvey();
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);
  const { data: results = [] } = useSurveyResults(selectedSurveyId || 0);

  const handleToggle = (surveyId: number, isActive: boolean) => {
    toggleMutation.mutate({ surveyId, isActive });
  };

  return (
    <div className="space-y-6 text-white p-6 h-full overflow-y-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">설문 관리 (Survey Manager)</h1>
        <p className="text-sm text-zinc-400">유저 대상 설문을 관리하고 결과를 분석합니다.</p>
      </div>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-[#18181B] border border-white/5">
          <TabsTrigger value="list">설문 목록</TabsTrigger>
          <TabsTrigger value="results" disabled={!selectedSurveyId}>결과 분석</TabsTrigger>
        </TabsList>

        {/* Survey List */}
        <TabsContent value="list" className="space-y-4 mt-6">
          {isLoading ? (
            <div className="text-center py-20 text-zinc-500">Loading surveys...</div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-20 text-zinc-500 border border-dashed border-white/10 rounded-xl">
              등록된 설문이 없습니다.
            </div>
          ) : (
            surveys.map((survey) => (
              <Card
                key={survey.id}
                className={`bg-[#18181B] border-white/5 transition-all hover:border-white/10 cursor-pointer ${
                  selectedSurveyId === survey.id ? "border-emerald-500/30 bg-emerald-500/5" : ""
                }`}
                onClick={() => setSelectedSurveyId(survey.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <ClipboardList className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-bold text-lg">{survey.title}</h3>
                        {survey.isActive && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            진행중
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-zinc-400 mb-4">{survey.description}</p>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-zinc-500" />
                          <span className="text-zinc-400">응답 수:</span>
                          <span className="font-semibold text-emerald-400">{survey.responseCount}</span>
                        </div>
                        <div className="text-zinc-500">질문 {survey.questions.length}개</div>
                        <div className="text-zinc-500">{survey.createdAt}</div>
                      </div>

                      {/* Questions Preview */}
                      <div className="mt-4 space-y-2 bg-black/20 p-3 rounded-lg border border-white/5">
                        {survey.questions.map((q, idx) => (
                          <div key={q.id} className="text-xs text-zinc-400">
                            <span className="text-zinc-600">Q{idx + 1}.</span> {q.question}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-4 ml-6">
                      <Switch
                        checked={survey.isActive}
                        onCheckedChange={(checked) => handleToggle(survey.id, checked)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {selectedSurveyId === survey.id && (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                          선택됨
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4 mt-6">
          {!selectedSurveyId ? (
            <div className="text-center py-20 text-zinc-500">설문을 선택해주세요.</div>
          ) : (
            <div className="space-y-6">
              {results.map((result) => (
                <Card key={result.questionId} className="bg-[#18181B] border-white/5">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                      <CardTitle className="text-lg">{result.question}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.responses.map((res, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-300">{res.option}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-zinc-500">{res.count}명</span>
                              <span className="font-bold text-white">{res.percentage}%</span>
                            </div>
                          </div>
                          <div className="relative w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                              className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full transition-all"
                              style={{ width: `${res.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total Summary */}
                    <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-sm">
                      <span className="text-zinc-400">총 응답 수</span>
                      <span className="font-bold text-emerald-400">
                        {result.responses.reduce((sum, r) => sum + r.count, 0)}명
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
