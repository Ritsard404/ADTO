import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFacilitatorWorkspace } from "@/features/facilitator/services/facilitator-workspace.service";
import { requireActiveProfile } from "@/lib/auth";

function countBy<T>(items: readonly T[], getKey: (item: T) => string | null | undefined) {
  return Array.from(
    items.reduce((map, item) => {
      const key = getKey(item) || "Not set";
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1]);
}

function BarList({ title, rows }: { title: string; rows: Array<[string, number]> }) {
  const max = Math.max(1, ...rows.map(([, count]) => count));
  return (
    <Card className="adto-card">
      <CardHeader><CardTitle className="text-lg">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.slice(0, 8).map(([label, count]) => (
          <div key={label} className="space-y-1">
            <div className="flex justify-between gap-3 text-sm"><span className="truncate">{label}</span><span className="font-semibold">{count}</span></div>
            <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-ace-blue" style={{ width: `${Math.max(8, (count / max) * 100)}%` }} /></div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function FacilitatorAnalyticsPage() {
  const profile = await requireActiveProfile();
  const { sessions, projects, metrics } = await getFacilitatorWorkspace(profile);

  return (
    <div className="space-y-6">
      <PageHeader title="Facilitator Analytics" description="Responsive ACE implementation analytics for grade coverage, teachers, schools, coding hours, artifacts, and engagement." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="adto-card"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Coding hours</p><p className="text-3xl font-bold">{metrics.codingHours}</p></CardContent></Card>
        <Card className="adto-card"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Teacher engagement</p><p className="text-3xl font-bold">{metrics.teacherParticipation}</p></CardContent></Card>
        <Card className="adto-card"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Student engagement</p><p className="text-3xl font-bold">{metrics.studentParticipation}</p></CardContent></Card>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <BarList title="Sessions by Grade" rows={countBy(sessions, (session) => session.gradeLevel)} />
        <BarList title="Sessions by Teacher" rows={countBy(sessions, (session) => session.teacher)} />
        <BarList title="Sessions by School" rows={countBy(sessions, (session) => session.school.name)} />
        <BarList title="Artifact Counts" rows={countBy(projects, (project) => project.projectType)} />
      </div>
      <Card className="adto-card">
        <CardHeader className="flex flex-row items-center gap-3"><BarChart3 className="size-5 text-ace-orange" /><CardTitle>Project Completion</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="h-3 flex-1 rounded-full bg-muted"><div className="h-3 rounded-full bg-ace-green" style={{ width: `${metrics.projectCompletionRate}%` }} /></div>
            <span className="text-sm font-semibold">{metrics.projectCompletionRate}% completed</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
