"use client";

import { useState } from "react";
import type { Profile } from "@/generated/prisma/client";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";

export function AppChrome({
  profile,
  dataMode,
  testRoleSwitcherEnabled,
  children,
}: {
  profile: Profile;
  dataMode: string;
  testRoleSwitcherEnabled: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(() => (typeof window === "undefined" ? false : window.localStorage.getItem("adto-sidebar") === "collapsed"));

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("adto-sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  return (
    <div className={collapsed ? "min-h-screen bg-background lg:pl-18" : "min-h-screen bg-background lg:pl-60"}>
      <AppSidebar profile={profile} collapsed={collapsed} onToggle={toggleCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader profile={profile} dataMode={dataMode} testRoleSwitcherEnabled={testRoleSwitcherEnabled} />
        <main className="flex-1 px-2 pb-20 pt-2 sm:px-3 lg:pb-3">
          <div className="mx-auto w-full max-w-[1800px]">{children}</div>
        </main>
      </div>
      <BottomNav role={profile.role} />
    </div>
  );
}
