import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="adto-card overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground">{title}</CardTitle>
        <span className={cn("flex size-10 items-center justify-center rounded-2xl", accentClasses[accent])}>
          <Icon className="size-5" />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-[32px] font-bold leading-none tracking-tight">{value}</div>
        <p className="mt-2 text-sm leading-5 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
