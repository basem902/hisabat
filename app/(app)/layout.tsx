import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { db, settings as settingsTable } from "@/lib/db";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const settings = (await db.select().from(settingsTable).limit(1))[0];
  const buildingName = settings?.buildingName ?? "حسابات المبنى";

  return (
    <AppShell buildingName={buildingName} username={session.username}>
      {children}
    </AppShell>
  );
}
