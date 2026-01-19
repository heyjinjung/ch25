import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Search, Filter, MoreHorizontal, Eye } from "lucide-react";
import { cn } from "../../../lib/utils";

// Mock Data
const users = [
  { id: 1001, nickname: "HighRoller99", tier: "VIP", total_deposit: 15000000, last_active: "Now", status: "Active" },
  { id: 1002, nickname: "Newbie_Kr", tier: "Bronze", total_deposit: 50000, last_active: "2h ago", status: "Active" },
  { id: 1003, nickname: "Abuser_X", tier: "Silver", total_deposit: 1200000, last_active: "1d ago", status: "Suspended" },
  { id: 1004, nickname: "GoldenWhale", tier: "VVIP", total_deposit: 50000000, last_active: "5m ago", status: "Active" },
  { id: 1005, nickname: "Tester01", tier: "Iron", total_deposit: 0, last_active: "3d ago", status: "Inactive" },
];

export default function UserListPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = users.filter(user => 
    user.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toString().includes(searchTerm)
  );

  return (
    <div className="space-y-6 h-full text-[#E4E4E7]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">회원 관리 (User Management)</h1>
          <p className="text-sm text-zinc-400">총 1,234명의 회원을 관리하고 상세 정보를 조회합니다.</p>
        </div>
        <Button className="bg-[#D2FD9C] text-black hover:bg-[#D2FD9C]/90 font-bold">
          회원 등록
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 bg-[#18181B] p-4 rounded-xl border border-white/5">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input 
              placeholder="닉네임, ID, 전화번호 검색..." 
              className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-200 focus:ring-[#D2FD9C]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 gap-2">
            <Filter className="h-4 w-4" />
            필터
         </Button>
      </div>

      {/* Compact Table */}
      <div className="rounded-xl border border-white/5 bg-[#18181B] overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="w-[100px] text-zinc-500">UID</TableHead>
              <TableHead className="text-zinc-500">닉네임</TableHead>
              <TableHead className="text-zinc-500">등급 (Tier)</TableHead>
              <TableHead className="text-zinc-500">총 입금액</TableHead>
              <TableHead className="text-zinc-500">최근 활동</TableHead>
              <TableHead className="text-zinc-500">상태</TableHead>
              <TableHead className="text-right text-zinc-500">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id} className="border-zinc-800 hover:bg-white/5 transition-colors">
                <TableCell className="font-mono text-zinc-400">#{user.id}</TableCell>
                <TableCell className="font-medium text-white">{user.nickname}</TableCell>
                <TableCell>
                    <Badge variant="secondary" className={cn(
                        "bg-zinc-800 text-zinc-300 border-zinc-700",
                        user.tier === 'VIP' && "bg-purple-500/10 text-purple-400 border-purple-500/20",
                        user.tier === 'VVIP' && "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    )}>
                        {user.tier}
                    </Badge>
                </TableCell>
                <TableCell className="text-zinc-300">
                    {user.total_deposit.toLocaleString()}원
                </TableCell>
                <TableCell className="text-zinc-400 text-xs">
                    {user.last_active}
                </TableCell>
                <TableCell>
                    <div className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
                        user.status === 'Active' ? "bg-green-500/10 text-green-500" : 
                        user.status === 'Suspended' ? "bg-red-500/10 text-red-500" : "bg-zinc-500/10 text-zinc-500"
                    )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", 
                             user.status === 'Active' ? "bg-green-500" : 
                             user.status === 'Suspended' ? "bg-red-500" : "bg-zinc-500"
                        )} />
                        {user.status}
                    </div>
                </TableCell>
                <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800">
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white hover:bg-zinc-800">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
