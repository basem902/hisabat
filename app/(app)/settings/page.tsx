import { db, settings as settingsTable } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  const rows = await db.select().from(settingsTable).limit(1);
  const s = rows[0];

  return (
    <SettingsClient
      initial={{
        buildingName: s?.buildingName ?? "حسابات المبنى",
        currency: s?.currency ?? "ر.س",
      }}
      currentUsername={session?.username ?? ""}
    />
  );
}
