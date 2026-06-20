"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { changePasswordSchema, loginSchema } from "@/features/auth/schemas/auth";
import { requireActiveProfile } from "@/lib/auth";
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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

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

  await requireActiveProfile();
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
    return { success: false, error: "Password could not be updated. Check the current password and try again." } as const;
  }

  return { success: true } as const;
}
