import { asc } from "drizzle-orm";
import {
  db,
  neighbors as neighborsTable,
  settings as settingsTable,
  monthlyDues as monthlyDuesTable,
  payments as paymentsTable,
  specialChargeAssignments as assignmentsTable,
} from "@/lib/db";
import { buildLedgers } from "@/lib/balance";
import { PaymentsClient } from "./payments-client";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [list, settings, dues, allPayments, allAssignments] =
    await Promise.all([
      db.select().from(neighborsTable).orderBy(asc(neighborsTable.name)),
      db.select().from(settingsTable).limit(1),
      db.select().from(monthlyDuesTable),
      db.select().from(paymentsTable),
      db.select().from(assignmentsTable),
    ]);

  // Cumulative balance per neighbor (carry-over aware, incl. emergency charges).
  const ledgers = buildLedgers(list, dues, allPayments, allAssignments);
  const balances: Record<number, { owed: number; surplus: number }> = {};
  for (const l of ledgers) balances[l.id] = { owed: l.owed, surplus: l.surplus };

  return (
    <PaymentsClient
      neighbors={list}
      currency={settings[0]?.currency ?? "ر.س"}
      balances={balances}
    />
  );
}
