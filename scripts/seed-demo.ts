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

  console.log("→ Cleaning existing demo data...");
  await db.delete(schema.payments);
  await db.delete(schema.expenses);
  await db.delete(schema.neighbors);
  await db.delete(schema.monthlyDues);

  console.log("→ Adding sample neighbors...");
  const inserted = await db
    .insert(schema.neighbors)
    .values([
      { name: "أحمد علي السبيعي", apartmentNumber: "101", phone: "0501234567", active: true },
      { name: "محمد العتيبي", apartmentNumber: "102", phone: "0509876543", active: true },
      { name: "خالد الشهري", apartmentNumber: "201", phone: "0533445566", active: true },
      { name: "عبدالله الزهراني", apartmentNumber: "202", phone: "0541112222", active: true },
      { name: "سعد القحطاني", apartmentNumber: "301", phone: "0553334444", active: true },
      { name: "فهد الدوسري", apartmentNumber: "302", phone: null, active: true },
    ])
    .returning();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const m = String(month).padStart(2, "0");

  console.log("→ Setting monthly due for current month...");
  await db.insert(schema.monthlyDues).values({
    year,
    month,
    amount: 500,
    notes: null,
  });

  const lastMonthDate = new Date(year, month - 2, 1);
  await db.insert(schema.monthlyDues).values({
    year: lastMonthDate.getFullYear(),
    month: lastMonthDate.getMonth() + 1,
    amount: 450,
    notes: null,
  });

  console.log("→ Adding sample payments...");
  await db.insert(schema.payments).values([
    {
      neighborId: inserted[0].id,
      year,
      month,
      amount: 500,
      paidAt: `${year}-${m}-03`,
      paymentMethod: "نقد",
    },
    {
      neighborId: inserted[1].id,
      year,
      month,
      amount: 500,
      paidAt: `${year}-${m}-05`,
      paymentMethod: "تحويل بنكي",
      notes: "تم التحويل عبر STC Pay",
    },
    {
      neighborId: inserted[2].id,
      year,
      month,
      amount: 500,
      paidAt: `${year}-${m}-07`,
      paymentMethod: "نقد",
    },
    {
      neighborId: inserted[4].id,
      year,
      month,
      amount: 500,
      paidAt: `${year}-${m}-10`,
      paymentMethod: "تحويل بنكي",
    },
  ]);

  console.log("→ Adding sample expenses...");
  await db.insert(schema.expenses).values([
    {
      year,
      month,
      category: "كهرباء",
      description: "فاتورة الكهرباء — العداد الرئيسي",
      amount: 850,
      expenseDate: `${year}-${m}-08`,
      notes: null,
    },
    {
      year,
      month,
      category: "ماء",
      description: "فاتورة المياه",
      amount: 220,
      expenseDate: `${year}-${m}-08`,
      notes: null,
    },
    {
      year,
      month,
      category: "نظافة",
      description: "أجور عامل النظافة",
      amount: 600,
      expenseDate: `${year}-${m}-15`,
      notes: "شامل تنظيف السطح",
    },
    {
      year,
      month,
      category: "صيانة",
      description: "صيانة المصعد الدورية",
      amount: 350,
      expenseDate: `${year}-${m}-20`,
      notes: null,
    },
  ]);

  const existingSettings = await db.select().from(schema.settings);
  if (existingSettings.length > 0) {
    await db.update(schema.settings).set({
      buildingName: "مبنى السكن - حي النخيل",
      currency: "ر.س",
    });
  } else {
    await db.insert(schema.settings).values({
      buildingName: "مبنى السكن - حي النخيل",
      currency: "ر.س",
    });
  }

  console.log("✅ Demo data seeded");
  console.log(`   - 6 جيران`);
  console.log(`   - مبلغ ${monthName(month)}: 500 ر.س`);
  console.log(`   - مبلغ ${monthName(lastMonthDate.getMonth() + 1)}: 450 ر.س`);
  console.log("   - 4 مدفوعات + 4 مصروفات للشهر الحالي");
}

const ARABIC_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
function monthName(m: number) {
  return ARABIC_MONTHS[m - 1];
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
