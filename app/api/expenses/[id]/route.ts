import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, expenses } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { uploadFile, deleteFile } from "@/lib/storage";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const { id } = await params;
  const numericId = Number(id);

  const contentType = req.headers.get("content-type") ?? "";
  let updates: Record<string, unknown> = {};

  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    if (fd.has("category")) updates.category = String(fd.get("category"));
    if (fd.has("description"))
      updates.description = String(fd.get("description"));
    if (fd.has("amount")) updates.amount = Number(fd.get("amount"));
    if (fd.has("expenseDate"))
      updates.expenseDate = String(fd.get("expenseDate"));
    if (fd.has("notes")) {
      const v = fd.get("notes");
      updates.notes = typeof v === "string" && v.trim() ? v : null;
    }

    const file = fd.get("receipt") as File | null;
    if (file && typeof file === "object" && file.size > 0) {
      const existing = (
        await db.select().from(expenses).where(eq(expenses.id, numericId))
      )[0];
      if (existing?.receiptUrl) await deleteFile(existing.receiptUrl);
      updates.receiptUrl = await uploadFile(file, "expenses");
    } else if (fd.get("removeReceipt") === "1") {
      const existing = (
        await db.select().from(expenses).where(eq(expenses.id, numericId))
      )[0];
      if (existing?.receiptUrl) await deleteFile(existing.receiptUrl);
      updates.receiptUrl = null;
    }
  } else {
    const body = await req.json().catch(() => null);
    const schema = z.object({
      category: z.string().min(1).optional(),
      description: z.string().min(1).optional(),
      amount: z.number().min(0).optional(),
      expenseDate: z.string().optional(),
      notes: z.string().nullable().optional(),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });
    updates = parsed.data;
  }

  const [updated] = await db
    .update(expenses)
    .set(updates)
    .where(eq(expenses.id, numericId))
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
  const numericId = Number(id);
  const existing = (
    await db.select().from(expenses).where(eq(expenses.id, numericId))
  )[0];
  if (existing?.receiptUrl) await deleteFile(existing.receiptUrl);
  await db.delete(expenses).where(eq(expenses.id, numericId));
  return NextResponse.json({ ok: true });
}
