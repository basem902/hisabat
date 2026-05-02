import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { db, monthlyDues } from "@/lib/db";
import { getSession } from "@/lib/auth";

const upsertSchema = z.object({
  amount: z.number().min(0),
  notes: z.string().nullable().optional(),
});

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
  if (!year || !month)
    return NextResponse.json({ error: "بيانات غير صحيحة" }, { status: 400 });

  const rows = await db
    .select()
    .from(monthlyDues)
    .where(and(eq(monthlyDues.year, year), eq(monthlyDues.month, month)))
    .limit(1);

  return NextResponse.json(rows[0] ?? null);
}

export async function PUT(
  req: Request,
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

  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });

  const [row] = await db
    .insert(monthlyDues)
    .values({
      year,
      month,
      amount: parsed.data.amount,
      notes: parsed.data.notes ?? null,
    })
    .onConflictDoUpdate({
      target: [monthlyDues.year, monthlyDues.month],
      set: {
        amount: parsed.data.amount,
        notes: parsed.data.notes ?? null,
        updatedAt: sql`now()`,
      },
    })
    .returning();

  return NextResponse.json(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ year: string; month: string }> }
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const { year: yearStr, month: monthStr } = await params;
  const year = Number(yearStr);
  const month = Number(monthStr);

  await db
    .delete(monthlyDues)
    .where(and(eq(monthlyDues.year, year), eq(monthlyDues.month, month)));
  return NextResponse.json({ ok: true });
}
