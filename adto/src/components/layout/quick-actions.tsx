"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { UserRole } from "@/generated/prisma/enums";

const actions = [
  { label: "New Session", href: "/sessions", roles: ["ADMIN", "FACILITATOR"] },
  { label: "Add Project", href: "/facilitator/projects", roles: ["FACILITATOR"] },
  { label: "Add Evidence", href: "/facilitator/evidence", roles: ["FACILITATOR"] },
  { label: "Reports", href: "/reports", roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
  { label: "School Access", href: "/schools", roles: ["ADMIN"] },
] satisfies Array<{ label: string; href: string; roles: UserRole[] }>;

export function QuickActions({ role }: { role: UserRole }) {
  const visible = actions.filter((action) => action.roles.includes(role));

  return (
    <details className="relative">
      <summary className="flex h-8 cursor-pointer list-none items-center gap-1 border bg-background px-2 text-xs font-semibold">
        <Plus className="size-3.5" />
        <span className="hidden sm:inline">New</span>
      </summary>
      <div className="absolute right-0 z-50 mt-1 min-w-40 border bg-background p-1">
        {visible.map((action) => (
          <Link key={action.href + action.label} href={action.href} className="block px-2 py-1.5 text-xs hover:bg-accent">
            {action.label}
          </Link>
        ))}
      </div>
    </details>
  );
}
