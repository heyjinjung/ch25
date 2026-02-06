import { useMemo } from "react";
import { ClipboardList } from "lucide-react";

import { Badge } from "../../components/ui/badge";
import {
  CompactTableRoot,
  TableBody,
  TableHeader,
  TableRow,
  CompactTableCell,
  CompactTableHead,
} from "../../components/ui/CompactTable";

import { type OpsCampaignOut, type OpsPlanOut } from "../../../api/adminApi";
import { useAdminFunnelDaily } from "../../../hooks/useAdminGame";
import {
  useAdminOpsCampaigns,
  useAdminOpsPlans,
} from "../../../hooks/useV2Admin";

export default function OpsPlansPage() {
  const days = 14;

  const { data: campaigns, isLoading: isLoadingCampaigns } =
    useAdminOpsCampaigns();

  const { data: plans, isLoading: isLoadingPlans } = useAdminOpsPlans({ days });

  const { data: funnelDaily, isLoading: isLoadingFunnel } = useAdminFunnelDaily(
    {
      days,
    },
  );

  const campaignNameById = useMemo(() => {
    const map = new Map<number, string>();
    (campaigns ?? []).forEach((c: OpsCampaignOut) => {
      map.set(c.id, c.name);
    });
    return map;
  }, [campaigns]);

  const funnelByDate = useMemo(() => {
    const map = new Map<string, any>();
    (funnelDaily?.rows ?? []).forEach((row: any) => {
      map.set(row.business_date, row);
    });
    return map;
  }, [funnelDaily]);

  const rows = useMemo(() => {
    return (plans ?? []).map((p: OpsPlanOut) => {
      const funnel = funnelByDate.get(p.plan_date);
      const botStart = funnel?.bot_start_proxy;
      const firstDeposit = funnel?.first_deposit;
      const conversion =
        typeof botStart === "number" &&
        botStart > 0 &&
        typeof firstDeposit === "number"
          ? firstDeposit / botStart
          : null;

      return {
        plan: p,
        campaignName:
          campaignNameById.get(p.campaign_id) ?? `#${p.campaign_id}`,
        funnel,
        conversion,
      };
    });
  }, [plans, funnelByDate, campaignNameById]);

  const isLoading = isLoadingCampaigns || isLoadingPlans || isLoadingFunnel;

  const formatCountMaybe = (val: unknown) =>
    typeof val === "number" ? val.toLocaleString() : "-";

  const formatPercentMaybe = (val: number | null) =>
    typeof val === "number" ? `${(val * 100).toFixed(1)}%` : "-";

  return (
    <div className="space-y-6 min-h-screen p-6 text-white pb-20">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 mb-2">
            <ClipboardList className="w-8 h-8 text-indigo-400" />
            Ops 플랜 / 퍼널
          </h1>
          <p className="text-zinc-400">
            plan_date 기준으로 ops 플랜과 같은 날짜 퍼널 지표를 함께 봅니다.
          </p>
          <Badge variant="outline" className="mt-3">
            KST 기준
          </Badge>
        </div>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-lg overflow-hidden">
        <CompactTableRoot>
          <TableHeader>
            <TableRow>
              <CompactTableHead>일자</CompactTableHead>
              <CompactTableHead>캠페인</CompactTableHead>
              <CompactTableHead>플랜 상태</CompactTableHead>
              <CompactTableHead className="text-right">
                링크 클릭
              </CompactTableHead>
              <CompactTableHead className="text-right">
                봇 시작(Proxy)
              </CompactTableHead>
              <CompactTableHead className="text-right">
                HQ Join
              </CompactTableHead>
              <CompactTableHead className="text-right">
                첫 입금
              </CompactTableHead>
              <CompactTableHead className="text-right">
                입금 전환
              </CompactTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <CompactTableCell colSpan={8} className="text-zinc-400">
                  불러오는 중…
                </CompactTableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <CompactTableCell colSpan={8} className="text-zinc-400">
                  데이터가 없습니다.
                </CompactTableCell>
              </TableRow>
            ) : (
              rows.map(({ plan, campaignName, funnel, conversion }) => (
                <TableRow key={plan.id}>
                  <CompactTableCell className="font-medium">
                    {plan.plan_date}
                  </CompactTableCell>
                  <CompactTableCell>{campaignName}</CompactTableCell>
                  <CompactTableCell>
                    <Badge variant="secondary">{plan.status}</Badge>
                  </CompactTableCell>
                  <CompactTableCell className="text-right">
                    {formatCountMaybe(funnel?.link_click)}
                  </CompactTableCell>
                  <CompactTableCell className="text-right">
                    {formatCountMaybe(funnel?.bot_start_proxy)}
                  </CompactTableCell>
                  <CompactTableCell className="text-right">
                    {formatCountMaybe(funnel?.hq_join)}
                  </CompactTableCell>
                  <CompactTableCell className="text-right">
                    {formatCountMaybe(funnel?.first_deposit)}
                  </CompactTableCell>
                  <CompactTableCell className="text-right">
                    {formatPercentMaybe(conversion)}
                  </CompactTableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </CompactTableRoot>
      </div>
    </div>
  );
}
