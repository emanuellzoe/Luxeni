import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../src/db/schema";

// Hermetic Postgres-compatible DB for tests — no network, no Neon.
export async function testDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./migrations" });
  return db as unknown as import("../src/db/client").Db;
}
