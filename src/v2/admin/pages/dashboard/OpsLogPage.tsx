
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";
import { Upload, FileText, Filter, Download } from 'lucide-react';

export default function OpsLogPage() {
  return (
    <div className="p-6 space-y-6 h-full bg-[#121214] min-h-screen text-[#E4E4E7]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">운영 로그 (Ops Log)</h1>
          <p className="text-sm text-zinc-400">시스템 운영 기록 조회 및 대량 데이터(CSV) 업로드를 관리합니다.</p>
        </div>
        <Button className="bg-[#D2FD9C] text-black hover:bg-[#D2FD9C]/90 font-bold">
          <Download className="mr-2 h-4 w-4" />
          로그 다운로드
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* CSV Upload Section */}
        <Card className="md:col-span-1 bg-[#18181B] border-white/5">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#D2FD9C]" />
              CSV 업로드
            </CardTitle>
            <CardDescription className="text-zinc-500">
              대량의 유저 데이터나 지급 내역을 업로드합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 flex flex-col items-center justify-center text-center hover:border-[#D2FD9C]/50 transition-colors cursor-pointer bg-black/20">
              <FileText className="h-10 w-10 text-zinc-500 mb-4" />
              <p className="text-sm text-zinc-300 font-medium mb-1">파일을 드래그하거나 클릭하세요</p>
              <p className="text-xs text-zinc-500">지원 형식: .csv, .xlsx (최대 10MB)</p>
              <Input type="file" className="hidden" />
              <Button variant="outline" className="mt-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                파일 선택
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Logs Section */}
        <Card className="md:col-span-2 bg-[#18181B] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-white">최근 활동 로그</CardTitle>
              <CardDescription className="text-zinc-500">
                관리자 및 시스템의 주요 활동 내역입니다.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <Filter className="mr-2 h-4 w-4" />
              필터
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400">시간</TableHead>
                  <TableHead className="text-zinc-400">관리자</TableHead>
                  <TableHead className="text-zinc-400">활동 유형</TableHead>
                  <TableHead className="text-zinc-400">내용</TableHead>
                  <TableHead className="text-zinc-400">상태</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { time: '10:42:23', admin: 'Manager_A', type: '지급', desc: 'User_1004에게 룰렛 티켓 3장 지급', status: 'Success' },
                  { time: '10:15:00', admin: 'System', type: '배치', desc: '일일 미션 리셋 완료', status: 'Success' },
                  { time: '09:58:12', admin: 'Manager_B', type: '수정', desc: 'Shop_001 상품 가격 변경', status: 'Warning' },
                  { time: '09:30:45', admin: 'Manager_A', type: '출금', desc: 'User_552 출금 승인 (50,000원)', status: 'Success' },
                  { time: '09:00:00', admin: 'System', type: '오류', desc: '외부 API 연동 실패 (Timeout)', status: 'Error' },
                ].map((log, i) => (
                  <TableRow key={i} className="border-zinc-800 hover:bg-white/5">
                    <TableCell className="font-mono text-xs text-zinc-500">{log.time}</TableCell>
                    <TableCell className="text-zinc-300">{log.admin}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                        {log.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-300">{log.desc}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "bg-opacity-10",
                          log.status === 'Success' && "bg-green-500 text-green-500",
                          log.status === 'Warning' && "bg-yellow-500 text-yellow-500",
                          log.status === 'Error' && "bg-red-500 text-red-500",
                        )}
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
