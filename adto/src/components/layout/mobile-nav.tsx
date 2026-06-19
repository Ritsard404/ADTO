"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import type { UserRole } from "@/generated/prisma/enums";
import { navigationItems } from "@/constants/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function MobileNav({ role }: { role: UserRole }) {
  const items = navigationItems.filter((item) => item.roles.includes(role));

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>ADTO</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href + item.title} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent">
                <Icon className="size-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
