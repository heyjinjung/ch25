import React from 'react';
import { cn } from "../../../lib/utils";
import { TrendingUp } from 'lucide-react';

export const BentoGrid = ({ children, className }: { children: React.ReactNode; className?: string }) => {
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

export const BentoCard = ({
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
