import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  accent = "blue",
}: {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  accent?: "blue" | "orange" | "green" | "red";
}) {
  const accentClasses = {
    blue: "bg-ace-sky text-ace-blue",
    orange: "bg-ace-cream text-ace-orange",
    green: "bg-ace-mint text-green-700 dark:text-ace-green",
    red: "bg-ace-blush text-ace-red",
  };

  return (
    <div className="grid grid-cols-[1fr_auto] gap-2 border bg-card px-2 py-1.5">
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold text-muted-foreground">{title}</p>
        <div className="text-xl font-bold leading-none tracking-tight">{value}</div>
        <p className="truncate text-[11px] text-muted-foreground">{description}</p>
      </div>
      <span className={cn("flex size-7 items-center justify-center rounded-sm", accentClasses[accent])}>
          <Icon className="size-5" />
      </span>
    </div>
  );
}
