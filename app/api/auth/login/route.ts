import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, users } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "البيانات غير صحيحة" },
      { status: 400 }
    );
  }

  const { username, password } = parsed.data;
  const found = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  const user = found[0];
  if (!user) {
    return NextResponse.json(
      { error: "اسم المستخدم أو كلمة السر غير صحيحة" },
      { status: 401 }
    );
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "اسم المستخدم أو كلمة السر غير صحيحة" },
      { status: 401 }
    );
  }

  await createSession({ userId: user.id, username: user.username });
  return NextResponse.json({ ok: true });
}
