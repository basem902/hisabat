import { NextResponse } from "next/server";
import { z } from "zod";
import { asc } from "drizzle-orm";
import { db, neighbors } from "@/lib/db";
import { getSession } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(1),
  apartmentNumber: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  active: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const list = await db.select().from(neighbors).orderBy(asc(neighbors.name));
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });

  const [created] = await db
    .insert(neighbors)
    .values({
      name: parsed.data.name,
      apartmentNumber: parsed.data.apartmentNumber ?? null,
      phone: parsed.data.phone ?? null,
      active: parsed.data.active ?? true,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  return NextResponse.json(created);
}
