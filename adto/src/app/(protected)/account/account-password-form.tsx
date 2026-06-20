"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeOwnPasswordAction } from "@/features/auth/actions/auth";

export function AccountPasswordForm({ email }: { email: string }) {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="max-w-2xl border">
      <div className="border-b bg-muted px-2 py-1 text-xs font-bold">Change Password</div>
      <div className="space-y-3 p-2">
        <div className="border bg-muted/40 p-2 text-xs text-muted-foreground">
          Signed in as <span className="font-medium text-foreground">{email}</span>.
        </div>
        <form
          action={(formData) => {
            setMessage(null);
            startTransition(async () => {
              const result = await changeOwnPasswordAction(formData);
              setMessage(result.success ? { type: "success", text: "Password updated." } : { type: "error", text: result.error });
            });
          }}
          className="grid gap-2"
        >
          <Label className="text-xs">
            Current password
            <Input name="currentPassword" type="password" minLength={6} autoComplete="current-password" className="mt-1 h-8" required />
          </Label>
          <Label className="text-xs">
            New password
            <Input name="newPassword" type="password" minLength={8} autoComplete="new-password" className="mt-1 h-8" required />
          </Label>
          <Label className="text-xs">
            Confirm new password
            <Input name="confirmPassword" type="password" minLength={8} autoComplete="new-password" className="mt-1 h-8" required />
          </Label>
          {message ? (
            <p className={message.type === "success" ? "border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs text-emerald-800" : "border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-800"}>
              {message.text}
            </p>
          ) : null}
          <Button type="submit" className="h-8 w-fit" disabled={pending}>
            {pending ? "Updating..." : "Update password"}
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground">
          In local testing with auth bypass enabled, password changes are disabled because there is no active Supabase Auth session.
        </p>
      </div>
    </div>
  );
}
