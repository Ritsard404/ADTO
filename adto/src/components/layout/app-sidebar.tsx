import Link from "next/link";
import type { Profile } from "@/generated/prisma/client";
import { navigationItems } from "@/constants/navigation";
import { cn } from "@/lib/utils";

export function AppSidebar({ profile }: { profile: Profile }) {
  const items = navigationItems.filter((item) => item.roles.includes(profile.role));

  return (
    <aside className="hidden w-72 shrink-0 border-r bg-sidebar px-4 py-5 lg:block">
      <div className="px-2">
        <p className="text-lg font-semibold tracking-tight">ADTO</p>
        <p className="text-xs text-muted-foreground">Tracking Every School&apos;s ACE Journey</p>
      </div>
      <nav className="mt-8 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href + item.title}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
