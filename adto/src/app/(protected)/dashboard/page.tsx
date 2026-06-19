import { Boxes, FileText, GraduationCap, School, Users } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const [schools, facilitators, sessions, completedSessions, pendingReports, schoolProgress] = await Promise.all([
    prisma.school.count(),
    prisma.profile.count({ where: { role: "FACILITATOR" } }),
    prisma.aCESession.count(),
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">ACE implementation snapshot across schools.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Schools" value={schools} description="Active school records" icon={School} />
        <MetricCard title="Facilitators" value={facilitators} description="Registered ACE facilitators" icon={Users} />
        <MetricCard title="ACE Sessions" value={sessions} description="Sessions in the tracker" icon={GraduationCap} />
        <MetricCard title="Completed" value={completedSessions} description="Completed session count" icon={Boxes} />
        <MetricCard title="Pending Reports" value={pendingReports} description="Draft or submitted reviews" icon={FileText} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Progress per School</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>School Year</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schoolProgress.map((school) => {
                const completed = school.sessions.filter((session) => session.status === "COMPLETED").length;
                const total = school.sessions.length;
                return (
                  <TableRow key={school.id}>
                    <TableCell className="font-medium">{school.name}</TableCell>
                    <TableCell>{school.schoolYear}</TableCell>
                    <TableCell>{total ? `${completed}/${total}` : "No sessions"}</TableCell>
                    <TableCell>
                      <Badge variant={school.status === "ACTIVE" ? "default" : "secondary"}>{school.status}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
