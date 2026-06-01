"use client";

import * as React from "react";
import { Wallet, ChevronDown, TrendingUp, Zap, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

interface Breakdown {
  subscriptions: number;
  emergency: number;
  totalCollected: number;
  totalExpenses: number;
  balance: number;
}

export function FundBreakdown({
  breakdown,
  currency,
}: {
  breakdown: Breakdown;
  currency: string;
}) {
  const [open, setOpen] = React.useState(false);
  const positive = breakdown.balance >= 0;

  return (
    <Card
      className={cn(
        positive
          ? "border-emerald-200 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/5"
          : "border-red-200 dark:border-red-500/40 bg-red-50/50 dark:bg-red-500/5"
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0",
              positive
                ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
            )}
          >
            <Wallet className="w-8 h-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              صافي رصيد الصندوق
            </p>
            <p
              className={cn(
                "text-3xl lg:text-4xl font-bold tabular-nums mt-1",
                positive
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-red-700 dark:text-red-300"
              )}
            >
              {formatCurrency(breakdown.balance, currency)}
            </p>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            عرض التفاصيل
            <ChevronDown
              className={cn("w-4 h-4 transition-transform", open && "rotate-180")}
            />
          </button>
        </div>

        {open && (
          <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700 space-y-2.5">
            <Row
              icon={<TrendingUp className="w-4 h-4" />}
              color="emerald"
              label="اشتراكات شهرية مستلمة"
              value={`+${formatCurrency(breakdown.subscriptions, currency)}`}
            />
            <Row
              icon={<Zap className="w-4 h-4" />}
              color="blue"
              label="رسوم طوارئ مستلمة"
              value={`+${formatCurrency(breakdown.emergency, currency)}`}
            />
            <Row
              icon={<TrendingDown className="w-4 h-4" />}
              color="red"
              label="إجمالي المصروفات"
              value={`−${formatCurrency(breakdown.totalExpenses, currency)}`}
            />
            <div className="flex items-center justify-between pt-2.5 mt-1 border-t border-slate-200 dark:border-slate-700">
              <span className="text-sm font-semibold">= صافي الصندوق</span>
              <span
                className={cn(
                  "text-base font-bold tabular-nums",
                  positive
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {formatCurrency(breakdown.balance, currency)}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
              إجمالي المحصّل {formatCurrency(breakdown.totalCollected, currency)}{" "}
              (اشتراكات + طوارئ) − المصروفات.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  icon,
  color,
  label,
  value,
}: {
  icon: React.ReactNode;
  color: "emerald" | "blue" | "red";
  label: string;
  value: string;
}) {
  const colors = {
    emerald: "text-emerald-600 dark:text-emerald-400",
    blue: "text-blue-600 dark:text-blue-400",
    red: "text-red-600 dark:text-red-400",
  };
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
        <span className={colors[color]}>{icon}</span>
        {label}
      </span>
      <span className={cn("text-sm font-semibold tabular-nums", colors[color])}>
        {value}
      </span>
    </div>
  );
}
