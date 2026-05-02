import * as React from "react";
import { cn } from "@/lib/utils";

export const Table = ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:border-slate-800 dark:bg-slate-900">
    <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
  </div>
);

export const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead
    className={cn(
      "bg-slate-50 dark:bg-slate-950 [&_tr]:border-b border-slate-200 dark:border-slate-700",
      className
    )}
    {...props}
  />
);

export const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
);

export const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={cn(
      "border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:hover:bg-slate-800/30 transition-colors",
      className
    )}
    {...props}
  />
);

export const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      "h-11 px-4 text-right align-middle font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide",
      className
    )}
    {...props}
  />
);

export const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    className={cn(
      "px-4 py-3 align-middle text-slate-700 dark:text-slate-300",
      className
    )}
    {...props}
  />
);

export const TableEmpty = ({ message }: { message: string }) => (
  <tr>
    <td
      colSpan={99}
      className="p-8 text-center text-slate-400 dark:text-slate-500"
    >
      {message}
    </td>
  </tr>
);
