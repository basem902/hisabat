import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
  db,
  specialCharges,
  specialChargeAssignments,
  payments,
} from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  const { id } = await params;
  // cascade removes assignments + emergency payments for this charge
  await db.delete(specialCharges).where(eq(specialCharges.id, Number(id)));
  return NextResponse.json({ ok: true });
}

const paySchema = z.object({
  neighborId: z.number().int(),
  paid: z.boolean(),
});

// Toggle a neighbor's payment for this charge (paid = insert / unpaid = remove).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const { id } = await params;
  const chargeId = Number(id);
  const body = await req.json().catch(() => null);
  const parsed = paySchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });

  const { neighborId, paid } = parsed.data;

  const [asg] = await db
    .select()
    .from(specialChargeAssignments)
    .where(
      and(
        eq(specialChargeAssignments.chargeId, chargeId),
        eq(specialChargeAssignments.neighborId, neighborId)
      )
    );
  if (!asg)
    return NextResponse.json(
      { error: "هذا الساكن غير مطالب بالرسم" },
      { status: 400 }
    );

  const [charge] = await db
    .select()
    .from(specialCharges)
    .where(eq(specialCharges.id, chargeId));
  if (!charge)
    return NextResponse.json({ error: "الرسم غير موجود" }, { status: 404 });

  // Clear any existing payment for this neighbor+charge, then re-add if paid.
  await db
    .delete(payments)
    .where(
      and(
        eq(payments.neighborId, neighborId),
        eq(payments.specialChargeId, chargeId)
      )
    );

  if (paid) {
    const [y, m] = charge.chargeDate.split("-").map(Number);
    await db.insert(payments).values({
      neighborId,
      year: y,
      month: m,
      amount: asg.amount,
      paidAt: charge.chargeDate,
      paymentMethod: "نقد",
      specialChargeId: chargeId,
      notes: charge.title,
      receiptUrl: null,
    });
  }

  return NextResponse.json({ ok: true });
}
