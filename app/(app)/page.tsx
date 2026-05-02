import Link from "next/link";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Receipt,
  Coins,
  Edit3,
} from "lucide-react";
import {
  db,
  neighbors as neighborsTable,
  payments as paymentsTable,
  expenses as expensesTable,
  settings as settingsTable,
  monthlyDues as monthlyDuesTable,
} from "@/lib/db";
import { formatCurrency, formatShortDate, monthName } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DashboardChart } from "./dashboard-chart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const [
    allNeighbors,
    monthPayments,
    monthExpenses,
    monthDueRow,
    settingsRow,
    pastPayments,
    pastExpenses,
  ] = await Promise.all([
    db.select().from(neighborsTable).orderBy(asc(neighborsTable.name)),
    db
      .select()
      .from(paymentsTable)
      .where(
        and(eq(paymentsTable.year, year), eq(paymentsTable.month, month))
      ),
    db
      .select()
      .from(expensesTable)
      .where(
        and(eq(expensesTable.year, year), eq(expensesTable.month, month))
      )
      .orderBy(desc(expensesTable.expenseDate)),
    db
      .select()
      .from(monthlyDuesTable)
      .where(
        and(
          eq(monthlyDuesTable.year, year),
          eq(monthlyDuesTable.month, month)
        )
      )
      .limit(1),
    db.select().from(settingsTable).limit(1),
    db
      .select()
      .from(paymentsTable)
      .where(
        and(
          gte(paymentsTable.year, year - 1),
          lte(paymentsTable.year, year)
        )
      ),
    db
      .select()
      .from(expensesTable)
      .where(
        and(
          gte(expensesTable.year, year - 1),
          lte(expensesTable.year, year)
        )
      ),
  ]);

  const currency = settingsRow[0]?.currency ?? "ر.س";
  const monthDue = monthDueRow[0];
  const activeNeighbors = allNeighbors.filter((n) => n.active);
  const monthlyAmount = monthDue?.amount ?? 0;
  const totalExpected = monthlyAmount * activeNeighbors.length;
  const totalCollected = monthPayments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const net = totalCollected - totalExpenses;

  const paidIds = new Set(monthPayments.map((p) => p.neighborId));
  const unpaid = activeNeighbors.filter((n) => !paidIds.has(n.id));

  // Build last-6-months chart
  const monthsData: { label: string; income: number; expense: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const inc = pastPayments
      .filter((p) => p.year === y && p.month === m)
      .reduce((s, p) => s + p.amount, 0);
    const exp = pastExpenses
      .filter((p) => p.year === y && p.month === m)
      .reduce((s, p) => s + p.amount, 0);
    monthsData.push({
      label: `${monthName(m).slice(0, 3)} ${String(y).slice(2)}`,
      income: inc,
      expense: exp,
    });
  }

  const recentExpenses = monthExpenses.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">اللوحة الرئيسية</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {monthName(month)} {year}
        </p>
      </div>

      {!monthDue && activeNeighbors.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-500/40 bg-amber-50/50 dark:bg-amber-500/5">
          <CardContent className="p-5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">
                  لم تُحدّد قيمة الدفعة لشهر {monthName(month)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  حدّدها لتظهر المتأخّرات والمتوقّعات
                </p>
              </div>
            </div>
            <Link href="/payments">
              <Button>
                <Edit3 className="w-4 h-4" />
                تحديد المبلغ
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Coins className="w-5 h-5" />}
          color="blue"
          label="مستحق الشهر"
          value={monthDue ? formatCurrency(monthlyAmount, currency) : "—"}
          note="على كل ساكن"
        />
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          color="blue"
          label="المتوقّع"
          value={formatCurrency(totalExpected, currency)}
          note={`${activeNeighbors.length} ساكن`}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          color="emerald"
          label="المحصّل"
          value={formatCurrency(totalCollected, currency)}
        />
        <StatCard
          icon={<TrendingDown className="w-5 h-5" />}
          color="red"
          label="المصروفات"
          value={formatCurrency(totalExpenses, currency)}
        />
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold">صافي الشهر</p>
            <Badge variant={net >= 0 ? "success" : "danger"}>
              {net >= 0 ? "فائض" : "عجز"}
            </Badge>
          </div>
          <p
            className={`text-3xl font-bold tabular-nums ${
              net >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {formatCurrency(net, currency)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            (المحصّل − المصروفات)
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold">آخر 6 أشهر</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  المحصّل مقابل المصروفات
                </p>
              </div>
            </div>
            <DashboardChart data={monthsData} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">المتأخّرون</h2>
              <Badge variant={unpaid.length > 0 ? "warning" : "success"}>
                {unpaid.length}
              </Badge>
            </div>
            {!monthDue ? (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">
                حدّد المبلغ المستحق أولاً
              </p>
            ) : unpaid.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 dark:text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  الجميع دفعوا هذا الشهر
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {unpaid.slice(0, 8).map((n) => (
                  <li
                    key={n.id}
                    className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{n.name}</p>
                      {n.apartmentNumber && (
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          شقة {n.apartmentNumber}
                        </p>
                      )}
                    </div>
                    <span className="text-xs tabular-nums text-amber-600 dark:text-amber-400">
                      {formatCurrency(monthlyAmount, currency)}
                    </span>
                  </li>
                ))}
                {unpaid.length > 8 && (
                  <li className="text-xs text-slate-400 dark:text-slate-500 text-center pt-1">
                    و {unpaid.length - 8} آخرين...
                  </li>
                )}
              </ul>
            )}
            <Link
              href="/payments"
              className="mt-3 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              تسجيل دفعة
              <ArrowLeft className="w-3 h-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <h2 className="font-semibold">آخر المصروفات</h2>
            </div>
            <Link
              href="/expenses"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              عرض الكل
              <ArrowLeft className="w-3 h-3" />
            </Link>
          </div>
          {recentExpenses.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">
              لا توجد مصروفات لهذا الشهر بعد
            </p>
          ) : (
            <div className="space-y-1">
              {recentExpenses.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge variant="info">{e.category}</Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {e.description}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {formatShortDate(e.expenseDate)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium tabular-nums shrink-0">
                    {formatCurrency(e.amount, currency)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
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
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}
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
