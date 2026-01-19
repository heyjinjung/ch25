import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";

export default function CCDepositPage() {
  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">입금 관리 (CC Deposit)</h1>
        <p className="text-sm text-zinc-400">CC 입금 내역을 수동으로 승인하거나 반려합니다.</p>
      </div>
      
       <div className="rounded-xl border border-white/5 bg-[#18181B] overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-900/50">
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-zinc-500">Time</TableHead>
              <TableHead className="text-zinc-500">User</TableHead>
              <TableHead className="text-zinc-500">Amount</TableHead>
              <TableHead className="text-zinc-500">Memo</TableHead>
              <TableHead className="text-right text-zinc-500">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
             <TableRow className="border-zinc-800">
                <TableCell colSpan={5} className="text-center py-8 text-zinc-500">
                    No pending deposits.
                </TableCell>
             </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
