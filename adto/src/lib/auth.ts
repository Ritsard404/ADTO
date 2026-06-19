import { cache } from "react";
import { redirect } from "next/navigation";
import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  return prisma.profile.findUnique({
    where: { email: user.email },
  });
});

export async function requireActiveProfile() {
  const profile = await getCurrentProfile();

  if (!profile || profile.status !== "ACTIVE") {
    redirect("/login");
  }

  return profile;
}

export async function requireRole(allowedRoles: UserRole[]) {
  const profile = await requireActiveProfile();

  if (!allowedRoles.includes(profile.role)) {
    redirect("/dashboard");
  }

  return profile;
}
