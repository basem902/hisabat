import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import {
  db,
  neighbors as neighborsTable,
  payments as paymentsTable,
  monthlyDues as monthlyDuesTable,
  expenses as expensesTable,
  settings as settingsTable,
  specialChargeAssignments as assignmentsTable,
  specialCharges as chargesTable,
} from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildLedgers, summarizeLedgers, computeFund } from "@/lib/balance";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const [
    allNeighbors,
    allDues,
    allPayments,
    allExpensesAmt,
    settingsRow,
    allAssignments,
    allCharges,
  ] = await Promise.all([
    db.select().from(neighborsTable).orderBy(asc(neighborsTable.name)),
    db.select().from(monthlyDuesTable),
    db.select().from(paymentsTable),
    db.select({ amount: expensesTable.amount }).from(expensesTable),
    db.select().from(settingsTable).limit(1),
    db.select().from(assignmentsTable),
    db.select().from(chargesTable),
  ]);

  const currency = settingsRow[0]?.currency ?? "ر.س";
  const buildingName = settingsRow[0]?.buildingName ?? "حسابات المبنى";

  // Single source of truth — carry-over aware ledgers (see lib/balance.ts).
  const ledgers = buildLedgers(
    allNeighbors,
    allDues,
    allPayments,
    allAssignments
  );
  const summary = summarizeLedgers(ledgers);
  const fund = computeFund(allPayments, allExpensesAmt);
  const chargeTitle = new Map(allCharges.map((c) => [c.id, c.title]));

  const neighbors = ledgers
    .filter((l) => l.owed > 0 || l.surplus > 0 || l.active)
    .map((l) => ({
      id: l.id,
      name: l.name,
      apartmentNumber: l.apartmentNumber,
      phone: l.phone,
      active: l.active,
      totalOwed: l.owed,
      surplus: l.surplus,
      monthlyOwed: l.monthlyOwed,
      emergencyOwed: l.emergencyOwed,
      monthsCount: l.monthsOwed,
      missingMonths: l.missingMonths.map((m) => ({
        year: m.year,
        month: m.month,
        expected: m.due,
        paid: m.paid,
        owed: m.remaining,
      })),
      emergencyUnpaid: l.emergencyItems
        .filter((it) => it.owed > 0)
        .map((it) => ({
          title: chargeTitle.get(it.chargeId) ?? "رسوم طارئة",
          owed: it.owed,
        })),
    }))
    // Debtors first (largest first), then surplus/up-to-date.
    .sort((a, b) => b.totalOwed - a.totalOwed);

  return NextResponse.json({
    currency,
    buildingName,
    totalOutstanding: summary.totalOutstanding,
    totalSurplus: summary.totalSurplus,
    totalExpected: summary.totalObligation,
    totalCollected: summary.collectedTowardDues,
    monthsTracked: allDues.length,
    debtorsCount: summary.debtorsCount,
    activeCount: allNeighbors.filter((n) => n.active).length,
    fund,
    neighbors,
  });
}
