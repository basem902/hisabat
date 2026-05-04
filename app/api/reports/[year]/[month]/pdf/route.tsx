import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { and, asc, eq } from "drizzle-orm";
import {
  db,
  neighbors as neighborsTable,
  payments as paymentsTable,
  expenses as expensesTable,
  settings as settingsTable,
  monthlyDues as monthlyDuesTable,
} from "@/lib/db";
import { getSession } from "@/lib/auth";
import { MonthlyReport, type ReportData, type NeighborStatusRow } from "@/lib/pdf/report";
import { monthName } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const { year: yearStr, month: monthStr } = await params;
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month || month < 1 || month > 12)
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const [
    allNeighbors,
    monthPayments,
    monthExpenses,
    monthDueRows,
    settingsRows,
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
      .orderBy(asc(expensesTable.expenseDate)),
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
  ]);

  const settings = settingsRows[0];
  const buildingName = settings?.buildingName ?? "حسابات المبنى";
  const currency = settings?.currency ?? "ر.س";

  const monthDue = monthDueRows[0];
  const monthlyAmount = monthDue?.amount ?? 0;

  // Active neighbors who joined on/before the end of this month, OR have any payment in this month.
  const monthEnd = new Date(year, month, 0); // last day
  const paymentsByNeighbor = new Map<number, typeof monthPayments>();
  for (const p of monthPayments) {
    const arr = paymentsByNeighbor.get(p.neighborId) ?? [];
    arr.push(p);
    paymentsByNeighbor.set(p.neighborId, arr);
  }

  const eligible = allNeighbors.filter((n) => {
    const created = new Date(n.createdAt);
    if (created > monthEnd) return false;
    if (n.active) return true;
    return paymentsByNeighbor.has(n.id);
  });

  const neighborsStatus: NeighborStatusRow[] = eligible.map((n) => {
    const ps = paymentsByNeighbor.get(n.id) ?? [];
    const paid = ps.reduce((s, p) => s + p.amount, 0);
    const balance = paid - monthlyAmount;
    const last = ps.length > 0
      ? [...ps].sort((a, b) => b.paidAt.localeCompare(a.paidAt))[0]
      : null;
    const notes = ps
      .map((p) => p.notes)
      .filter(Boolean)
      .join(" • ");
    return {
      name: n.name,
      apartmentNumber: n.apartmentNumber,
      due: monthlyAmount,
      paid,
      balance,
      paymentsCount: ps.length,
      paymentMethod:
        ps.length === 0
          ? null
          : ps.length === 1
            ? ps[0].paymentMethod
            : `${ps.length} دفعات`,
      paidAt: last?.paidAt ?? null,
      notes: notes || null,
    };
  });

  // Sort: unpaid first, then by status, then by name
  neighborsStatus.sort((a, b) => {
    const aOrder = a.paid === 0 ? 0 : a.balance < 0 ? 1 : a.balance > 0 ? 3 : 2;
    const bOrder = b.paid === 0 ? 0 : b.balance < 0 ? 1 : b.balance > 0 ? 3 : 2;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name, "ar");
  });

  const totalExpected = monthlyAmount * eligible.length;
  const totalCollected = neighborsStatus.reduce((s, n) => s + n.paid, 0);
  const totalRemaining = neighborsStatus.reduce(
    (s, n) => s + (n.balance < 0 ? -n.balance : 0),
    0
  );
  const totalSurplus = neighborsStatus.reduce(
    (s, n) => s + (n.balance > 0 ? n.balance : 0),
    0
  );
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const paidCount = neighborsStatus.filter((n) => n.paid > 0).length;
  const unpaidCount = neighborsStatus.filter((n) => n.paid === 0).length;

  const data: ReportData = {
    buildingName,
    monthLabel: monthName(month),
    year,
    currency,
    monthlyAmount,
    monthlyAmountSet: !!monthDue,
    totalExpected,
    totalCollected,
    totalRemaining,
    totalSurplus,
    totalExpenses,
    net: totalCollected - totalExpenses,
    activeNeighborsCount: eligible.length,
    paidCount,
    unpaidCount,
    neighbors: neighborsStatus,
    expenses: monthExpenses.map((e) => ({
      expenseDate: e.expenseDate,
      category: e.category,
      description: e.description,
      amount: e.amount,
      notes: e.notes,
    })),
    generatedAt: new Date().toISOString(),
  };

  const buffer = await renderToBuffer(<MonthlyReport data={data} />);
  const filename = `report-${year}-${String(month).padStart(2, "0")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
