import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { asc, eq } from "drizzle-orm";
import {
  db,
  neighbors as neighborsTable,
  payments as paymentsTable,
  monthlyDues as monthlyDuesTable,
  settings as settingsTable,
} from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildLedgers } from "@/lib/balance";
import { NeighborStatement, type StatementData } from "@/lib/pdf/statement";
import { monthName } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const { id } = await params;
  const numericId = Number(id);
  if (!numericId)
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const [neighborRows, dues, neighborPayments, settingsRows] =
    await Promise.all([
      db
        .select()
        .from(neighborsTable)
        .where(eq(neighborsTable.id, numericId))
        .limit(1),
      db.select().from(monthlyDuesTable),
      db
        .select()
        .from(paymentsTable)
        .where(eq(paymentsTable.neighborId, numericId))
        .orderBy(asc(paymentsTable.paidAt)),
      db.select().from(settingsTable).limit(1),
    ]);

  const neighbor = neighborRows[0];
  if (!neighbor)
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const settings = settingsRows[0];
  const ledger = buildLedgers([neighbor], dues, neighborPayments)[0];

  const data: StatementData = {
    buildingName: settings?.buildingName ?? "حسابات المبنى",
    currency: settings?.currency ?? "ر.س",
    name: neighbor.name,
    apartmentNumber: neighbor.apartmentNumber,
    phone: neighbor.phone,
    active: neighbor.active,
    obligation: ledger.obligation,
    totalPaid: ledger.totalPaid,
    owed: ledger.owed,
    surplus: ledger.surplus,
    monthLabel: monthName,
    months: ledger.months.map((m) => ({
      year: m.year,
      month: m.month,
      due: m.due,
      paid: m.paid,
      running: m.running,
    })),
    payments: neighborPayments.map((p) => ({
      year: p.year,
      month: p.month,
      amount: p.amount,
      paidAt: p.paidAt,
      paymentMethod: p.paymentMethod,
    })),
    generatedAt: new Date().toISOString(),
  };

  const buffer = await renderToBuffer(<NeighborStatement data={data} />);
  const filename = `statement-${numericId}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
