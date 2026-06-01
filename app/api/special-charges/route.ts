import { NextResponse } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import {
  db,
  specialCharges,
  specialChargeAssignments,
  neighbors,
} from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const rows = await db
    .select()
    .from(specialCharges)
    .orderBy(asc(specialCharges.chargeDate));
  return NextResponse.json(rows);
}

const createSchema = z.object({
  title: z.string().min(1),
  amount: z.number().min(0),
  chargeDate: z.string().min(1),
  notes: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });

  const [charge] = await db
    .insert(specialCharges)
    .values({
      title: parsed.data.title,
      defaultAmount: parsed.data.amount,
      chargeDate: parsed.data.chargeDate,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  // Freeze the list of who owes this charge (snapshot of active neighbors).
  const active = await db
    .select()
    .from(neighbors)
    .where(eq(neighbors.active, true));
  if (active.length) {
    await db.insert(specialChargeAssignments).values(
      active.map((n) => ({
        chargeId: charge.id,
        neighborId: n.id,
        amount: parsed.data.amount,
      }))
    );
  }

  return NextResponse.json(charge);
}
