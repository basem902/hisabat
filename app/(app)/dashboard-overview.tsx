"use client";

import * as React from "react";
import Link from "next/link";
import {
  Coins,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { round2 } from "@/lib/balance";

type Color = "blue" | "emerald" | "amber" | "red";

const COLORS: Record<Color, string> = {
  blue: "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400",
  emerald:
    "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  amber:
    "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
  red: "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400",
};

interface MonthSet {
  dueAmount: number | null;
  expected: number;
  collected: number;
  expenses: number;
  activeCount: number;
  monthLabel: string;
}
interface AllSet {
  obligation: number;
  collected: number;
  expenses: number;
  outstanding: number;
  balance: number;
}

export function DashboardOverview({
  currency,
  month,
  all,
  collectionRate,
  counters,
  topDebtors,
}: {
  currency: string;
  month: MonthSet;
  all: AllSet;
  collectionRate: number;
  counters: { debtors: number; compliant: number; surplus: number };
  topDebtors: { id: number; name: string; owed: number }[];
}) {
  const [period, setPeriod] = React.useState<"month" | "all">("month");

  const cards =
    period === "month"
      ? [
          {
            icon: <Coins className="w-5 h-5" />,
            color: "blue" as Color,
            label: "مستحق الشهر",
            value:
              month.dueAmount != null
                ? formatCurrency(month.dueAmount, currency)
                : "—",
            note: "على كل ساكن",
          },
          {
            icon: <Wallet className="w-5 h-5" />,
            color: "blue" as Color,
            label: "المتوقّع",
            value: formatCurrency(month.expected, currency),
            note: `${month.activeCount} ساكن`,
          },
          {
            icon: <TrendingUp className="w-5 h-5" />,
            color: "emerald" as Color,
            label: "المحصّل",
            value: formatCurrency(month.collected, currency),
          },
          {
            icon: <TrendingDown className="w-5 h-5" />,
            color: "red" as Color,
            label: "المصروفات",
            value: formatCurrency(month.expenses, currency),
          },
        ]
      : [
          {
            icon: <Wallet className="w-5 h-5" />,
            color: "blue" as Color,
            label: "إجمالي المستحقات",
            value: formatCurrency(all.obligation, currency),
            note: "كل الفترة",
          },
          {
            icon: <TrendingUp className="w-5 h-5" />,
            color: "emerald" as Color,
            label: "إجمالي المحصّل",
            value: formatCurrency(all.collected, currency),
            note: "اشتراكات + طوارئ",
          },
          {
            icon: <AlertTriangle className="w-5 h-5" />,
            color: "amber" as Color,
            label: "المتأخرات",
            value: formatCurrency(all.outstanding, currency),
          },
          {
            icon: <TrendingDown className="w-5 h-5" />,
            color: "red" as Color,
            label: "إجمالي المصروفات",
            value: formatCurrency(all.expenses, currency),
          },
        ];

  const net =
    period === "month" ? round2(month.collected - month.expenses) : all.balance;
  const netPositive = net >= 0;
  const netLabel = period === "month" ? "صافي الشهر" : "رصيد الصندوق المتبقّي";
  const netNote =
    period === "month" ? "(المحصّل − المصروفات)" : "(كل المحصّل − كل المصروفات)";

  return (
    <div className="space-y-3">
      {/* Period toggle */}
      <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-900">
        <button
          onClick={() => setPeriod("month")}
          className={cn(
            "px-3 py-1.5 text-sm rounded-lg cursor-pointer transition-colors",
            period === "month"
              ? "bg-white dark:bg-slate-700 shadow-sm font-semibold"
              : "text-slate-500 dark:text-slate-400"
          )}
        >
          {month.monthLabel}
        </button>
        <button
          onClick={() => setPeriod("all")}
          className={cn(
            "px-3 py-1.5 text-sm rounded-lg cursor-pointer transition-colors",
            period === "all"
              ? "bg-white dark:bg-slate-700 shadow-sm font-semibold"
              : "text-slate-500 dark:text-slate-400"
          )}
        >
          كل الفترة
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    COLORS[c.color]
                  )}
                >
                  {c.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {c.label}
                  </p>
                  <p className="text-base font-bold tabular-nums truncate">
                    {c.value}
                  </p>
                  {c.note && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      {c.note}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-3">
        {/* Net / fund balance */}
        <Card
          className={cn(
            !netPositive && "border-red-200 dark:border-red-500/40"
          )}
        >
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="font-semibold">{netLabel}</p>
              <Badge variant={netPositive ? "success" : "danger"}>
                {netPositive ? "فائض" : "عجز"}
              </Badge>
            </div>
            <p
              className={cn(
                "text-2xl lg:text-3xl font-bold tabular-nums",
                netPositive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {formatCurrency(net, currency)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {netNote}
            </p>
          </CardContent>
        </Card>

        {/* Collection-rate ring */}
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <Ring value={collectionRate} />
            <div className="min-w-0">
              <p className="font-semibold">نسبة التحصيل</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                من إجمالي المستحقات (اشتراكات + طوارئ)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Counters + top debtors */}
        <Card>
          <CardContent className="p-5">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Counter
                icon={<AlertTriangle className="w-4 h-4" />}
                color="amber"
                value={counters.debtors}
                label="متأخّرون"
              />
              <Counter
                icon={<CheckCircle2 className="w-4 h-4" />}
                color="emerald"
                value={counters.compliant}
                label="منتظمون"
              />
              <Counter
                icon={<PiggyBank className="w-4 h-4" />}
                color="blue"
                value={counters.surplus}
                label="لديهم فائض"
              />
            </div>
            {topDebtors.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-3">
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-1.5">
                  أكبر المدينين
                </p>
                <div className="space-y-1">
                  {topDebtors.map((d) => (
                    <Link
                      key={d.id}
                      href={`/neighbors/${d.id}`}
                      className="flex items-center justify-between text-sm hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded px-1 py-0.5"
                    >
                      <span className="truncate">{d.name}</span>
                      <span className="tabular-nums text-amber-600 dark:text-amber-400 font-medium shrink-0">
                        {formatCurrency(d.owed, currency)}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const offset = circ * (1 - v / 100);
  const colorClass =
    v >= 80 ? "stroke-emerald-500" : v >= 50 ? "stroke-amber-500" : "stroke-red-500";
  return (
    <div className="relative w-20 h-20 shrink-0">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="8"
          className="stroke-slate-200 dark:stroke-slate-700"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={cn("transition-all", colorClass)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold tabular-nums">{v}%</span>
      </div>
    </div>
  );
}

function Counter({
  icon,
  color,
  value,
  label,
}: {
  icon: React.ReactNode;
  color: Color;
  value: number;
  label: string;
}) {
  return (
    <div>
      <div
        className={cn(
          "w-8 h-8 mx-auto rounded-lg flex items-center justify-center mb-1",
          COLORS[color]
        )}
      >
        {icon}
      </div>
      <p className="text-lg font-bold tabular-nums leading-none">{value}</p>
      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
        {label}
      </p>
    </div>
  );
}
