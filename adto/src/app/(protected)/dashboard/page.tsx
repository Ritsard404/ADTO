import { Activity, CalendarDays, FileText, GraduationCap, School, Users } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const [schools, facilitators, sessions, activeSessions, completedSessions, pendingReports, schoolProgress] = await Promise.all([
    prisma.school.count(),
    prisma.profile.count({ where: { role: "FACILITATOR" } }),
    prisma.aCESession.count(),
    prisma.aCESession.count({ where: { status: { in: ["NOT_STARTED", "ONGOING", "RESCHEDULED"] } } }),
    prisma.aCESession.count({ where: { status: "COMPLETED" } }),
    prisma.report.count({ where: { status: { in: ["DRAFT", "SUBMITTED"] } } }),
    prisma.school.findMany({
      take: 5,
      include: {
        sessions: {
          select: { status: true },
        },
      },
      orderBy: { name: "asc" },
    }),
  ]);
  const completionRate = sessions ? Math.round((completedSessions / sessions) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="A live ACE implementation snapshot for school coverage, facilitator activity, active sessions, reports, and completion progress."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Schools" value={schools} description="Schools tracked in ADTO" icon={School} accent="blue" />
        <MetricCard title="Total Facilitators" value={facilitators} description="ACE facilitators on record" icon={Users} accent="orange" />
        <MetricCard title="Active Sessions" value={activeSessions} description="Scheduled, ongoing, or rescheduled" icon={GraduationCap} accent="green" />
        <MetricCard title="Completion Rate" value={`${completionRate}%`} description={`${completedSessions} of ${sessions} sessions completed`} icon={Activity} accent="red" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
      <Card className="adto-card">
        <CardHeader>
          <CardTitle className="text-2xl">Progress by School</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>School Year</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schoolProgress.map((school) => {
                const completed = school.sessions.filter((session) => session.status === "COMPLETED").length;
                const total = school.sessions.length;
                const progress = total ? Math.round((completed / total) * 100) : 0;
                return (
                  <TableRow key={school.id}>
                    <TableCell className="font-medium">{school.name}</TableCell>
                    <TableCell>{school.schoolYear}</TableCell>
                    <TableCell>{total ? `${completed}/${total}` : "No sessions"}</TableCell>
                    <TableCell>
                      <div className="flex min-w-36 items-center gap-3">
                        <div className="h-2 flex-1 rounded-full bg-muted">
                          <div className="h-2 rounded-full bg-ace-blue" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="w-10 text-right text-xs font-semibold text-muted-foreground">{progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={school.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="grid gap-6">
        <Card className="adto-card">
          <CardHeader>
            <CardTitle className="text-lg">Pending Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-bold tracking-tight">{pendingReports}</p>
                <p className="mt-2 text-sm text-muted-foreground">Reports waiting for submission or review.</p>
              </div>
              <span className="flex size-12 items-center justify-center rounded-2xl bg-ace-orange/10 text-ace-orange">
                <FileText className="size-6" />
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="adto-card">
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Sessions</CardTitle>
          </CardHeader>
          <CardContent className="flex items-start gap-3 text-sm text-muted-foreground">
            <CalendarDays className="mt-0.5 size-5 text-ace-blue" />
            Session scheduling visibility will appear here as the ACE session workflow expands.
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
