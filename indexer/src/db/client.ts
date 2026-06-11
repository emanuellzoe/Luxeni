import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "./schema";

// Node has no global WebSocket; the Neon serverless Pool needs one supplied.
neonConfig.webSocketConstructor = ws;

export function makeDb(url: string) {
  const pool = new Pool({ connectionString: url });
  return drizzle(pool, { schema });
}
export type Db = ReturnType<typeof makeDb>;
