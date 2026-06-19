"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, FileText, GraduationCap, Home, School } from "lucide-react";
import type { UserRole } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const mobileItems = [
  { title: "Dashboard", href: "/dashboard", icon: Home, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
  { title: "Schools", href: "/schools", icon: School, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
  { title: "Sessions", href: "/sessions", icon: GraduationCap, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
  { title: "Inventory", href: "/inventory", icon: Boxes, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
  { title: "Reports", href: "/reports", icon: FileText, roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
] satisfies Array<{ title: string; href: string; icon: typeof Home; roles: UserRole[] }>;

export function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = mobileItems.filter((item) => item.roles.includes(role));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-semibold text-muted-foreground",
              active && "bg-ace-blue/10 text-ace-blue",
            )}
          >
            <Icon className="size-4" />
            <span className="truncate">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
