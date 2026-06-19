import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { requireActiveProfile } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await requireActiveProfile();

  return (
    <div className="min-h-screen bg-background lg:pl-[280px]">
      <AppSidebar profile={profile} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader profile={profile} />
        <main className="flex-1 px-3 pb-24 pt-4 sm:px-4 lg:px-6 lg:pb-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
      <BottomNav role={profile.role} />
    </div>
  );
}
