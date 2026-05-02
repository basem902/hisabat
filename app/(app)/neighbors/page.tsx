import { asc } from "drizzle-orm";
import { db, neighbors as neighborsTable } from "@/lib/db";
import { NeighborsClient } from "./neighbors-client";

export const dynamic = "force-dynamic";

export default async function NeighborsPage() {
  const list = await db
    .select()
    .from(neighborsTable)
    .orderBy(asc(neighborsTable.name));

  return <NeighborsClient initial={list} />;
}
