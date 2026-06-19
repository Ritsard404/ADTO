import type { UserRole } from "@/generated/prisma/enums";
import { switchTestRole } from "@/lib/actions/auth";
import { isAuthBypassEnabled } from "@/lib/test-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const testRoles = [
  { label: "Admin", value: "ADMIN" },
  { label: "Facilitator", value: "FACILITATOR" },
] satisfies { label: string; value: UserRole }[];

export function TestRoleSwitcher({ activeRole }: { activeRole: UserRole }) {
  if (!isAuthBypassEnabled()) {
    return null;
  }

  return (
    <div className="hidden items-center gap-1 rounded-2xl border bg-ace-cream/80 p-1 sm:flex">
      {testRoles.map((role) => (
        <form key={role.value} action={switchTestRole}>
          <input type="hidden" name="role" value={role.value} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 rounded-xl px-3 text-xs font-semibold",
              activeRole === role.value && "bg-card text-ace-blue shadow-[0_1px_3px_rgba(15,23,42,0.08)]",
            )}
          >
            {role.label}
          </Button>
        </form>
      ))}
    </div>
  );
}
