import { asc, isNotNull } from "drizzle-orm";
import {
  db,
  specialCharges,
  specialChargeAssignments,
  payments as paymentsTable,
  neighbors as neighborsTable,
  settings as settingsTable,
} from "@/lib/db";
import { round2 } from "@/lib/balance";
import { ChargesClient } from "./charges-client";

export const dynamic = "force-dynamic";

export default async function ChargesPage() {
  const [charges, assignments, emergencyPays, allNeighbors, settingsRow] =
    await Promise.all([
      db.select().from(specialCharges).orderBy(asc(specialCharges.chargeDate)),
      db.select().from(specialChargeAssignments),
      db
        .select()
        .from(paymentsTable)
        .where(isNotNull(paymentsTable.specialChargeId)),
      db.select().from(neighborsTable).orderBy(asc(neighborsTable.name)),
      db.select().from(settingsTable).limit(1),
    ]);

  const nameById = new Map(allNeighbors.map((n) => [n.id, n]));

  const data = charges.map((c) => {
    const asgs = assignments.filter((a) => a.chargeId === c.id);
    const paidByN = new Map<number, number>();
    for (const p of emergencyPays)
      if (p.specialChargeId === c.id)
        paidByN.set(
          p.neighborId,
          (paidByN.get(p.neighborId) ?? 0) + p.amount
        );

    const rows = asgs
      .map((a) => {
        const n = nameById.get(a.neighborId);
        return {
          neighborId: a.neighborId,
          name: n?.name ?? "—",
          apartmentNumber: n?.apartmentNumber ?? null,
          amount: a.amount,
          paid: (paidByN.get(a.neighborId) ?? 0) >= a.amount - 0.005,
        };
      })
      .sort(
        (x, y) =>
          Number(x.paid) - Number(y.paid) || x.name.localeCompare(y.name, "ar")
      );

    const expected = round2(asgs.reduce((s, a) => s + a.amount, 0));
    const collected = round2(
      rows.filter((r) => r.paid).reduce((s, r) => s + r.amount, 0)
    );
    return {
      id: c.id,
      title: c.title,
      defaultAmount: c.defaultAmount,
      chargeDate: c.chargeDate,
      notes: c.notes,
      expected,
      collected,
      outstanding: round2(expected - collected),
      paidCount: rows.filter((r) => r.paid).length,
      total: rows.length,
      rows,
    };
  });

  return (
    <ChargesClient
      charges={data}
      currency={settingsRow[0]?.currency ?? "ر.س"}
    />
  );
}
