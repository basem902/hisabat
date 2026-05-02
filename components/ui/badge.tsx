import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default:
          "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 dark:bg-slate-800 dark:text-slate-300",
        success:
          "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300",
        warning:
          "bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 dark:bg-amber-500/15 dark:text-amber-300",
        danger:
          "bg-red-100 text-red-700 dark:text-red-300 dark:bg-red-500/15 dark:text-red-300",
        info: "bg-blue-100 text-blue-700 dark:text-blue-300 dark:bg-blue-500/15 dark:text-blue-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);
