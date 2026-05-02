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
import { MonthlyReport, type ReportData } from "@/lib/pdf/report";
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

  const activeNeighbors = allNeighbors.filter((n) => n.active);
  const neighborById = new Map(allNeighbors.map((n) => [n.id, n]));
  const paidIds = new Set(monthPayments.map((p) => p.neighborId));

  const totalExpected = monthlyAmount * activeNeighbors.length;
  const totalCollected = monthPayments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses = monthExpenses.reduce((s, e) => s + e.amount, 0);

  const data: ReportData = {
    buildingName,
    monthLabel: monthName(month),
    year,
    currency,
    monthlyAmount,
    monthlyAmountSet: !!monthDue,
    totalExpected,
    totalCollected,
    totalExpenses,
    net: totalCollected - totalExpenses,
    activeNeighborsCount: activeNeighbors.length,
    paid: monthPayments.map((p) => {
      const n = neighborById.get(p.neighborId);
      return {
        name: n?.name ?? "محذوف",
        apartmentNumber: n?.apartmentNumber ?? null,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        paidAt: p.paidAt,
        notes: p.notes,
      };
    }),
    unpaid: activeNeighbors
      .filter((n) => !paidIds.has(n.id))
      .map((n) => ({
        name: n.name,
        apartmentNumber: n.apartmentNumber,
      })),
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
