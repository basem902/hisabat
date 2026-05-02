import { NextResponse } from "next/server";
import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { db, expenses } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));

  if (!year || !month)
    return NextResponse.json({ error: "year & month required" }, { status: 400 });

  const list = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.year, year), eq(expenses.month, month)))
    .orderBy(asc(expenses.expenseDate));

  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  let body: {
    year: number;
    month: number;
    category: string;
    description: string;
    amount: number;
    expenseDate: string;
    notes: string | null;
    receiptUrl: string | null;
  };

  if (contentType.includes("multipart/form-data")) {
    const fd = await req.formData();
    const file = fd.get("receipt") as File | null;
    let receiptUrl: string | null = null;
    if (file && typeof file === "object" && file.size > 0) {
      receiptUrl = await uploadFile(file, "expenses");
    }
    body = {
      year: Number(fd.get("year")),
      month: Number(fd.get("month")),
      category: String(fd.get("category") ?? ""),
      description: String(fd.get("description") ?? ""),
      amount: Number(fd.get("amount")),
      expenseDate: String(fd.get("expenseDate") ?? ""),
      notes: fd.get("notes")
        ? String(fd.get("notes")).trim() || null
        : null,
      receiptUrl,
    };
  } else {
    const json = await req.json().catch(() => null);
    const schema = z.object({
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
      category: z.string().min(1),
      description: z.string().min(1),
      amount: z.number().min(0),
      expenseDate: z.string().min(1),
      notes: z.string().nullable().optional(),
    });
    const parsed = schema.safeParse(json);
    if (!parsed.success)
      return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });
    body = {
      ...parsed.data,
      notes: parsed.data.notes ?? null,
      receiptUrl: null,
    };
  }

  if (
    !body.year ||
    !body.month ||
    !body.category ||
    !body.description ||
    Number.isNaN(body.amount) ||
    !body.expenseDate
  ) {
    return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });
  }

  const [created] = await db.insert(expenses).values(body).returning();
  return NextResponse.json(created);
}
