import type { Profile } from "@/generated/prisma/client";
import { ADTOBrandLockup } from "@/components/brand/ace-brand-mark";
import { StatusBadge } from "@/components/common/status-badge";
import { Separator } from "@/components/ui/separator";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { TestRoleSwitcher } from "@/components/layout/test-role-switcher";

export function AppHeader({ profile }: { profile: Profile }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/95 px-4 backdrop-blur lg:px-8">
      <div className="flex items-center gap-3">
        <MobileNav role={profile.role} />
        <div className="lg:hidden">
          <ADTOBrandLockup compact />
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold">{profile.fullName}</p>
          <p className="text-xs text-muted-foreground">{profile.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <TestRoleSwitcher activeRole={profile.role} />
        <StatusBadge status={profile.role} />
        <Separator orientation="vertical" className="h-6" />
        <SignOutButton />
      </div>
    </header>
  );
}
