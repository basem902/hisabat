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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MonthPicker } from "@/components/month-picker";
import { formatCurrency, monthName } from "@/lib/utils";
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

export function ReportsClient({
  buildingName,
  currency,
}: {
  buildingName: string;
  currency: string;
}) {
  const now = new Date();
  const [year, setYear] = React.useState(now.getFullYear());
  const [month, setMonth] = React.useState(now.getMonth() + 1);
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [downloading, setDownloading] = React.useState(false);

  React.useEffect(() => {
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
        const totalCollected = (payments as { amount: number }[]).reduce(
          (s, p) => s + p.amount,
          0
        );
        const totalExpenses = (expenses as { amount: number }[]).reduce(
          (s, e) => s + e.amount,
          0
        );
        setSummary({
          monthlyAmount,
          totalExpected,
          totalCollected,
          totalExpenses,
          net: totalCollected - totalExpenses,
          paidCount: payments.length,
          unpaidCount: active.length - payments.length,
          activeNeighborsCount: active.length,
          expensesCount: expenses.length,
        });
      })
      .catch(() => toast.error("تعذّر تحميل البيانات"))
      .finally(() => setLoading(false));
  }, [year, month]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">التقارير</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            تقرير شهري شامل قابل للتصدير PDF
          </p>
        </div>
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
                <p className="text-xs text-slate-500 dark:text-slate-400">{buildingName}</p>
                <h2 className="text-xl font-bold">
                  تقرير {monthName(month)} {year}
                </h2>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleView}
                disabled={loading}
              >
                <FileText className="w-4 h-4" />
                معاينة
              </Button>
              <Button onClick={handleDownload} disabled={loading || downloading}>
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
                          (summary.paidCount / summary.activeNeighborsCount) * 100
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
    emerald: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
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
            <p className="text-base font-bold tabular-nums truncate">
              {value}
            </p>
            {note && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{note}</p>
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
