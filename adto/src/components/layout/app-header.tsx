import type { Profile } from "@/generated/prisma/client";
import { ADTOBrandLockup } from "@/components/brand/ace-brand-mark";
import { StatusBadge } from "@/components/common/status-badge";
import { Separator } from "@/components/ui/separator";
import { MobileNav } from "@/components/layout/mobile-nav";
import { GlobalSearch } from "@/components/layout/global-search";
import { QuickActions } from "@/components/layout/quick-actions";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { TestRoleSwitcher } from "@/components/layout/test-role-switcher";

export function AppHeader({ profile, dataMode, testRoleSwitcherEnabled }: { profile: Profile; dataMode: string; testRoleSwitcherEnabled: boolean }) {
  return (
    <header className="sticky top-0 z-30 grid h-11 grid-cols-[auto_minmax(120px,1fr)_auto] items-center gap-2 border-b bg-card/95 px-2 backdrop-blur lg:px-3">
      <div className="flex min-w-0 items-center gap-2">
        <MobileNav role={profile.role} />
        <div className="lg:hidden">
          <ADTOBrandLockup compact />
        </div>
        <div className="hidden min-w-0 sm:block">
          <p className="truncate text-xs font-semibold">{profile.fullName}</p>
          <p className="truncate text-[10px] text-muted-foreground">{profile.role.replace("_", " ")}</p>
        </div>
      </div>
      <GlobalSearch />
      <div className="flex items-center gap-1">
        {dataMode === "mock" ? <StatusBadge status="MOCK DATA" /> : null}
        <QuickActions role={profile.role} />
        <TestRoleSwitcher activeRole={profile.role} enabled={testRoleSwitcherEnabled} />
        <span className="hidden md:inline-flex"><StatusBadge status={profile.role} /></span>
        <Separator orientation="vertical" className="hidden h-5 sm:block" />
        <SignOutButton />
      </div>
    </header>
  );
}
