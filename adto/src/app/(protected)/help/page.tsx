import { HelpCircle } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";

const guides = [
  ["Compact ACE dashboard", "Dashboard layout, filters, metrics, and role access."],
  ["Facilitator workspace", "Assigned-school operations, schedules, projects, reports, and evidence."],
  ["Facilitator workbook tools", "Monthly QuickView, project register, inventory, evidence, and report preview."],
  ["Admin workbook governance", "Cross-school workbook health, import preview, and quality queues."],
  ["School admin portal", "School-scoped access for principals and school stakeholders."],
  ["Calendar", "Shared school calendar filters and views."],
  ["Schedules", "Duplicate schedules and paste from Excel."],
  ["Assignments", "Facilitator assignment history and reassignment."],
  ["Passwords", "Account password rules and admin resets."],
];

export default function HelpPage() {
  return (
    <div className="space-y-3">
      <PageHeader title="Help Center" description="Find concise ADTO workflow guides by role and task." />
      <div className="border">
        <div className="flex items-center gap-2 border-b bg-muted px-2 py-1 text-xs font-bold">
          <HelpCircle className="size-4" />
          User Guides
        </div>
        <div className="divide-y">
          {guides.map(([title, description]) => (
            <div key={title} className="grid gap-1 px-2 py-2 text-xs sm:grid-cols-[220px_1fr]">
              <span className="font-semibold text-foreground">{title}</span>
              <span className="text-muted-foreground">{description}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
