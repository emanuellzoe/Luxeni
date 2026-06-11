import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

// Lazy getters: importing this module never throws (safe for tests that pull in
// chain.ts transitively). databaseUrl only throws when actually accessed at run time.
export const env = {
  get databaseUrl(): string { return required("DATABASE_URL"); },
  get rpcUrl(): string { return process.env.CELO_RPC_URL ?? "https://forno.celo.org"; },
  get deployBlock(): number | undefined {
    return process.env.DEPLOY_BLOCK ? Number(process.env.DEPLOY_BLOCK) : undefined;
  },
};
