"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Profile } from "@/generated/prisma/client";
import { navigationGroups } from "@/constants/navigation";
import { ADTOBrandLockup } from "@/components/brand/ace-brand-mark";
import { cn } from "@/lib/utils";

export function AppSidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[280px] shrink-0 border-r bg-sidebar px-4 py-5 lg:block">
      <div className="flex h-full flex-col">
        <ADTOBrandLockup />
        <div className="mt-6 rounded-2xl border bg-background/70 p-3">
          <p className="truncate text-sm font-semibold text-foreground">{profile.fullName}</p>
          <p className="truncate text-xs text-muted-foreground">{profile.role.replace("_", " ")}</p>
        </div>
        <nav className="mt-6 flex-1 space-y-5 overflow-y-auto pr-1">
          {navigationGroups.map((group) => {
            const items = group.items.filter((item) => item.roles.includes(profile.role));

            if (!items.length) {
              return null;
            }

            return (
              <div key={group.title} className="space-y-2">
                <p className="px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{group.title}</p>
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;

                    return (
                      <Link
                        key={group.title + item.href + item.title}
                        href={item.href}
                        className={cn(
                          "adto-focus group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
                          active && "bg-ace-blue/10 text-ace-blue",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute left-0 h-5 w-1 rounded-r-full bg-transparent transition-colors",
                            active && "bg-ace-blue",
                          )}
                        />
                        <Icon className={cn("size-4 text-muted-foreground transition-colors", active && "text-ace-blue")} />
                        <span className="truncate">{item.title}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="mt-6 rounded-2xl border bg-ace-sky/70 p-4">
          <p className="text-sm font-bold text-foreground">Tracking Every School&apos;s ACE Journey</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">School progress, sessions, reports, and resources in one workspace.</p>
        </div>
      </div>
    </aside>
  );
}
