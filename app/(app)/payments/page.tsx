import { asc } from "drizzle-orm";
import { db, neighbors as neighborsTable, settings as settingsTable } from "@/lib/db";
import { PaymentsClient } from "./payments-client";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const [list, settings] = await Promise.all([
    db.select().from(neighborsTable).orderBy(asc(neighborsTable.name)),
    db.select().from(settingsTable).limit(1),
  ]);

  return (
    <PaymentsClient
      neighbors={list}
      currency={settings[0]?.currency ?? "ر.س"}
    />
  );
}
