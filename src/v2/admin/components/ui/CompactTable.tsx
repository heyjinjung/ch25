import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { cn } from "../../../lib/utils";

/**
 * CompactTable Wrapper
 * Reduces padding and font size for high-density data display
 */

const CompactTableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <TableCell
    ref={ref}
    className={cn("py-2 px-3 text-xs", className)}
    {...props}
  />
));
CompactTableCell.displayName = "CompactTableCell";

const CompactTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <TableHead
    ref={ref}
    className={cn("h-8 px-3 text-xs font-semibold bg-white/5 text-zinc-300", className)}
    {...props}
  />
));
CompactTableHead.displayName = "CompactTableHead";

export {
  Table as CompactTableRoot,
  TableHeader,
  TableBody,
  TableRow,
  CompactTableHead,
  CompactTableCell,
};
