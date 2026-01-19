
import { cn } from "../../../lib/utils";

// In a real implementation, this would use Framer Motion for counting up animation
export const NumberTicker = ({ value, className }: { value: number, className?: string }) => {
  return <span className={cn("inline-block", className)}>{value.toLocaleString()}</span>;
};
