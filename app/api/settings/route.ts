import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "drizzle-orm";
import { db, settings } from "@/lib/db";
import { getSession } from "@/lib/auth";

const schema = z.object({
  buildingName: z.string().min(1),
  currency: z.string().min(1).max(8),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const rows = await db.select().from(settings).limit(1);
  return NextResponse.json(rows[0] ?? null);
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });

  const existing = await db.select().from(settings).limit(1);
  if (existing.length === 0) {
    const [created] = await db
      .insert(settings)
      .values({ ...parsed.data })
      .returning();
    return NextResponse.json(created);
  }

  const [updated] = await db
    .update(settings)
    .set({ ...parsed.data, updatedAt: sql`now()` })
    .returning();
  return NextResponse.json(updated);
}
