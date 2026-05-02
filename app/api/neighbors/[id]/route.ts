import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, neighbors } from "@/lib/db";
import { getSession } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  apartmentNumber: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  active: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const { id } = await params;
  const numericId = Number(id);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });

  const [updated] = await db
    .update(neighbors)
    .set(parsed.data)
    .where(eq(neighbors.id, numericId))
    .returning();

  if (!updated) return NextResponse.json({ error: "غير موجود" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const { id } = await params;
  await db.delete(neighbors).where(eq(neighbors.id, Number(id)));
  return NextResponse.json({ ok: true });
}
