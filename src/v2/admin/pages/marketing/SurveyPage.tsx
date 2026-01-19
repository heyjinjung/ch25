import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

export default function SurveyPage() {
  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">설문 조사 (Survey Ops)</h1>
        <p className="text-sm text-zinc-400">진행 중인 설문을 관리하고 결과를 확인합니다.</p>
      </div>

       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-[#18181B] border-white/5">
            <CardHeader>
                <CardTitle className="text-white">Customer Satisfaction</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-zinc-500 text-sm mb-4">Active • 1,234 Responses</p>
                <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 hover:text-white">View Results</Button>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
