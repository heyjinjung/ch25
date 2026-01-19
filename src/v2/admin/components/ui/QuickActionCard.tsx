
import { cn } from "../../../lib/utils";

interface QuickActionCardProps {
    title: string;
    description: string;
    icon: any;
    colorClass: string;
    bgClass: string;
    onClick?: () => void;
}

export const QuickActionCard = ({ 
    title, 
    description, 
    icon: Icon, 
    colorClass, 
    bgClass,
    onClick
}: QuickActionCardProps) => (
    <div 
      className="flex flex-col p-6 rounded-xl bg-[#1C1C1E] border border-white/5 hover:border-white/10 transition-all cursor-pointer group"
      onClick={onClick}
    >
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110", bgClass)}>
            <Icon className={cn("w-5 h-5", colorClass)} />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
        <p className="text-zinc-500 text-xs font-medium">{description}</p>
    </div>
);
