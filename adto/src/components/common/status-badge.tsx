import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  ACTIVE: "border-success/20 bg-success/10 text-success",
  COMPLETED: "border-success/20 bg-success/10 text-success",
  ONGOING: "border-ace-blue/20 bg-ace-blue/10 text-ace-blue",
  NOT_STARTED: "border-warning/20 bg-warning/10 text-warning",
  PENDING: "border-warning/20 bg-warning/10 text-warning",
  DRAFT: "border-warning/20 bg-warning/10 text-warning",
  SUBMITTED: "border-ace-blue/20 bg-ace-blue/10 text-ace-blue",
  MISSED: "border-error/20 bg-error/10 text-error",
  DISABLED: "border-error/20 bg-error/10 text-error",
  NEEDS_REPLACEMENT: "border-error/20 bg-error/10 text-error",
  LOST: "border-error/20 bg-error/10 text-error",
  GOOD: "border-success/20 bg-success/10 text-success",
  NEW: "border-ace-blue/20 bg-ace-blue/10 text-ace-blue",
  FAIR: "border-warning/20 bg-warning/10 text-warning",
  INACTIVE: "border-muted bg-muted text-muted-foreground",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("h-6 rounded-full px-2.5 font-semibold", statusStyles[status] ?? "", className)}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
