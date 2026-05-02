import { db, settings as settingsTable } from "@/lib/db";
import { ExpensesClient } from "./expenses-client";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const settings = await db.select().from(settingsTable).limit(1);
  return <ExpensesClient currency={settings[0]?.currency ?? "ر.س"} />;
}
