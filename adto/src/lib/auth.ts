import { cache } from "react";
import { redirect } from "next/navigation";
import type { UserRole } from "@/generated/prisma/enums";
import { mockProfiles } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getTestRole, getTestRoleEmail, isAuthBypassEnabled } from "@/lib/test-auth";
import { isMockDataMode } from "@/lib/runtime-mode";

export const getCurrentProfile = cache(async () => {
  if (isAuthBypassEnabled()) {
    const role = await getTestRole();

    if (isMockDataMode()) {
      const mockProfile = mockProfiles.find((profile) => profile.role === role) ?? mockProfiles[0];
      return mockProfile;
    }

    const profile = await prisma.profile.findUnique({
      where: { email: getTestRoleEmail(role) },
    });

    if (profile?.status === "ACTIVE") {
      return profile;
    }
  }

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
