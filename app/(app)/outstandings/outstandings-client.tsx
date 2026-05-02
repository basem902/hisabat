"use client";

import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Phone,
  ChevronLeft,
  Wallet,
  TrendingUp,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, monthName } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface MonthDebt {
  year: number;
  month: number;
  expected: number;
  paid: number;
  owed: number;
}

interface NeighborDebt {
  id: number;
  name: string;
  apartmentNumber: string | null;
  phone: string | null;
  active: boolean;
  totalOwed: number;
  monthsCount: number;
  missingMonths: MonthDebt[];
}

interface Summary {
  currency: string;
  totalOutstanding: number;
  totalExpected: number;
  totalCollected: number;
  monthsTracked: number;
  debtorsCount: number;
  activeCount: number;
  neighbors: NeighborDebt[];
}

export function OutstandingsClient() {
  const [data, setData] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    fetch("/api/outstandings")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400 dark:text-slate-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-center text-slate-400 dark:text-slate-500 py-12">
        تعذّر تحميل البيانات
      </p>
    );
  }

  const debtors = data.neighbors.filter((n) => n.totalOwed > 0);
  const upToDate = data.neighbors.filter((n) => n.totalOwed === 0 && n.active);
  const collectionRate =
    data.totalExpected > 0
      ? Math.round((data.totalCollected / data.totalExpected) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المتأخرات</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          المبلغ المتبقي من جميع الأشهر السابقة + من عليه ديون
        </p>
      </div>

      {data.monthsTracked === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="font-semibold mb-1">لا توجد بيانات بعد</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ابدأ بتحديد المبلغ المستحق لشهر من شاشة المدفوعات
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Big total */}
          <Card
            className={cn(
              data.totalOutstanding > 0
                ? "border-amber-200 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-500/5"
                : "border-emerald-200 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/5"
            )}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0",
                    data.totalOutstanding > 0
                      ? "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {data.totalOutstanding > 0 ? (
                    <AlertCircle className="w-8 h-8" />
                  ) : (
                    <CheckCircle2 className="w-8 h-8" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    إجمالي المبلغ المتبقي
                  </p>
                  <p
                    className={cn(
                      "text-3xl lg:text-4xl font-bold tabular-nums mt-1",
                      data.totalOutstanding > 0
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-emerald-700 dark:text-emerald-300"
                    )}
                  >
                    {formatCurrency(data.totalOutstanding, data.currency)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {data.totalOutstanding > 0
                      ? `${data.debtorsCount} ساكن عليهم مبالغ متأخرة`
                      : "كل الجيران سددوا مستحقاتهم"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              icon={<Wallet className="w-5 h-5" />}
              color="blue"
              label="إجمالي المستحق"
              value={formatCurrency(data.totalExpected, data.currency)}
              note={`${data.monthsTracked} شهر`}
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              color="emerald"
              label="إجمالي المحصّل"
              value={formatCurrency(data.totalCollected, data.currency)}
              note={`${collectionRate}% نسبة التحصيل`}
            />
            <StatCard
              icon={<Users className="w-5 h-5" />}
              color="amber"
              label="ملتزمون"
              value={`${upToDate.length} / ${data.activeCount}`}
              note="ساكن نشط"
            />
          </div>

          {/* Debtors list */}
          {debtors.length > 0 ? (
            <div>
              <h2 className="text-lg font-semibold mb-3">
                المتأخّرون ({debtors.length})
              </h2>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                {debtors.map((n) => (
                  <div
                    key={n.id}
                    className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <button
                      onClick={() => toggle(n.id)}
                      className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-right cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{n.name}</p>
                          {n.apartmentNumber && (
                            <Badge>شقة {n.apartmentNumber}</Badge>
                          )}
                          {!n.active && <Badge variant="warning">غير نشط</Badge>}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {n.monthsCount} شهر متأخر
                          {n.phone && (
                            <>
                              {" • "}
                              <a
                                href={`tel:${n.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                <Phone className="w-3 h-3" />
                                {n.phone}
                              </a>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-3">
                        <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                          {formatCurrency(n.totalOwed, data.currency)}
                        </p>
                        <ChevronLeft
                          className={cn(
                            "w-5 h-5 text-slate-400 transition-transform",
                            expanded.has(n.id) && "-rotate-90"
                          )}
                        />
                      </div>
                    </button>
                    {expanded.has(n.id) && (
                      <div className="px-5 pb-4 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                          {n.missingMonths.map((m) => (
                            <div
                              key={`${m.year}-${m.month}`}
                              className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                            >
                              <span className="text-slate-700 dark:text-slate-300">
                                {monthName(m.month)} {m.year}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                                {m.paid > 0 ? (
                                  <>
                                    دُفع{" "}
                                    {formatCurrency(m.paid, data.currency)} من{" "}
                                    {formatCurrency(m.expected, data.currency)}
                                  </>
                                ) : (
                                  <>لم يدفع</>
                                )}
                              </span>
                              <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                                {formatCurrency(m.owed, data.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 dark:text-emerald-400 mb-3" />
                <p className="font-semibold mb-1">لا يوجد متأخّرات</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  جميع الجيران سددوا كامل مستحقاتهم
                </p>
              </CardContent>
            </Card>
          )}

          {upToDate.length > 0 && debtors.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">
                الملتزمون ({upToDate.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {upToDate.map((n) => (
                  <Badge key={n.id} variant="success">
                    {n.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  color,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  color: "blue" | "emerald" | "amber" | "red";
  label: string;
  value: string;
  note?: string;
}) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400",
    emerald:
      "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    amber:
      "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
    red: "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              colors[color]
            )}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {label}
            </p>
            <p className="text-base font-bold tabular-nums truncate">
              {value}
            </p>
            {note && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {note}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
