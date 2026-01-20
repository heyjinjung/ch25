import { useState } from "react";
import { useAdminTicketLogs, useAdminGrantItem } from "../../../hooks/useV2Admin"; // Updated hook path
import { type TicketLogDto, getAdminUserList } from "../../../api/adminApi";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Search, Plus, History } from "lucide-react";

export default function TicketInventoryPage() {
  const [searchUserId, setSearchUserId] = useState<number | undefined>(undefined);
  const [inputValue, setInputValue] = useState("");
  
  // Date Range State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  
  // Grant Form State
  const [grantOpen, setGrantOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [itemType, setItemType] = useState("TICKET");
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState("이벤트 보상");

  // Updated Hook Call with Date Params
  const { data: logs = [], isLoading } = useAdminTicketLogs(searchUserId, startDate, endDate);
  const grantMutation = useAdminGrantItem();

  const handleSearch = async () => {
    if (!inputValue) {
        setSearchUserId(undefined);
        return;
    }

    // Try to parse as integer (User ID)
    const numericId = parseInt(inputValue);
    // If it's a number and looks like an ID (e.g., all digits), use it directly
    if (!isNaN(numericId) && /^\d+$/.test(inputValue)) {
        setSearchUserId(numericId);
        return;
    }

    // Otherwise, treat as Nickname and search
    try {
        const response = await getAdminUserList({ search: inputValue, limit: 1 });
        if (response.users && response.users.length > 0) {
            setSearchUserId(response.users[0].id);
        } else {
            alert("해당 닉네임의 유저를 찾을 수 없습니다.");
            setSearchUserId(undefined);
        }
    } catch (error) {
        console.error("User search failed", error);
        alert("유저 검색 중 오류가 발생했습니다.");
    }
  };

  const handleGrant = () => {
      const uid = parseInt(targetUserId);
      const amt = parseInt(amount);
      if (isNaN(uid) || isNaN(amt)) return;

      grantMutation.mutate({
          userId: uid,
          itemType,
          amount: amt,
          reason
      }, {
          onSuccess: () => {
              setGrantOpen(false);
              setTargetUserId("");
              setAmount("1");
      }});
  };

  return (
    <div className="space-y-6 text-white p-6 h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">티켓/인벤토리 관리 (Inventory Ops)</h1>
          <p className="text-sm text-zinc-400">유저 아이템 지급/회수 로그를 조회하고 보상을 지급합니다.</p>
        </div>
        
        <Dialog open={grantOpen} onOpenChange={setGrantOpen}>
            <DialogTrigger asChild>
                <Button className="bg-emerald-500 hover:bg-emerald-600 text-black font-semibold">
                    <Plus className="w-4 h-4 mr-2" />
                    아이템 지급 (Grant)
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#18181B] border-white/10 text-white sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>아이템 수동 지급</DialogTitle>
                    <DialogDescription>특정 유저에게 티켓이나 포인트를 즉시 지급합니다.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-right text-sm text-zinc-400">User ID</span>
                        <Input 
                            className="col-span-3 bg-black/50 border-white/10 text-white" 
                            placeholder="ex. 1042"
                            value={targetUserId}
                            onChange={(e) => setTargetUserId(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-right text-sm text-zinc-400">Type</span>
                        <Select value={itemType} onValueChange={setItemType}>
                            <SelectTrigger className="col-span-3 bg-black/50 border-white/10 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#18181B] border-white/10 text-white">
                                <SelectItem value="TICKET">Ticket (티켓)</SelectItem>
                                <SelectItem value="POINT">Point (포인트)</SelectItem>
                                <SelectItem value="BUNDLE">Bundle (꾸러미)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-right text-sm text-zinc-400">Amount</span>
                        <Input 
                            type="number" 
                            className="col-span-3 bg-black/50 border-white/10 text-white" 
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <span className="text-right text-sm text-zinc-400">Reason</span>
                        <Input 
                            className="col-span-3 bg-black/50 border-white/10 text-white" 
                            placeholder="지급 사유 입력"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setGrantOpen(false)}>취소</Button>
                    <Button onClick={handleGrant} disabled={grantMutation.isPending} className="bg-emerald-500 text-black">
                        {grantMutation.isPending ? "처리중..." : "지급 확인"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full max-w-sm space-y-2">
              <label className="text-xs text-zinc-400 font-medium ml-1">로그 검색 (유저)</label>
              <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500" />
                  <Input 
                    placeholder="닉네임 또는 ID 입력" 
                    className="pl-9 bg-black/50 border-white/10 h-10 text-white" 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
              </div>
          </div>
          
          {/* Date Range Picker Fallback */}
          <div className="flex gap-2 items-center">
             <div className="space-y-2">
                  <label className="text-xs text-zinc-400 font-medium ml-1">시작일</label>
                  <Input 
                      type="date"
                      className="bg-black/50 border-white/10 h-10 text-white w-[150px]"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                  />
             </div>
             <span className="text-zinc-500 pb-2">~</span>
             <div className="space-y-2">
                  <label className="text-xs text-zinc-400 font-medium ml-1">종료일</label>
                  <Input 
                      type="date"
                      className="bg-black/50 border-white/10 h-10 text-white w-[150px]"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                  />
             </div>
          </div>

          <Button variant="secondary" onClick={handleSearch} className="h-10">검색</Button>
      </div>

      <Card className="bg-[#18181B] border-white/5">
         <CardHeader>
             <CardTitle className="flex items-center gap-2">
                 <History className="w-5 h-5 text-zinc-400" />
                 아이템 로그 목록 (Inventory Logs)
             </CardTitle>
         </CardHeader>
         <CardContent>
             <Table>
                 <TableHeader>
                     <TableRow className="border-white/5 hover:bg-transparent">
                         <TableHead>시간</TableHead>
                         <TableHead>유저 ID</TableHead>
                         <TableHead>구분</TableHead>
                         <TableHead>아이템</TableHead>
                         <TableHead>수량</TableHead>
                         <TableHead>잔액</TableHead>
                         <TableHead>사유</TableHead>
                     </TableRow>
                 </TableHeader>
                 <TableBody>
                     {isLoading ? (
                         <TableRow>
                             <TableCell colSpan={7} className="text-center py-10 text-zinc-500">로그를 불러오는 중입니다...</TableCell>
                         </TableRow>
                     ) : logs.length === 0 ? (
                         <TableRow>
                             <TableCell colSpan={7} className="text-center py-10 text-zinc-500">검색된 로그가 없습니다.</TableCell>
                         </TableRow>
                     ) : (
                         logs.map((log: TicketLogDto) => (
                             <TableRow key={log.id} className="border-white/5 hover:bg-white/5">
                                 <TableCell className="text-zinc-400 text-xs">{log.timestamp}</TableCell>
                                 <TableCell className="font-mono text-zinc-300">{log.userId}</TableCell>
                                 <TableCell>
                                     <Badge variant="outline" className={
                                         log.type === 'GRANT' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                         log.type === 'REVOKE' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                         'bg-zinc-800 text-zinc-400 border-white/10'
                                     }>
                                         {log.type}
                                     </Badge>
                                 </TableCell>
                                 <TableCell className="text-white">{log.itemType}</TableCell>
                                 <TableCell className={`font-bold ${log.type === 'GRANT' ? 'text-emerald-400' : 'text-red-400'}`}>
                                     {log.type === 'GRANT' ? '+' : '-'}{log.amount}
                                 </TableCell>
                                 <TableCell className="text-zinc-500">{log.balanceAfter}</TableCell>
                                 <TableCell className="text-zinc-400 max-w-[200px] truncate">{log.reason}</TableCell>
                             </TableRow>
                         ))
                     )}
                 </TableBody>
             </Table>
         </CardContent>
      </Card>
    </div>
  );
}

