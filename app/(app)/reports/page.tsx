import { db, settings as settingsTable } from "@/lib/db";
import { ReportsClient } from "./reports-client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const settings = await db.select().from(settingsTable).limit(1);
  return (
    <ReportsClient
      buildingName={settings[0]?.buildingName ?? "حسابات المبنى"}
      currency={settings[0]?.currency ?? "ر.س"}
    />
  );
}
