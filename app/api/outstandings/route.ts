import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import {
  db,
  neighbors as neighborsTable,
  payments as paymentsTable,
  monthlyDues as monthlyDuesTable,
  settings as settingsTable,
} from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const [allNeighbors, allDues, allPayments, settingsRow] = await Promise.all([
    db.select().from(neighborsTable).orderBy(asc(neighborsTable.name)),
    db
      .select()
      .from(monthlyDuesTable)
      .orderBy(asc(monthlyDuesTable.year), asc(monthlyDuesTable.month)),
    db.select().from(paymentsTable),
    db.select().from(settingsTable).limit(1),
  ]);

  const currency = settingsRow[0]?.currency ?? "ر.س";

  // Index payments by (neighborId, year, month) for quick lookup
  const paymentsByKey = new Map<string, number>();
  for (const p of allPayments) {
    const key = `${p.neighborId}:${p.year}:${p.month}`;
    paymentsByKey.set(key, (paymentsByKey.get(key) ?? 0) + p.amount);
  }

  // Helper: last day of month (date-only string YYYY-MM-DD)
  const endOfMonth = (year: number, month: number) =>
    new Date(year, month, 0); // month is 1-based here, but new Date is 0-based; day=0 = last day of prev month → so this gives last day of `month`

  type MonthDebt = {
    year: number;
    month: number;
    expected: number;
    paid: number;
    owed: number;
  };

  type NeighborDebt = {
    id: number;
    name: string;
    apartmentNumber: string | null;
    phone: string | null;
    active: boolean;
    totalOwed: number;
    monthsCount: number;
    missingMonths: MonthDebt[];
  };

  const result: NeighborDebt[] = [];
  let totalOutstanding = 0;
  let totalExpected = 0;
  let totalCollectedAcrossMonths = 0;

  for (const n of allNeighbors) {
    const createdAt = new Date(n.createdAt);
    const missing: MonthDebt[] = [];

    for (const due of allDues) {
      // Only count months on or after the neighbor's join month
      const monthEnd = endOfMonth(due.year, due.month);
      if (createdAt > monthEnd) continue;

      // For inactive neighbors, only count if they had any payment (so we include
      // ex-residents who started paying then left). Skip otherwise.
      if (!n.active) {
        const hasPayment = allPayments.some(
          (p) =>
            p.neighborId === n.id && p.year === due.year && p.month === due.month
        );
        if (!hasPayment) continue;
      }

      const paid = paymentsByKey.get(`${n.id}:${due.year}:${due.month}`) ?? 0;
      const owed = Math.max(0, due.amount - paid);

      totalExpected += due.amount;
      totalCollectedAcrossMonths += Math.min(paid, due.amount);

      if (owed > 0) {
        missing.push({
          year: due.year,
          month: due.month,
          expected: due.amount,
          paid,
          owed,
        });
      }
    }

    const totalOwed = missing.reduce((s, m) => s + m.owed, 0);
    if (totalOwed > 0 || n.active) {
      result.push({
        id: n.id,
        name: n.name,
        apartmentNumber: n.apartmentNumber,
        phone: n.phone,
        active: n.active,
        totalOwed,
        monthsCount: missing.length,
        missingMonths: missing.sort((a, b) =>
          a.year !== b.year ? a.year - b.year : a.month - b.month
        ),
      });
      totalOutstanding += totalOwed;
    }
  }

  // Sort by debt descending; debtors first
  result.sort((a, b) => b.totalOwed - a.totalOwed);

  return NextResponse.json({
    currency,
    totalOutstanding,
    totalExpected,
    totalCollected: totalCollectedAcrossMonths,
    monthsTracked: allDues.length,
    debtorsCount: result.filter((n) => n.totalOwed > 0).length,
    activeCount: allNeighbors.filter((n) => n.active).length,
    neighbors: result,
  });
}
