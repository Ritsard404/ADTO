import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type Check = {
  name: string;
  ok: boolean;
  message: string;
};

function has(name: string) {
  return Boolean(process.env[name]?.trim());
}

const checks: Check[] = [
  {
    name: "DATABASE_URL",
    ok: has("DATABASE_URL") && process.env.DATABASE_URL!.includes("pgbouncer=true"),
    message: "DATABASE_URL must be set and should use the Supabase pooler with pgbouncer=true.",
  },
  {
    name: "DIRECT_URL",
    ok: has("DIRECT_URL"),
    message: "DIRECT_URL must be set for migrations and direct Prisma deploy commands.",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    ok: has("NEXT_PUBLIC_SUPABASE_URL"),
    message: "NEXT_PUBLIC_SUPABASE_URL must point to the Supabase project URL.",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ok: has("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || has("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    message: "A Supabase publishable or anon key must be set for auth clients.",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    ok: has("SUPABASE_SERVICE_ROLE_KEY"),
    message: "SUPABASE_SERVICE_ROLE_KEY must be set only in server-side deployment env vars.",
  },
  {
    name: "SUPABASE_STORAGE_BUCKET",
    ok: has("SUPABASE_STORAGE_BUCKET"),
    message: "SUPABASE_STORAGE_BUCKET should name a private Supabase Storage bucket for reports and evidence.",
  },
  {
    name: "ADTO_DATA_MODE",
    ok: process.env.ADTO_DATA_MODE === "production",
    message: "ADTO_DATA_MODE must be production for deployed writable data.",
  },
  {
    name: "ADTO_AUTH_BYPASS",
    ok: process.env.ADTO_AUTH_BYPASS === "false" || !has("ADTO_AUTH_BYPASS"),
    message: "ADTO_AUTH_BYPASS must be false or unset in deployment.",
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    ok: has("NEXT_PUBLIC_APP_URL") && !process.env.NEXT_PUBLIC_APP_URL!.includes("localhost"),
    message: "NEXT_PUBLIC_APP_URL should be the deployed public URL, not localhost.",
  },
];

const failures = checks.filter((check) => !check.ok);

for (const check of checks) {
  console.log(`${check.ok ? "PASS" : "FAIL"} ${check.name}: ${check.message}`);
}

if (failures.length) {
  console.error(`\nProduction env check failed: ${failures.length} issue(s).`);
  process.exit(1);
}

console.log("\nProduction env check passed.");
