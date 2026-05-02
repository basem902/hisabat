import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../lib/db/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const sql = neon(url);
  const db = drizzle(sql, { schema });

  console.log("→ حذف المدفوعات...");
  await db.delete(schema.payments);

  console.log("→ حذف المصروفات...");
  await db.delete(schema.expenses);

  console.log("→ حذف المبالغ الشهرية...");
  await db.delete(schema.monthlyDues);

  console.log("→ حذف الجيران...");
  await db.delete(schema.neighbors);

  console.log("→ إعادة ضبط بيانات المبنى...");
  const existing = await db.select().from(schema.settings);
  if (existing.length > 0) {
    await db.update(schema.settings).set({
      buildingName: "مبنى السكن",
      currency: "ر.س",
    });
  }

  console.log("\n✅ تم حذف كل البيانات التجريبية");
  console.log("   • الجيران: 0");
  console.log("   • المدفوعات: 0");
  console.log("   • المصروفات: 0");
  console.log("   • المبالغ الشهرية: 0");
  console.log("   • مستخدم admin محفوظ");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
