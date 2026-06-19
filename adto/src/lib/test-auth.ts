import { cookies } from "next/headers";
import type { UserRole } from "@/generated/prisma/enums";

export const TEST_AUTH_COOKIE = "adto_test_role";

const TEST_ROLES = ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] satisfies UserRole[];

export function isAuthBypassEnabled() {
  return process.env.ADTO_AUTH_BYPASS === "true" && process.env.NODE_ENV !== "production";
}

export function isTestRole(value: FormDataEntryValue | string | undefined | null): value is (typeof TEST_ROLES)[number] {
  return typeof value === "string" && TEST_ROLES.includes(value as (typeof TEST_ROLES)[number]);
}

export async function getTestRole(): Promise<(typeof TEST_ROLES)[number]> {
  const cookieStore = await cookies();
  const cookieRole = cookieStore.get(TEST_AUTH_COOKIE)?.value;

  if (isTestRole(cookieRole)) {
    return cookieRole;
  }

  if (isTestRole(process.env.ADTO_TEST_ROLE)) {
    return process.env.ADTO_TEST_ROLE;
  }

  return "ADMIN";
}

export function getTestRoleEmail(role: UserRole) {
  if (role === "FACILITATOR") {
    return process.env.SEED_FACILITATOR_EMAIL ?? "facilitator@adto.local";
  }
  if (role === "SCHOOL_ADMIN") {
    return process.env.SEED_SCHOOL_ADMIN_EMAIL ?? "school-admin@adto.local";
  }

  return process.env.SEED_ADMIN_EMAIL ?? "admin@adto.local";
}
