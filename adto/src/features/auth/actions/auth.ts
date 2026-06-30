"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { changePasswordSchema, loginSchema } from "@/features/auth/schemas/auth";
import { recordAuditLog } from "@/features/security/services/audit-log.service";
import { requireActiveProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit, isRateLimitError } from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { isAuthBypassEnabled, isTestRole, TEST_AUTH_COOKIE } from "@/lib/test-auth";

export async function signInWithPassword(_: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid login details." };
  }

  try {
    enforceRateLimit({ key: `login:${parsed.data.email}`, limit: 8, windowMs: 10 * 60_000 });
  } catch (error) {
    if (isRateLimitError(error)) {
      return { error: "Too many login attempts. Try again in a few minutes." };
    }
    throw error;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  const profile = await prisma.profile.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    select: { id: true },
  });

  if (error) {
    await recordAuditLog({
      actorId: profile?.id ?? "anonymous",
      entityType: "Auth",
      entityId: parsed.data.email.toLowerCase(),
      action: "LOGIN_FAILED",
      newValue: { reason: "Supabase sign-in failed" },
    });
    return { error: error.message };
  }

  await recordAuditLog({
    actorId: profile?.id ?? data.user?.id ?? "anonymous",
    entityType: "Auth",
    entityId: parsed.data.email.toLowerCase(),
    action: "LOGIN_SUCCEEDED",
  });

  redirect("/dashboard");
}

export async function signOut() {
  if (isAuthBypassEnabled()) {
    const cookieStore = await cookies();
    cookieStore.delete(TEST_AUTH_COOKIE);
    redirect("/login");
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function switchTestRole(formData: FormData) {
  if (!isAuthBypassEnabled()) {
    redirect("/login");
  }

  const role = formData.get("role");

  if (!isTestRole(role)) {
    redirect("/dashboard");
  }

  const cookieStore = await cookies();
  cookieStore.set(TEST_AUTH_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  redirect("/dashboard");
}

export async function changeOwnPasswordAction(formData: FormData) {
  if (isAuthBypassEnabled()) {
    return { success: false, error: "Password changes are disabled while local auth bypass is active." } as const;
  }

  const profile = await requireActiveProfile();
  try {
    enforceRateLimit({ key: `change-password:${profile.id}`, limit: 5, windowMs: 15 * 60_000 });
  } catch (error) {
    if (isRateLimitError(error)) {
      return { success: false, error: "Too many password change attempts. Try again in a few minutes." } as const;
    }
    throw error;
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Review the password fields and try again." } as const;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
    current_password: parsed.data.currentPassword,
  });

  if (error) {
    console.error(error);
    await recordAuditLog({
      actorId: profile.id,
      entityType: "Profile",
      entityId: profile.id,
      action: "PASSWORD_CHANGE_FAILED",
      newValue: { reason: "Supabase password update failed" },
    });
    return { success: false, error: "Password could not be updated. Check the current password and try again." } as const;
  }

  await recordAuditLog({
    actorId: profile.id,
    entityType: "Profile",
    entityId: profile.id,
    action: "PASSWORD_CHANGED",
  });

  return { success: true } as const;
}
