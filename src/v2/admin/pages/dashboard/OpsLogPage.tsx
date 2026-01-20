import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { cn } from "../../../lib/utils";
import {
  Upload,
  FileText,
  Filter,
  Download,
  Search,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { LogViewer } from "../../components/ui/LogViewer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../../components/ui/sheet";

export default function OpsLogPage() {
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleLogClick = (log: any) => {
    setSelectedLog(log);
    setIsSheetOpen(true);
  };

  const logs = [
    {
      time: "10:42:23",
      admin: "Manager_A",
      type: "지급",
      desc: "User_1004에게 룰렛 티켓 3장 지급",
      status: "Success",
      details: {
        userId: 1004,
        items: [{ id: "roulette_ticket", qty: 3 }],
        reason: "Event Compensation",
        timestamp: "2026-01-20T10:42:23Z",
        ip: "123.45.67.89",
      },
    },
    {
      time: "10:15:00",
      admin: "System",
      type: "배치",
      desc: "일일 미션 리셋 완료",
      status: "Success",
      details: {
        job: "daily_mission_reset",
        processed: 2450,
        errors: 0,
        duration: "1.2s",
      },
    },
    {
      time: "09:58:12",
      admin: "Manager_B",
      type: "수정",
      desc: "Shop_001 상품 가격 변경",
      status: "Warning",
      details: {
        productId: "Shop_001",
        oldPrice: 5000,
        newPrice: 4500,
        audit: "Manual Adjustment",
      },
    },
    {
      time: "09:30:45",
      admin: "Manager_A",
      type: "출금",
      desc: "User_552 출금 승인 (50,000원)",
      status: "Success",
      details: {
        userId: 552,
        amount: 50000,
        method: "Bank Transfer",
        requestId: "REQ_9921",
      },
    },
    {
      time: "09:00:00",
      admin: "System",
      type: "오류",
      desc: "외부 API 연동 실패 (Timeout)",
      status: "Error",
      details: {
        endpoint: "/v1/external/verify",
        code: "ETIMEDOUT",
        stack:
          "Error: connect ETIMEDOUT 1.2.3.4:443\n at TCPConnectWrap.afterConnect",
      },
    },
  ];

  return (
    <div className="p-6 space-y-6 h-full bg-[#121214] min-h-screen text-[#E4E4E7]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            운영 로그 (Ops Log)
          </h1>
          <p className="text-sm text-zinc-400">
            시스템 운영 기록 조회 및 대량 데이터(CSV) 업로드를 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-white/10 text-zinc-300 hover:bg-white/5"
          >
            <Download className="mr-2 h-4 w-4" />
            CSV 내보내기
          </Button>
          <Button className="bg-[#D2FD9C] text-black hover:bg-[#D2FD9C]/90 font-bold">
            <Upload className="mr-2 h-4 w-4" />
            데이터 업로드
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Left: Filters & Tools */}
        <div className="md:col-span-1 space-y-6">
          <Card className="bg-[#18181B] border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Filter className="h-4 w-4 text-zinc-500" /> 검색 필터
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-zinc-500 font-bold">
                  검색어
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-600" />
                  <Input
                    placeholder="ID, 닉네임, 내용..."
                    className="pl-9 h-9 border-white/5 bg-black/20 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase text-zinc-500 font-bold">
                  활동 유형
                </label>
                <div className="flex flex-wrap gap-2">
                  {["전체", "지급", "수정", "삭제", "오류"].map((t) => (
                    <Badge
                      key={t}
                      variant="outline"
                      className="cursor-pointer hover:bg-[#D2FD9C] hover:text-black transition-colors border-white/5 text-zinc-400"
                    >
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#18181B] border-white/5 overflow-hidden">
            <div className="p-4 bg-gradient-to-br from-[#D2FD9C]/10 to-transparent">
              <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#D2FD9C]" /> 대량 작업 가이드
              </h4>
              <p className="text-xs text-zinc-500 leading-relaxed">
                CSV 업로드 시 샘플 템플릿의 형식을 반드시 준수해 주세요. (UTF-8
                권장)
              </p>
              <button className="mt-4 text-[10px] text-[#D2FD9C] hover:underline">
                샘플 파일 다운로드 (.csv)
              </button>
            </div>
          </Card>
        </div>

        {/* Right: Table */}
        <Card className="md:col-span-3 bg-[#18181B] border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">활동 로그 피드</CardTitle>
              <CardDescription className="text-zinc-500 text-xs">
                최근 1시간 내의 주요 이벤트입니다.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-zinc-600">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
                Normal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{" "}
                Warning
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Error
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800 hover:bg-transparent">
                  <TableHead className="text-zinc-400 w-[100px]">
                    시간
                  </TableHead>
                  <TableHead className="text-zinc-400 w-[120px]">
                    관리자
                  </TableHead>
                  <TableHead className="text-zinc-400 w-[80px]">유형</TableHead>
                  <TableHead className="text-zinc-400">상세 내용</TableHead>
                  <TableHead className="text-zinc-400 text-right">
                    상태
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, i) => (
                  <TableRow
                    key={i}
                    className="border-zinc-800 hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => handleLogClick(log)}
                  >
                    <TableCell className="font-mono text-[11px] text-zinc-500">
                      {log.time}
                    </TableCell>
                    <TableCell className="text-zinc-300 font-medium">
                      {log.admin}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-zinc-700 text-zinc-400 text-[10px]"
                      >
                        {log.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400 text-xs max-w-[300px] truncate">
                      {log.desc}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "bg-opacity-10 text-[10px]",
                          log.status === "Success" &&
                            "bg-green-500 text-green-500 border-green-500/20",
                          log.status === "Warning" &&
                            "bg-yellow-500 text-yellow-500 border-yellow-500/20",
                          log.status === "Error" &&
                            "bg-red-500 text-red-500 border-red-500/20",
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

      {/* Log Detail Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="bg-[#121214] border-white/5 text-white sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2 text-[#D2FD9C]">
              <Terminal className="w-5 h-5" /> Log Artifact
            </SheetTitle>
            <SheetDescription className="text-zinc-500">
              해당 이벤트의 상세 Raw 페이로드와 컨텍스트입니다.
            </SheetDescription>
          </SheetHeader>

          {selectedLog && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">
                    Time
                  </p>
                  <p className="text-sm">{selectedLog.time}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold mb-1">
                    Admin
                  </p>
                  <p className="text-sm">{selectedLog.admin}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Description
                </h4>
                <p className="text-sm text-zinc-200 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                  {selectedLog.desc}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  Metadata (JSON)
                </h4>
                <LogViewer data={selectedLog.details} className="border-none" />
              </div>

              <div className="flex gap-2 pt-4">
                <Button className="flex-1 bg-white/10 hover:bg-white/20 text-white">
                  로그 복사
                </Button>
                <Button className="flex-1 bg-[#D2FD9C] text-black hover:bg-[#D2FD9C]/90">
                  해당 유저 관리
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
