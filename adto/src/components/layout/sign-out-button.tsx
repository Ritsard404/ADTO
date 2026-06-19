"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/features/auth/actions/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="icon" className="rounded-xl" aria-label="Sign out">
        <LogOut className="size-4" />
      </Button>
    </form>
  );
}
