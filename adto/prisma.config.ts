import "dotenv/config";
import { defineConfig } from "prisma/config";

function prismaCliDatabaseUrl() {
  const databaseUrl = process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"];
  if (!databaseUrl) {
    return databaseUrl;
  }

  try {
    const parsed = new URL(databaseUrl);
    if (parsed.hostname.endsWith("pooler.supabase.com") && !parsed.searchParams.has("sslmode")) {
      parsed.searchParams.set("sslmode", "require");
      return parsed.toString();
    }
  } catch {
    return databaseUrl;
  }

  return databaseUrl;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: prismaCliDatabaseUrl(),
  },
});
