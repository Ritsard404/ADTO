import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

dotenv.config({ path: ".env.local" });
dotenv.config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const adminEmail = (process.env.ADMIN_EMAIL ?? process.env.SEED_ADMIN_EMAIL ?? "admin@adto.local").toLowerCase();
const adminFullName = process.env.ADMIN_FULL_NAME ?? process.env.SEED_ADMIN_FULL_NAME ?? "ADTO System Admin";
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminPassword || adminPassword.length < 8) {
  throw new Error("Set ADMIN_PASSWORD to at least 8 characters before running this script.");
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missing = [
    !supabaseUrl ? "NEXT_PUBLIC_SUPABASE_URL" : null,
    !serviceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(`Set ${missing.join(" and ")} before running this script.`);
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw listError;
  }

  const existingAuthUser = data.users.find((user) => user.email?.toLowerCase() === adminEmail);
  const authPayload = {
    password: adminPassword,
    user_metadata: {
      full_name: adminFullName,
    },
    app_metadata: {
      role: "ADMIN",
    },
  };

  if (existingAuthUser) {
    const { error } = await supabase.auth.admin.updateUserById(existingAuthUser.id, authPayload);
    if (error) throw error;
  } else {
    const { error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      email_confirm: true,
      ...authPayload,
    });
    if (error) throw error;
  }

  await prisma.profile.upsert({
    where: { email: adminEmail },
    update: {
      fullName: adminFullName,
      role: "ADMIN",
      status: "ACTIVE",
    },
    create: {
      email: adminEmail,
      fullName: adminFullName,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  console.log(`Admin account ready: ${adminEmail}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
