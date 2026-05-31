import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DB = NeonHttpDatabase<typeof schema>;

let instance: DB | null = null;

function getDb(): DB {
  if (instance) return instance;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  instance = drizzle(neon(url), { schema });
  return instance;
}

/**
 * Lazy proxy around the Drizzle/Neon client.
 *
 * The connection is created on FIRST USE (at request time) rather than at
 * module load. This lets `next build` import route modules to collect page
 * data without a live DATABASE_URL — which isn't available during the build
 * step on Vercel — instead of throwing "DATABASE_URL is not set" and failing
 * the build. At runtime the env var is present and the client initializes
 * normally on the first query.
 */
export const db = new Proxy({} as DB, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value;
  },
});

export * from "./schema";
