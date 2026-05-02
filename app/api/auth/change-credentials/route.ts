import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, users } from "@/lib/db";
import {
  getSession,
  hashPassword,
  verifyPassword,
  createSession,
} from "@/lib/auth";

const schema = z.object({
  newUsername: z.string().min(1).optional(),
  currentPassword: z.string().min(1),
  newPassword: z.string().min(4).optional(),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "البيانات غير صحيحة" }, { status: 400 });

  const { newUsername, currentPassword, newPassword } = parsed.data;

  if (!newUsername && !newPassword) {
    return NextResponse.json(
      { error: "حدد قيمة جديدة لتغييرها" },
      { status: 400 }
    );
  }

  const found = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  const user = found[0];
  if (!user)
    return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok)
    return NextResponse.json(
      { error: "كلمة السر الحالية غير صحيحة" },
      { status: 401 }
    );

  const updates: Record<string, unknown> = {};
  if (newUsername && newUsername !== user.username) {
    const exists = await db
      .select()
      .from(users)
      .where(eq(users.username, newUsername))
      .limit(1);
    if (exists.length > 0) {
      return NextResponse.json(
        { error: "اسم المستخدم محجوز" },
        { status: 409 }
      );
    }
    updates.username = newUsername;
  }
  if (newPassword) {
    updates.passwordHash = await hashPassword(newPassword);
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ ok: true });

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, session.userId))
    .returning();

  await createSession({ userId: updated.id, username: updated.username });
  return NextResponse.json({ ok: true, username: updated.username });
}
