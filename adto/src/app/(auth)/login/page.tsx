import { LoginForm } from "@/components/forms/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">ADTO</h1>
          <p className="mt-2 text-sm text-muted-foreground">Tracking Every School&apos;s ACE Journey</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
