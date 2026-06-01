"use client";

import * as React from "react";
import {
  Download,
  Loader2,
  Wallet,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  FileText,
  Coins,
  Calendar,
  CalendarRange,
  PiggyBank,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MonthPicker } from "@/components/month-picker";
import { cn, formatCurrency, monthName } from "@/lib/utils";
import { toast } from "sonner";

interface Summary {
  monthlyAmount: number | null;
  totalExpected: number;
  totalCollected: number;
  totalExpenses: number;
  net: number;
  paidCount: number;
  unpaidCount: number;
  activeNeighborsCount: number;
  expensesCount: number;
}

interface RangeData {
  from: { year: number; month: number };
  to: { year: number; month: number };
  perMonth: {
    year: number;
    month: number;
    expected: number;
    collected: number;
    expenses: number;
    net: number;
    collectionRate: number;
  }[];
  totals: {
    expected: number;
    collected: number;
    emergencyObligation: number;
    emergencyCollected: number;
    emergencyOutstanding: number;
    expenses: number;
    net: number;
    outstanding: number;
    surplus: number;
    collectionRate: number;
  };
  fund: { opening: number; closing: number; change: number };
  emergencyCharges: {
    id: number;
    title: string;
    chargeDate: string;
    obligation: number;
    collected: number;
    outstanding: number;
    payers: number;
    assignees: number;
  }[];
  neighbors: { id: number }[];
}

export function ReportsClient({
  buildingName,
  currency,
}: {
  buildingName: string;
  currency: string;
}) {
  const now = new Date();
  const [mode, setMode] = React.useState<"single" | "range">("single");

  // Single-month state
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [downloading, setDownloading] = React.useState(false);

  // Range state (default: last 3 months)
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const [fromYear, setFromYear] = React.useState(start.getFullYear());
  const [fromMonth, setFromMonth] = React.useState(start.getMonth() + 1);
  const [toYear, setToYear] = React.useState(now.getFullYear());
  const [toMonth, setToMonth] = React.useState(now.getMonth() + 1);
  const [rangeData, setRangeData] = React.useState<RangeData | null>(null);
  const [rangeLoading, setRangeLoading] = React.useState(false);

  React.useEffect(() => {
    if (mode !== "single") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([
      fetch("/api/neighbors").then((r) => r.json()),
      fetch(`/api/payments?year=${year}&month=${month}`).then((r) => r.json()),
      fetch(`/api/expenses?year=${year}&month=${month}`).then((r) => r.json()),
      fetch(`/api/monthly-dues/${year}/${month}`).then((r) => r.json()),
    ])
      .then(([neighbors, payments, expenses, due]) => {
        const active = (neighbors as { active: boolean }[]).filter(
          (n) => n.active
        );
        const monthlyAmount =
          due && typeof due.amount === "number" ? due.amount : null;
        const totalExpected = (monthlyAmount ?? 0) * active.length;
        // Monthly report: only subscription payments (exclude emergency), and
        // count DISTINCT payers — not payment rows.
        const monthly = (
          payments as {
            amount: number;
            neighborId: number;
            specialChargeId: number | null;
          }[]
        ).filter((p) => p.specialChargeId == null);
        const totalCollected = monthly.reduce((s, p) => s + p.amount, 0);
        const totalExpenses = (expenses as { amount: number }[]).reduce(
          (s, e) => s + e.amount,
          0
        );
        const payers = new Set(monthly.map((p) => p.neighborId));
        setSummary({
          monthlyAmount,
          totalExpected,
          totalCollected,
          totalExpenses,
          net: totalCollected - totalExpenses,
          paidCount: payers.size,
          unpaidCount: active.length - payers.size,
          activeNeighborsCount: active.length,
          expensesCount: expenses.length,
        });
      })
      .catch(() => toast.error("تعذّر تحميل البيانات"))
      .finally(() => setLoading(false));
  }, [year, month, mode]);

  const rangeQuery = `from=${fromYear}-${fromMonth}&to=${toYear}-${toMonth}`;

  React.useEffect(() => {
    if (mode !== "range") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRangeLoading(true);
    fetch(`/api/reports/range?${rangeQuery}`)
      .then((r) => r.json())
      .then((d) => setRangeData(d && d.perMonth ? d : null))
      .catch(() => toast.error("تعذّر تحميل بيانات الفترة"))
      .finally(() => setRangeLoading(false));
  }, [mode, rangeQuery]);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/reports/${year}/${month}/pdf`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `تقرير-${monthName(month)}-${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل التقرير");
    } catch {
      toast.error("تعذّر إنشاء التقرير");
    } finally {
      setDownloading(false);
    }
  }

  function handleView() {
    window.open(`/api/reports/${year}/${month}/pdf`, "_blank");
  }

  function rangeView() {
    window.open(`/api/reports/range/pdf?${rangeQuery}`, "_blank");
  }

  async function rangeDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/reports/range/pdf?${rangeQuery}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `تقرير-فترة-${fromMonth}-${fromYear}_${toMonth}-${toYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل تقرير الفترة");
    } catch {
      toast.error("تعذّر إنشاء التقرير");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">التقارير</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            تقارير شهرية وفترات قابلة للتصدير PDF
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
          <button
            onClick={() => setMode("single")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
              mode === "single"
                ? "bg-blue-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <Calendar className="w-4 h-4" />
            شهر واحد
          </button>
          <button
            onClick={() => setMode("range")}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
              mode === "range"
                ? "bg-blue-600 text-white"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            )}
          >
            <CalendarRange className="w-4 h-4" />
            فترة
          </button>
        </div>
      </div>

      {mode === "single" ? (
        <>
          <div className="flex justify-end">
            <MonthPicker
              year={year}
              month={month}
              onChange={(y, m) => {
                setYear(y);
                setMonth(m);
              }}
            />
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <FileText className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {buildingName}
                    </p>
                    <h2 className="text-xl font-bold">
                      تقرير {monthName(month)} {year}
                    </h2>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleView} disabled={loading}>
                    <FileText className="w-4 h-4" />
                    معاينة
                  </Button>
                  <Button
                    onClick={handleDownload}
                    disabled={loading || downloading}
                  >
                    {downloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    تنزيل PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400 dark:text-slate-500" />
            </div>
          ) : summary ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <SumCard
                  icon={<Coins className="w-5 h-5" />}
                  color="blue"
                  label="مستحق الشهر"
                  value={
                    summary.monthlyAmount != null
                      ? formatCurrency(summary.monthlyAmount, currency)
                      : "—"
                  }
                  note="على كل ساكن"
                />
                <SumCard
                  icon={<Wallet className="w-5 h-5" />}
                  color="blue"
                  label="المتوقّع"
                  value={formatCurrency(summary.totalExpected, currency)}
                  note={`${summary.activeNeighborsCount} ساكن`}
                />
                <SumCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  color="emerald"
                  label="المحصّل"
                  value={formatCurrency(summary.totalCollected, currency)}
                  note={`${summary.paidCount} دفعة`}
                />
                <SumCard
                  icon={<TrendingDown className="w-5 h-5" />}
                  color="red"
                  label="المصروفات"
                  value={formatCurrency(summary.totalExpenses, currency)}
                  note={`${summary.expensesCount} عملية`}
                />
                <SumCard
                  icon={
                    summary.net >= 0 ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )
                  }
                  color={summary.net >= 0 ? "emerald" : "red"}
                  label="الصافي"
                  value={formatCurrency(summary.net, currency)}
                  note={summary.net >= 0 ? "فائض" : "عجز"}
                />
              </div>

              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <Stat
                      label="مَن دفع"
                      value={`${summary.paidCount} / ${summary.activeNeighborsCount}`}
                      variant="success"
                    />
                    <Stat
                      label="مَن لم يدفع"
                      value={String(summary.unpaidCount)}
                      variant={summary.unpaidCount === 0 ? "success" : "warning"}
                    />
                    <Stat
                      label="نسبة التحصيل"
                      value={
                        summary.activeNeighborsCount === 0
                          ? "—"
                          : `${Math.round(
                              (summary.paidCount /
                                summary.activeNeighborsCount) *
                                100
                            )}%`
                      }
                      variant="info"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="text-center text-sm text-slate-500 dark:text-slate-400 pt-2">
                اضغط <strong>تنزيل PDF</strong> للحصول على تقرير مفصّل بكل
                الأسماء والمبالغ والمصروفات.
              </div>
            </>
          ) : null}
        </>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4 justify-end">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 text-right">
                من
              </p>
              <MonthPicker
                year={fromYear}
                month={fromMonth}
                onChange={(y, m) => {
                  setFromYear(y);
                  setFromMonth(m);
                }}
              />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1 text-right">
                إلى
              </p>
              <MonthPicker
                year={toYear}
                month={toMonth}
                onChange={(y, m) => {
                  setToYear(y);
                  setToMonth(m);
                }}
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <CalendarRange className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {buildingName}
                    </p>
                    <h2 className="text-xl font-bold">
                      {rangeData
                        ? `${monthName(rangeData.from.month)} ${rangeData.from.year} — ${monthName(rangeData.to.month)} ${rangeData.to.year}`
                        : "تقرير الفترة"}
                    </h2>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={rangeView}
                    disabled={rangeLoading}
                  >
                    <FileText className="w-4 h-4" />
                    معاينة
                  </Button>
                  <Button
                    onClick={rangeDownload}
                    disabled={rangeLoading || downloading}
                  >
                    {downloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    تنزيل PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {rangeLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400 dark:text-slate-500" />
            </div>
          ) : rangeData ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <SumCard
                  icon={<Wallet className="w-5 h-5" />}
                  color="blue"
                  label="المتوقّع"
                  value={formatCurrency(rangeData.totals.expected, currency)}
                  note={`${rangeData.perMonth.length} شهر`}
                />
                <SumCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  color="emerald"
                  label="اشتراكات محصّلة"
                  value={formatCurrency(rangeData.totals.collected, currency)}
                  note={`${rangeData.totals.collectionRate}% نسبة التحصيل`}
                />
                <SumCard
                  icon={<Coins className="w-5 h-5" />}
                  color="blue"
                  label="طوارئ محصّلة"
                  value={formatCurrency(
                    rangeData.totals.emergencyCollected,
                    currency
                  )}
                  note={
                    rangeData.totals.emergencyObligation > 0
                      ? `من ${formatCurrency(rangeData.totals.emergencyObligation, currency)}`
                      : undefined
                  }
                />
                {rangeData.totals.emergencyObligation > 0 && (
                  <SumCard
                    icon={<Zap className="w-5 h-5" />}
                    color="amber"
                    label="طوارئ متبقّية"
                    value={formatCurrency(
                      rangeData.totals.emergencyOutstanding,
                      currency
                    )}
                  />
                )}
                <SumCard
                  icon={<TrendingDown className="w-5 h-5" />}
                  color="red"
                  label="المصروفات"
                  value={formatCurrency(rangeData.totals.expenses, currency)}
                />
                <SumCard
                  icon={
                    rangeData.totals.net >= 0 ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )
                  }
                  color={rangeData.totals.net >= 0 ? "emerald" : "red"}
                  label="الصافي"
                  value={formatCurrency(rangeData.totals.net, currency)}
                  note={rangeData.totals.net >= 0 ? "فائض" : "عجز"}
                />
                <SumCard
                  icon={<AlertCircle className="w-5 h-5" />}
                  color="amber"
                  label="المتبقّي على الجيران"
                  value={formatCurrency(rangeData.totals.outstanding, currency)}
                />
                <SumCard
                  icon={<TrendingUp className="w-5 h-5" />}
                  color="blue"
                  label="أرصدة دائنة (فائض)"
                  value={formatCurrency(rangeData.totals.surplus, currency)}
                />
                <SumCard
                  icon={<PiggyBank className="w-5 h-5" />}
                  color="emerald"
                  label="رصيد الصندوق (ختامي)"
                  value={formatCurrency(rangeData.fund.closing, currency)}
                  note={`من ${formatCurrency(rangeData.fund.opening, currency)}`}
                />
                <SumCard
                  icon={<Coins className="w-5 h-5" />}
                  color={rangeData.fund.change >= 0 ? "emerald" : "red"}
                  label="تغيّر الصندوق"
                  value={`${rangeData.fund.change >= 0 ? "+" : ""}${formatCurrency(rangeData.fund.change, currency)}`}
                />
              </div>

              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold mb-3">التفصيل الشهري</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                          <th className="text-right font-medium py-2 px-2">
                            الشهر
                          </th>
                          <th className="text-left font-medium py-2 px-2">
                            المحصّل
                          </th>
                          <th className="text-left font-medium py-2 px-2">
                            المصروفات
                          </th>
                          <th className="text-left font-medium py-2 px-2">
                            الصافي
                          </th>
                          <th className="text-left font-medium py-2 px-2">
                            نسبة التحصيل
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rangeData.perMonth.map((m) => (
                          <tr
                            key={`${m.year}-${m.month}`}
                            className="border-b border-slate-50 dark:border-slate-800/50 last:border-0"
                          >
                            <td className="text-right py-2 px-2 font-medium">
                              {monthName(m.month)} {m.year}
                            </td>
                            <td className="text-left py-2 px-2 tabular-nums text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(m.collected, currency)}
                            </td>
                            <td className="text-left py-2 px-2 tabular-nums text-red-600 dark:text-red-400">
                              {formatCurrency(m.expenses, currency)}
                            </td>
                            <td
                              className={cn(
                                "text-left py-2 px-2 tabular-nums font-semibold",
                                m.net >= 0
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-600 dark:text-red-400"
                              )}
                            >
                              {formatCurrency(m.net, currency)}
                            </td>
                            <td className="text-left py-2 px-2 tabular-nums text-slate-500 dark:text-slate-400">
                              {m.collectionRate}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {rangeData.emergencyCharges.length > 0 && (
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold">رسوم الطوارئ خلال الفترة</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                            <th className="text-right font-medium py-2 px-2">الرسم</th>
                            <th className="text-left font-medium py-2 px-2">المستحق</th>
                            <th className="text-left font-medium py-2 px-2">المحصّل</th>
                            <th className="text-left font-medium py-2 px-2">المتبقّي</th>
                            <th className="text-left font-medium py-2 px-2">المسددون</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rangeData.emergencyCharges.map((ch) => (
                            <tr
                              key={ch.id}
                              className="border-b border-slate-50 dark:border-slate-800/50 last:border-0"
                            >
                              <td className="text-right py-2 px-2 font-medium">
                                {ch.title}
                                {ch.chargeDate && (
                                  <span className="block text-[11px] font-normal text-slate-400 dark:text-slate-500">
                                    {ch.chargeDate}
                                  </span>
                                )}
                              </td>
                              <td className="text-left py-2 px-2 tabular-nums">
                                {formatCurrency(ch.obligation, currency)}
                              </td>
                              <td className="text-left py-2 px-2 tabular-nums text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(ch.collected, currency)}
                              </td>
                              <td
                                className={cn(
                                  "text-left py-2 px-2 tabular-nums font-semibold",
                                  ch.outstanding > 0
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-slate-400 dark:text-slate-500"
                                )}
                              >
                                {ch.outstanding > 0
                                  ? formatCurrency(ch.outstanding, currency)
                                  : "—"}
                              </td>
                              <td className="text-left py-2 px-2 tabular-nums text-slate-500 dark:text-slate-400">
                                {ch.payers}/{ch.assignees}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-slate-200 dark:border-slate-700 font-semibold">
                            <td className="text-right py-2 px-2">الإجمالي</td>
                            <td className="text-left py-2 px-2 tabular-nums">
                              {formatCurrency(
                                rangeData.totals.emergencyObligation,
                                currency
                              )}
                            </td>
                            <td className="text-left py-2 px-2 tabular-nums text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(
                                rangeData.totals.emergencyCollected,
                                currency
                              )}
                            </td>
                            <td className="text-left py-2 px-2 tabular-nums text-amber-600 dark:text-amber-400">
                              {formatCurrency(
                                rangeData.totals.emergencyOutstanding,
                                currency
                              )}
                            </td>
                            <td className="py-2 px-2" />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="text-center text-sm text-slate-500 dark:text-slate-400 pt-2">
                اضغط <strong>تنزيل PDF</strong> لتقرير الفترة الكامل: مصفوفة دفعات
                (ساكن × شهر) + حالة كل ساكن + رسوم الطوارئ + المصروفات حسب الفئة.
              </div>
            </>
          ) : (
            <p className="text-center text-slate-400 dark:text-slate-500 py-12">
              تعذّر تحميل بيانات الفترة
            </p>
          )}
        </>
      )}
    </div>
  );
}

function SumCard({
  icon,
  color,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  color: "blue" | "emerald" | "red" | "amber";
  label: string;
  value: string;
  note?: string;
}) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400",
    emerald:
      "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    red: "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400",
    amber: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-base font-bold tabular-nums truncate">{value}</p>
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

function Stat({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant: "success" | "warning" | "info";
}) {
  const colors = {
    success: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    info: "text-blue-600 dark:text-blue-400",
  };
  return (
    <div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${colors[variant]}`}>
        {value}
      </p>
    </div>
  );
}
