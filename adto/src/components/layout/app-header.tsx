import type { Profile } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SignOutButton } from "@/components/layout/sign-out-button";

export function AppHeader({ profile }: { profile: Profile }) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <MobileNav role={profile.role} />
        <div>
          <p className="text-sm font-medium">{profile.fullName}</p>
          <p className="text-xs text-muted-foreground">{profile.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="secondary">{profile.role.replace("_", " ")}</Badge>
        <Separator orientation="vertical" className="h-6" />
        <SignOutButton />
      </div>
    </header>
  );
}
