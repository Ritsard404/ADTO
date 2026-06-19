import { LoginForm } from "@/components/forms/login-form";
import { ADTOBrandLockup } from "@/components/brand/ace-brand-mark";
import { BarChart3, FileText, GraduationCap, School } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#f8fbff_0%,#fff8ef_48%,#f4fbec_100%)] p-6">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(rgba(30,136,229,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(30,136,229,0.08)_1px,transparent_1px)] bg-[size:44px_44px]" />
      <div className="grid w-full max-w-6xl gap-10 lg:grid-cols-[1fr_440px] lg:items-center">
        <div className="space-y-8">
          <ADTOBrandLockup />
          <div className="max-w-2xl space-y-4">
            <h1 className="text-[40px] font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
              Tracking Every School&apos;s ACE Journey
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              Centralize ACE sessions, facilitator assignments, progress reports, inventory, and media evidence in one official workspace.
            </p>
          </div>
          <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border bg-ace-sky/80 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
              <School className="size-5 text-ace-blue" />
              <p className="mt-3 text-sm font-semibold text-foreground">School progress</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">See coverage, status, and sessions at a glance.</p>
            </div>
            <div className="rounded-2xl border bg-ace-cream/90 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
              <GraduationCap className="size-5 text-ace-orange" />
              <p className="mt-3 text-sm font-semibold text-foreground">ACE sessions</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Track facilitator work from schedule to completion.</p>
            </div>
            <div className="rounded-2xl border bg-ace-mint/90 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
              <BarChart3 className="size-5 text-green-700" />
              <p className="mt-3 text-sm font-semibold text-foreground">Program insights</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Turn school activity into useful dashboard signals.</p>
            </div>
            <div className="rounded-2xl border bg-ace-blush/80 p-4 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
              <FileText className="size-5 text-ace-red" />
              <p className="mt-3 text-sm font-semibold text-foreground">Reports ready</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Keep evidence, reports, and outputs easy to find.</p>
            </div>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
