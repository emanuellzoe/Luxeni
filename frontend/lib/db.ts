import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let cached: NeonQueryFunction<false, false> | null = null;

// Lazy: importing a route never throws at build time when DATABASE_URL is absent.
export function db(): NeonQueryFunction<false, false> {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    cached = neon(url);
  }
  return cached;
}
