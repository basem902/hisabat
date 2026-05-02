import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, payments } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { uploadFile } from "@/lib/storage";

const numberFromForm = (v: FormDataEntryValue | null) => {
  if (typeof v !== "string") return NaN;
  return Number(v);
};

const stringFromForm = (v: FormDataEntryValue | null): string | null => {
  if (typeof v !== "string") return null;
  return v.trim() || null;
};

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
    .from(payments)
    .where(and(eq(payments.year, year), eq(payments.month, month)));

  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const contentType = req.headers.get("content-type") ?? "";
  let body: {
    neighborId: number;
    year: number;
    month: number;
    amount: number;
    paidAt: string;
    paymentMethod: string;
    notes: string | null;
    receiptUrl: string | null;
  };

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("receipt") as File | null;

    let receiptUrl: string | null = null;
    if (file && typeof file === "object" && file.size > 0) {
      receiptUrl = await uploadFile(file, "payments");
    }

    body = {
      neighborId: numberFromForm(formData.get("neighborId")),
      year: numberFromForm(formData.get("year")),
      month: numberFromForm(formData.get("month")),
      amount: numberFromForm(formData.get("amount")),
      paidAt: (formData.get("paidAt") as string) ?? "",
      paymentMethod: (formData.get("paymentMethod") as string) ?? "نقد",
      notes: stringFromForm(formData.get("notes")),
      receiptUrl,
    };
  } else {
    const json = await req.json().catch(() => null);
    const schema = z.object({
      neighborId: z.number().int(),
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
      amount: z.number().min(0),
      paidAt: z.string().min(1),
      paymentMethod: z.string().default("نقد"),
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
    !body.neighborId ||
    !body.year ||
    !body.month ||
    Number.isNaN(body.amount) ||
    !body.paidAt
  ) {
    return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });
  }

  const [created] = await db.insert(payments).values(body).returning();
  return NextResponse.json(created);
}
