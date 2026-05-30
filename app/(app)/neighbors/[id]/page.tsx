import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import {
  ArrowRight,
  Phone,
  Wallet,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  FileText,
  Download,
  MessageCircle,
} from "lucide-react";
import {
  db,
  neighbors as neighborsTable,
  payments as paymentsTable,
  monthlyDues as monthlyDuesTable,
  settings as settingsTable,
} from "@/lib/db";
import { buildLedgers } from "@/lib/balance";
import {
  cn,
  formatCurrency,
  formatShortDate,
  monthName,
  whatsAppLink,
  buildReminderMessage,
} from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function NeighborStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!id) notFound();

  const [neighborRows, dues, neighborPayments, settingsRow] = await Promise.all([
    db.select().from(neighborsTable).where(eq(neighborsTable.id, id)).limit(1),
    db.select().from(monthlyDuesTable),
    db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.neighborId, id))
      .orderBy(asc(paymentsTable.paidAt)),
    db.select().from(settingsTable).limit(1),
  ]);

  const neighbor = neighborRows[0];
  if (!neighbor) notFound();

  const currency = settingsRow[0]?.currency ?? "ر.س";
  const buildingName = settingsRow[0]?.buildingName ?? "حسابات المبنى";
  const ledger = buildLedgers([neighbor], dues, neighborPayments)[0];

  const balanceState =
    ledger.owed > 0 ? "owed" : ledger.surplus > 0 ? "surplus" : "settled";

  const reminderUrl =
    ledger.owed > 0 && neighbor.phone
      ? whatsAppLink(
          neighbor.phone,
          buildReminderMessage({
            name: neighbor.name,
            amount: formatCurrency(ledger.owed, currency),
            months: ledger.missingMonths
              .map((m) => `${monthName(m.month)} ${m.year}`)
              .join("، "),
            buildingName,
          })
        )
      : "";

  return (
    <div className="space-y-6">
      <Link
        href="/neighbors"
        className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        <ArrowRight className="w-4 h-4" />
        رجوع لقائمة الجيران
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold">{neighbor.name}</h1>
          {neighbor.apartmentNumber && (
            <Badge>شقة {neighbor.apartmentNumber}</Badge>
          )}
          {neighbor.active ? (
            <Badge variant="success">نشط</Badge>
          ) : (
            <Badge>غير نشط</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 dark:text-slate-400">
          <span>كشف حساب</span>
          {neighbor.phone && (
            <a
              href={`tel:${neighbor.phone}`}
              className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
            >
              <Phone className="w-3 h-3" />
              {neighbor.phone}
            </a>
          )}
        </div>
        {neighbor.notes && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {neighbor.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={`/api/neighbors/${neighbor.id}/statement/pdf`}
          target="_blank"
          rel="noreferrer"
        >
          <Button variant="outline" size="sm">
            <FileText className="w-4 h-4" />
            معاينة PDF
          </Button>
        </a>
        <a href={`/api/neighbors/${neighbor.id}/statement/pdf`} download>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4" />
            تنزيل PDF
          </Button>
        </a>
        {reminderUrl && (
          <a href={reminderUrl} target="_blank" rel="noreferrer">
            <Button variant="success" size="sm">
              <MessageCircle className="w-4 h-4" />
              تذكير واتساب
            </Button>
          </a>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          color="blue"
          label="إجمالي المستحق"
          value={formatCurrency(ledger.obligation, currency)}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          color="emerald"
          label="إجمالي المدفوع"
          value={formatCurrency(ledger.totalPaid, currency)}
        />
        <StatCard
          icon={
            balanceState === "owed" ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <CheckCircle2 className="w-5 h-5" />
            )
          }
          color={
            balanceState === "owed"
              ? "amber"
              : balanceState === "surplus"
                ? "blue"
                : "emerald"
          }
          label={
            balanceState === "owed"
              ? "الباقي عليه"
              : balanceState === "surplus"
                ? "فائض (دفع مقدّم)"
                : "الحالة"
          }
          value={
            balanceState === "owed"
              ? formatCurrency(ledger.owed, currency)
              : balanceState === "surplus"
                ? formatCurrency(ledger.surplus, currency)
                : "مكتمل"
          }
        />
      </div>

      {/* Monthly ledger with running balance */}
      <div>
        <h2 className="text-lg font-semibold mb-3">السجل الشهري</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الشهر</TableHead>
              <TableHead>المستحق</TableHead>
              <TableHead>المدفوع</TableHead>
              <TableHead>الرصيد الجاري</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledger.months.length === 0 && (
              <TableEmpty message="لا توجد مستحقات أو دفعات لهذا الساكن بعد." />
            )}
            {ledger.months.map((m) => (
              <TableRow key={`${m.year}-${m.month}`}>
                <TableCell className="font-medium text-slate-900 dark:text-slate-100">
                  {monthName(m.month)} {m.year}
                </TableCell>
                <TableCell className="tabular-nums">
                  {m.due > 0 ? formatCurrency(m.due, currency) : "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    "tabular-nums font-medium",
                    m.paid > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-slate-400 dark:text-slate-500"
                  )}
                >
                  {m.paid > 0 ? formatCurrency(m.paid, currency) : "—"}
                </TableCell>
                <TableCell
                  className={cn(
                    "tabular-nums font-bold",
                    m.running < 0
                      ? "text-amber-600 dark:text-amber-400"
                      : m.running > 0
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-400 dark:text-slate-500"
                  )}
                >
                  {m.running === 0
                    ? "—"
                    : m.running < 0
                      ? `-${formatCurrency(Math.abs(m.running), currency)}`
                      : `+${formatCurrency(m.running, currency)}`}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
          الرصيد الجاري سالب = متبقٍّ عليه، موجب = دفع مقدّم يُرحّل للأشهر التالية.
        </p>
      </div>

      {/* Payments list */}
      <div>
        <h2 className="text-lg font-semibold mb-3">
          الدفعات ({neighborPayments.length})
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الشهر</TableHead>
              <TableHead>المبلغ</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>الطريقة</TableHead>
              <TableHead>إيصال</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {neighborPayments.length === 0 && (
              <TableEmpty message="لا توجد دفعات مسجّلة." />
            )}
            {neighborPayments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="text-slate-700 dark:text-slate-300">
                  {monthName(p.month)} {p.year}
                </TableCell>
                <TableCell className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(p.amount, currency)}
                </TableCell>
                <TableCell className="tabular-nums text-slate-500 dark:text-slate-400">
                  {formatShortDate(p.paidAt)}
                </TableCell>
                <TableCell className="text-slate-500 dark:text-slate-400">
                  {p.paymentMethod}
                </TableCell>
                <TableCell>
                  {p.receiptUrl ? (
                    <a
                      href={p.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ImageIcon className="w-3 h-3" />
                      عرض
                    </a>
                  ) : (
                    "—"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  color,
  label,
  value,
}: {
  icon: React.ReactNode;
  color: "blue" | "emerald" | "amber" | "red";
  label: string;
  value: string;
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
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="text-base font-bold tabular-nums truncate">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
