import { Button } from "../../../components/ui/button";
import { ShineBorder } from "../../components/ui/ShineBorder";
import { Bell } from "lucide-react";
import { useAdminDeposits } from "../../../hooks/useV2Admin"; // Updated Hook Path
import type { AdminDepositDto } from "../../../api/adminApi";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../../components/ui/table"; // Corrected Import Path for V2

export default function CCDepositPage() {
  const { data: deposits = [], refetch } = useAdminDeposits();

  return (
    <div className="space-y-6 h-full p-6 text-white min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            CC 입금 관리 (Deposit Ops - V2 Updated)
          </h1>
          <p className="text-sm text-zinc-400">
            외부 CC 입금 내역을 수동으로 확인하고 승인합니다.
          </p>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => refetch()}>
          <Bell className="w-4 h-4" />
          새로고침
        </Button>
      </div>

      <div className="w-full">
        {/* Table Section */}
        <div className="rounded-xl border border-white/5 bg-[#18181B] overflow-hidden">
          {deposits.length === 0 ? (
            <div className="text-center py-20 text-zinc-500">
              대기 중인 입금 요청이 없습니다.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-white/5">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="text-zinc-400 w-[60px]">ID</TableHead>
                  <TableHead className="text-zinc-400">User</TableHead>
                  <TableHead className="text-zinc-400">Amount</TableHead>
                  <TableHead className="text-zinc-400 text-center">
                    Count
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((item: AdminDepositDto) => (
                  <TableRow
                    key={item.id}
                    className="border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <TableCell className="font-mono text-zinc-500 py-4">
                      #{item.id}
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">
                          {item.nickname || "(미설정)"}
                        </span>
                        <span className="text-xs text-zinc-500">
                          ID: {item.userId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-lg text-white py-4">
                      {item.isNew ? (
                        <ShineBorder
                          className="inline-block px-2 py-0.5 rounded text-sm bg-zinc-800"
                          color={["#D2FD9C", "#FFD700"]}
                        >
                          ₩ {item.amount.toLocaleString()}
                        </ShineBorder>
                      ) : (
                        <span>₩ {item.amount.toLocaleString()}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center font-mono text-zinc-400 py-4">
                      {item.depositCount ?? 0}회
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
