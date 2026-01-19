import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/v2/lib/utils";
import { Activity, Users, DollarSign, AlertTriangle, TrendingUp, Search, Bell } from 'lucide-react';

// --- Magic UI: NumberTicker (Simplified) ---
const NumberTicker = ({ value, className }: { value: number, className?: string }) => {
  // In a real implementation, this would use Framer Motion for counting up
  return <span className={className}>{value.toLocaleString()}</span>;
};

// --- Magic UI: PulsatingDot (Simplified) ---
const PulsatingDot = ({ color = "#4CAF50" }: { color?: string }) => (
  <span className="relative flex h-2 w-2 mr-2">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }}></span>
    <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: color }}></span>
  </span>
);

// --- Component: Bento Grid Layout ---
const BentoGrid = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className
      )}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
}: {
  name: string;
  className?: string;
  background: React.ReactNode;
  Icon: any;
  description: string;
  href: string;
  cta: string;
}) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-xl",
      // Light mode styles
      "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_5px_rgba(0,0,0,.05),0_10px_30px_rgba(0,0,0,.025)]",
      // Dark mode styles (Soft Obsidian)
      "dark:bg-[#18181B] dark:[box-shadow:0_0_0_1px_rgba(255,255,255,.08),0_2px_5px_rgba(0,0,0,.3),0_10px_30px_rgba(0,0,0,.2)]",
      className
    )}
  >
    <div>{background}</div>
    <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
      <Icon className="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75 dark:text-neutral-300" />
      <h3 className="text-xl font-semibold text-neutral-700 dark:text-neutral-300">
        {name}
      </h3>
      <p className="max-w-lg text-neutral-400">{description}</p>
    </div>

    <div
      className={cn(
        "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
      )}
    >
        <div className="pointer-events-auto">
            <a href={href} className="text-sm font-bold text-primary dark:text-[#D2FD9C] flex items-center gap-1">
                {cta}
                <TrendingUp className="h-3 w-3" />
            </a>
        </div>
    </div>
    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-neutral-800/10" />
  </div>
);

// --- Component: Quick Action Card (Visitors Style) ---
const QuickActionCard = ({ 
    title, 
    description, 
    icon: Icon, 
    colorClass, 
    bgClass 
}: { 
    title: string, 
    description: string, 
    icon: any, 
    colorClass: string, 
    bgClass: string 
}) => (
    <div className="flex flex-col p-6 rounded-xl bg-[#1C1C1E] border border-white/5 hover:border-white/10 transition-all cursor-pointer group">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110", bgClass)}>
            <Icon className={cn("w-5 h-5", colorClass)} />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        <p className="text-zinc-500 text-xs font-medium">{description}</p>
    </div>
);


export default function MarketingCenterPage() {
  return (
    <div className="p-6 space-y-8 h-full bg-[#121214] min-h-screen text-[#E4E4E7] font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold tracking-tight text-white mb-1">마케팅 센터 (Marketing Center)</h1>
           <p className="text-sm text-zinc-400">실시간 KPI 및 마케팅 성과를 모니터링합니다.</p>
        </div>
        <div className="flex items-center gap-2">
            <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <input 
                    type="text" 
                    placeholder="리포트 검색..." 
                    className="h-9 w-64 rounded-md border border-white/10 bg-[#18181B] pl-9 pr-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[#D2FD9C]"
                />
            </div>
            <button className="h-9 w-9 flex items-center justify-center rounded-md border border-white/10 bg-[#18181B] text-zinc-400 hover:text-white hover:bg-white/5">
                <Bell className="h-4 w-4" />
            </button>
        </div>
      </div>

      {/* KPI Section with Visitors Style Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard 
            title="실시간 매출" 
            description="오늘 누적: 1,250,000원" 
            icon={DollarSign} 
            colorClass="text-purple-400" 
            bgClass="bg-purple-500/10" 
          />
          <QuickActionCard 
            title="현재 접속자" 
            description="Active: 234명 (▲15%)" 
            icon={Users} 
            colorClass="text-blue-400" 
            bgClass="bg-blue-500/10" 
          />
           <QuickActionCard 
            title="시스템 상태" 
            description="All Systems Operational" 
            icon={Activity} 
            colorClass="text-orange-400" 
            bgClass="bg-orange-500/10" 
          />
           <QuickActionCard 
            title="골든 레이더" 
            description="위기: 3명 / 기회: 12명" 
            icon={AlertTriangle} 
            colorClass="text-green-400" 
            bgClass="bg-green-500/10" 
          />
      </div>

      {/* Bento Grid Section */}
      <BentoGrid className="grid-cols-1 md:grid-cols-3 auto-rows-[20rem]">
        
        {/* Main Chart (Span 2) */}
        <div className="md:col-span-2 rounded-xl bg-[#18181B] border border-white/5 p-6 flex flex-col justify-between">
             <div className="flex justify-between items-start">
                 <div>
                    <h3 className="text-lg font-bold text-white mb-1">매출 추이 (Revenue Trend)</h3>
                    <p className="text-zinc-500 text-xs text-muted-foreground">지난 7일간의 매출 기록입니다.</p>
                 </div>
                 <Badge variant="outline" className="border-[#D2FD9C]/30 text-[#D2FD9C] bg-[#D2FD9C]/5">
                    +12.5% Growth
                 </Badge>
             </div>
             
             {/* Placeholder for AreaChart */}
             <div className="flex-1 w-full bg-gradient-to-t from-[#D2FD9C]/5 to-transparent mt-4 rounded-lg border border-dashed border-white/10 flex items-center justify-center">
                 <span className="text-zinc-600 text-xs">[Area Chart Placeholder]</span>
             </div>
        </div>

        {/* Side Panel (Span 1) */}
        <div className="md:col-span-1 rounded-xl bg-[#18181B] border border-white/5 p-6 relative overflow-hidden">
             <h3 className="text-lg font-bold text-white mb-4">라이브 피드</h3>
             <div className="space-y-4 relative z-10">
                 {[1, 2, 3, 4, 5].map((i) => (
                     <div key={i} className="flex items-center gap-3 text-sm">
                         <div className="w-2 h-2 rounded-full bg-[#D2FD9C] animate-pulse" />
                         <span className="text-zinc-300">User_{100+i}</span>
                         <span className="ml-auto text-zinc-500 text-xs">구매 완료</span>
                     </div>
                 ))}
             </div>
             
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-[#D2FD9C]/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
        </div>

      </BentoGrid>
      
      {/* Footer / Quick Links */}
      <div className="rounded-xl border border-dashed border-white/10 p-4 bg-[#18181B]/50 flex justify-between items-center text-xs text-zinc-500">
         <span>Last updated: just now</span>
         <div className="flex gap-4">
             <span className="hover:text-white cursor-pointer">보고서 다운로드</span>
             <span className="hover:text-white cursor-pointer">설정</span>
         </div>
      </div>

    </div>
  );
}
