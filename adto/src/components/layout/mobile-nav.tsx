"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { UserRole } from "@/generated/prisma/enums";
import { navigationGroups } from "@/constants/navigation";
import { ADTOBrandLockup } from "@/components/brand/ace-brand-mark";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function MobileNav({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>ADTO navigation</SheetTitle>
        </SheetHeader>
        <ADTOBrandLockup />
        <nav className="mt-6 space-y-5">
          {navigationGroups.map((group) => {
            const items = group.items.filter((item) => item.roles.includes(role));

            if (!items.length) {
              return null;
            }

            return (
              <div key={group.title} className="space-y-2">
                <p className="px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{group.title}</p>
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;

                  return (
                    <Link
                      key={group.title + item.href + item.title}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-accent",
                        active && "bg-ace-blue/10 text-ace-blue",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.title}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
