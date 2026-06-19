import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { requireActiveProfile } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await requireActiveProfile();

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar profile={profile} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader profile={profile} />
        <main className="flex-1 px-4 py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
