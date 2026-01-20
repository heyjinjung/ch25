import { Switch } from "../../../components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Eye, Power } from "lucide-react";

export default function ModalControlPage() {
  const modals = [
    {
      id: "welcome",
      title: "Welcome Modal",
      desc: "신규 가입 시 1회 노출",
      active: true,
      tag: "System",
    },
    {
      id: "crisis",
      title: "Crisis Intervention",
      desc: "위기(연패) 감지 시 노출",
      active: true,
      tag: "Golden",
    },
    {
      id: "event_xmas",
      title: "X-mas Event",
      desc: "크리스마스 시즌 이벤트 모달",
      active: false,
      tag: "Marketing",
    },
    {
      id: "notice_maintenance",
      title: "Maintenance",
      desc: "긴급 점검 공지",
      active: false,
      tag: "System",
    },
  ];

  return (
    <div className="space-y-6 text-white p-6 h-full">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">
            모달 제어 (Modal Control)
          </h1>
          <p className="text-sm text-zinc-400">
            사용자에게 노출되는 전역 모달의 활성 상태를 제어합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <Power className="w-4 h-4 text-red-500" />
          <span className="text-sm font-bold text-red-400">
            Global Kill Switch
          </span>
          <Switch className="data-[state=checked]:bg-red-500" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modals.map((modal) => (
          <Card
            key={modal.id}
            className="bg-[#18181B] border-white/5 hover:border-white/10 transition-colors"
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium text-white flex items-center gap-2">
                    {modal.title}
                    <Badge
                      variant="secondary"
                      className="text-[10px] h-5 px-1.5 bg-zinc-800 text-zinc-400"
                    >
                      {modal.tag}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-500">
                    {modal.desc}
                  </CardDescription>
                </div>
                <Switch checked={modal.active} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="pt-2 border-t border-white/5 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-zinc-400 hover:text-white"
                >
                  <Eye className="w-3 h-3 mr-2" />
                  미리보기
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
