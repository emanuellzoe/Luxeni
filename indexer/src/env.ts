import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  rpcUrl: process.env.CELO_RPC_URL ?? "https://forno.celo.org",
  deployBlock: process.env.DEPLOY_BLOCK ? Number(process.env.DEPLOY_BLOCK) : undefined,
};
