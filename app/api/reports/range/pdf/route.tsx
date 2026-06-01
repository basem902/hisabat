import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { asc } from "drizzle-orm";
import {
  db,
  neighbors as neighborsTable,
  payments as paymentsTable,
  expenses as expensesTable,
  monthlyDues as monthlyDuesTable,
  settings as settingsTable,
  specialChargeAssignments as assignmentsTable,
  specialCharges as chargesTable,
} from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildRangeReport } from "@/lib/reports";
import { RangeReport } from "@/lib/pdf/range-report";

export const runtime = "nodejs";

function parseYM(s: string | null): { year: number; month: number } | null {
  if (!s) return null;
  const [y, m] = s.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  return { year: y, month: m };
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = parseYM(searchParams.get("from"));
  const to = parseYM(searchParams.get("to"));
  if (!from || !to)
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const [ns, ds, ps, es, ss, asg, chg] = await Promise.all([
    db.select().from(neighborsTable).orderBy(asc(neighborsTable.name)),
    db.select().from(monthlyDuesTable),
    db.select().from(paymentsTable),
    db.select().from(expensesTable),
    db.select().from(settingsTable).limit(1),
    db.select().from(assignmentsTable),
    db.select().from(chargesTable),
  ]);

  const data = buildRangeReport(
    ns,
    ds,
    ps,
    es,
    asg,
    chg,
    ss[0],
    from,
    to,
    new Date().toISOString()
  );

  const buffer = await renderToBuffer(<RangeReport data={data} />);
  const filename = `period-${data.from.year}-${data.from.month}_${data.to.year}-${data.to.month}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
