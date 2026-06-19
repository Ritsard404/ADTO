"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { signInWithPassword } from "@/features/auth/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signInWithPassword, null);

  return (
    <Card className="w-full max-w-md rounded-[28px] border bg-white/95 shadow-[0_20px_60px_rgba(30,136,229,0.12)] backdrop-blur">
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">Sign in to ADTO</CardTitle>
        <CardDescription>Use your ACE workspace account to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" className="h-11 rounded-xl" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" className="h-11 rounded-xl" required />
          </div>
          {state?.error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" className="h-11 w-full rounded-xl bg-ace-blue font-semibold shadow-[0_10px_24px_rgba(30,136,229,0.22)] hover:bg-ace-blue/90" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
