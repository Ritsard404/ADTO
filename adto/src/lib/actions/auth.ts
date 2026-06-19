"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { loginSchema } from "@/lib/validations/auth";
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
