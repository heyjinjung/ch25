import { Calendar } from "../../../components/ui/calendar";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../../../components/ui/accordion";

export default function MissionManagerPage() {
  return (
    <div className="space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-1">미션 관리 (Mission Ops)</h1>
        <p className="text-sm text-zinc-400">일일 미션 및 스트릭 보상을 설정합니다.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
              <h3 className="text-lg font-semibold">Streak Schedule</h3>
              <div className="rounded-xl border border-white/5 bg-[#18181B] p-4 flex justify-center">
                <Calendar mode="single" className="rounded-md border-none text-white" />
              </div>
          </div>
          
          <div className="lg:col-span-2 space-y-4">
               <h3 className="text-lg font-semibold">Rewards Configuration</h3>
               <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1" className="border-white/10">
                    <AccordionTrigger>Day 1 Reward</AccordionTrigger>
                    <AccordionContent>
                    Configure rewards for Day 1 login.
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2" className="border-white/10">
                    <AccordionTrigger>Day 7 Reward (Major)</AccordionTrigger>
                    <AccordionContent>
                    Configure major rewards for Day 7 login completion.
                    </AccordionContent>
                </AccordionItem>
                </Accordion>
          </div>
      </div>
    </div>
  );
}
