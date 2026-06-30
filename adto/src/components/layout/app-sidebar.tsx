"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { Profile } from "@/generated/prisma/client";
import { navigationGroups } from "@/constants/navigation";
import { ADTOBrandLockup } from "@/components/brand/ace-brand-mark";
import { isNavigationItemActive } from "@/components/layout/navigation-active";
import { cn } from "@/lib/utils";

export function AppSidebar({ profile, collapsed, onToggle }: { profile: Profile; collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  return (
    <aside className={cn("fixed inset-y-0 left-0 hidden shrink-0 border-r bg-sidebar px-2 py-2 lg:block", collapsed ? "w-18" : "w-60")}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-2">
          <ADTOBrandLockup compact={collapsed} />
          <button type="button" onClick={onToggle} className="adto-focus rounded border p-1 text-muted-foreground hover:bg-sidebar-accent" aria-label="Toggle sidebar">
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>
        {!collapsed ? (
          <div className="mt-2 border bg-background/70 p-2">
            <p className="truncate text-xs font-semibold text-foreground">{profile.fullName}</p>
            <p className="truncate text-[10px] text-muted-foreground">{profile.role.replace("_", " ")}</p>
          </div>
        ) : null}
        <nav className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
          {navigationGroups.map((group) => {
            const items = group.items.filter((item) => item.roles.includes(profile.role));

            if (!items.length) {
              return null;
            }

            return (
              <div key={group.title} className="space-y-1">
                {!collapsed ? <p className="px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{group.title}</p> : null}
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = isNavigationItemActive(item, items, pathname, search);

                    return (
                      <Link
                        key={group.title + item.href + item.title}
                        href={item.href}
                        className={cn(
                          "adto-focus group relative flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-accent",
                          collapsed && "justify-center px-1",
                          active && "bg-ace-blue/10 text-ace-blue",
                        )}
                        title={collapsed ? item.title : undefined}
                      >
                        <span
                          className={cn(
                            "absolute left-0 h-5 w-1 rounded-r-full bg-transparent transition-colors",
                            active && "bg-ace-blue",
                          )}
                        />
                        <Icon className={cn("size-4 text-muted-foreground transition-colors", active && "text-ace-blue")} />
                        {!collapsed ? <span className="truncate">{item.title}</span> : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        {!collapsed ? <div className="mt-2 border bg-ace-sky/70 p-2">
          <p className="text-sm font-bold text-foreground">Tracking Every School&apos;s ACE Journey</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">School progress, sessions, reports, and resources in one workspace.</p>
        </div> : null}
      </div>
    </aside>
  );
}
