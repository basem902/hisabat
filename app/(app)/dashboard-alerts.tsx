import Link from "next/link";
import { AlertTriangle, TrendingDown, Zap, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface DashboardAlert {
  kind: "fund" | "overdue" | "emergency";
  title: string;
  detail: string;
  href?: string;
}

const ICON = {
  fund: TrendingDown,
  overdue: AlertTriangle,
  emergency: Zap,
} as const;

export function DashboardAlerts({ alerts }: { alerts: DashboardAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map((a) => {
        const Icon = ICON[a.kind];
        const danger = a.kind === "fund";
        return (
          <Card
            key={a.kind}
            className={cn(
              danger
                ? "border-red-200 dark:border-red-500/40 bg-red-50/50 dark:bg-red-500/5"
                : "border-amber-200 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-500/5"
            )}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                  danger
                    ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                    : "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                )}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{a.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                  {a.detail}
                </p>
              </div>
              {a.href && (
                <Link
                  href={a.href}
                  className={cn(
                    "text-xs font-medium hover:underline inline-flex items-center gap-1 shrink-0",
                    danger
                      ? "text-red-600 dark:text-red-400"
                      : "text-amber-600 dark:text-amber-400"
                  )}
                >
                  عرض
                  <ArrowLeft className="w-3 h-3" />
                </Link>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
