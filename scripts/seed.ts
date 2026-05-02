import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const sql = neon(url);
  const db = drizzle(sql, { schema });

  console.log("→ Seeding default admin user...");
  const existing = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, "admin"));

  if (existing.length === 0) {
    const passwordHash = await bcrypt.hash("admin", 10);
    await db.insert(schema.users).values({
      username: "admin",
      passwordHash,
    });
    console.log("✓ Created admin user (username: admin, password: admin)");
  } else {
    console.log("✓ Admin user already exists");
  }

  console.log("→ Seeding default settings...");
  const existingSettings = await db.select().from(schema.settings);
  if (existingSettings.length === 0) {
    await db.insert(schema.settings).values({
      buildingName: "مبنى السكن",
      currency: "ر.س",
    });
    console.log("✓ Created default settings");
  } else {
    console.log("✓ Settings already exist");
  }

  console.log("✅ Seed complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
