"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Phone,
  ChevronLeft,
  Wallet,
  TrendingUp,
  Users,
  MessageCircle,
  Download,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  cn,
  formatCurrency,
  monthName,
  buildReminderMessage,
  whatsAppLink,
} from "@/lib/utils";

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
  surplus: number;
  monthlyOwed: number;
  emergencyOwed: number;
  monthsCount: number;
  missingMonths: MonthDebt[];
  emergencyUnpaid: { title: string; owed: number }[];
}

interface FundBalance {
  totalCollected: number;
  totalExpenses: number;
  balance: number;
}

interface Summary {
  currency: string;
  buildingName: string;
  totalOutstanding: number;
  totalSurplus: number;
  totalExpected: number;
  totalCollected: number;
  monthsTracked: number;
  debtorsCount: number;
  activeCount: number;
  fund: FundBalance;
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

  function exportCSV() {
    if (!data) return;
    const headers = [
      "الاسم",
      "الشقة",
      "الجوال",
      "الحالة",
      "الباقي",
      "الفائض",
      "أشهر متأخرة",
    ];
    const rows = data.neighbors.map((n) => [
      n.name,
      n.apartmentNumber ?? "",
      n.phone ?? "",
      n.active ? "نشط" : "غير نشط",
      String(n.totalOwed),
      String(n.surplus),
      String(n.monthsCount),
    ]);
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows]
      .map((r) => r.map(esc).join(","))
      .join("\r\n");
    // Prepend BOM so Excel reads Arabic UTF-8 correctly.
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `المتأخرات-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
  const upToDate = data.neighbors.filter(
    (n) => n.totalOwed === 0 && n.surplus === 0 && n.active
  );
  const creditors = data.neighbors.filter((n) => n.surplus > 0);
  const collectionRate =
    data.totalExpected > 0
      ? Math.round((data.totalCollected / data.totalExpected) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">المتأخرات</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            المبلغ المتبقي من جميع الأشهر السابقة + من عليه ديون
          </p>
        </div>
        {data.neighbors.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4" />
            تصدير CSV
          </Button>
        )}
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
          {/* Fund balance — actual cash on hand */}
          <Card
            className={cn(
              data.fund.balance >= 0
                ? "border-emerald-200 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/5"
                : "border-red-200 dark:border-red-500/40 bg-red-50/50 dark:bg-red-500/5"
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                    data.fund.balance >= 0
                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400"
                  )}
                >
                  <Wallet className="w-7 h-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    رصيد الصندوق المتبقّي
                  </p>
                  <p
                    className={cn(
                      "text-2xl lg:text-3xl font-bold tabular-nums mt-0.5",
                      data.fund.balance >= 0
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-red-700 dark:text-red-300"
                    )}
                  >
                    {formatCurrency(data.fund.balance, data.currency)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    محصّل {formatCurrency(data.fund.totalCollected, data.currency)}{" "}
                    − مصروفات{" "}
                    {formatCurrency(data.fund.totalExpenses, data.currency)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
              icon={<CheckCircle2 className="w-5 h-5" />}
              color="emerald"
              label="ملتزمون"
              value={`${upToDate.length} / ${data.activeCount}`}
              note="ساكن نشط"
            />
            <StatCard
              icon={<Users className="w-5 h-5" />}
              color="amber"
              label="أرصدة دائنة (فائض)"
              value={formatCurrency(data.totalSurplus, data.currency)}
              note={`${creditors.length} دفعوا مقدّماً`}
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
                          {n.emergencyOwed > 0 && (
                            <Badge variant="info">
                              <Zap className="w-3 h-3" /> طوارئ
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {n.monthsCount} شهر متأخر
                          {n.emergencyOwed > 0 &&
                            ` • طوارئ ${formatCurrency(n.emergencyOwed, data.currency)}`}
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
                              {" • "}
                              <a
                                href={whatsAppLink(
                                  n.phone,
                                  buildReminderMessage({
                                    name: n.name,
                                    amount: formatCurrency(
                                      n.totalOwed,
                                      data.currency
                                    ),
                                    months: n.missingMonths
                                      .map(
                                        (m) => `${monthName(m.month)} ${m.year}`
                                      )
                                      .join("، "),
                                    buildingName: data.buildingName,
                                  })
                                )}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline"
                              >
                                <MessageCircle className="w-3 h-3" />
                                تذكير
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
                          {n.emergencyUnpaid.map((e, i) => (
                            <div
                              key={`${e.title}-${i}`}
                              className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
                            >
                              <span className="inline-flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                                <Zap className="w-3.5 h-3.5" />
                                {e.title}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                رسم طارئ
                              </span>
                              <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                                {formatCurrency(e.owed, data.currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <Link
                          href={`/neighbors/${n.id}`}
                          className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          عرض كشف الحساب الكامل
                          <ChevronLeft className="w-3 h-3" />
                        </Link>
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

          {creditors.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2">
                أرصدة دائنة — دفعوا مقدّماً ({creditors.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                {creditors.map((n) => (
                  <Badge key={n.id} variant="info">
                    {n.name} +{formatCurrency(n.surplus, data.currency)}
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
