import { Activity, Boxes, CalendarDays, FileText, GraduationCap, School, Users } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFacilitatorWorkspace } from "@/features/facilitator/services/facilitator-workspace.service";
import { requireActiveProfile } from "@/lib/auth";

export default async function FacilitatorDashboardPage() {
  const profile = await requireActiveProfile();
  const workspace = await getFacilitatorWorkspace(profile);
  const { metrics } = workspace;
  const assignments = workspace.schools.flatMap((school) => school.assignments);
  const currentAssignment = assignments.find((assignment) => assignment.status === "ACTIVE");
  const previousAssignments = assignments.filter((assignment) => assignment.status !== "ACTIVE");

  return (
    <div className="space-y-6">
      <PageHeader title="Facilitator Workspace" description="Assigned-school ACE implementation, schedules, sessions, projects, reports, evidence, and inventory in one workspace." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Assigned Schools" value={metrics.assignedSchools} description={`${metrics.activeSchools} active schools`} icon={School} accent="blue" />
        <MetricCard title="Upcoming Sessions" value={metrics.upcomingSessions} description="Scheduled, ongoing, or rescheduled" icon={CalendarDays} accent="orange" />
        <MetricCard title="Completed Sessions" value={metrics.completedSessions} description={`${metrics.codingHours} coding hours delivered`} icon={GraduationCap} accent="green" />
        <MetricCard title="Participation" value={metrics.studentParticipation} description={`${metrics.teacherParticipation} teachers involved`} icon={Users} accent="blue" />
        <MetricCard title="Artifacts" value={metrics.computationalArtifacts} description={`${metrics.projectCompletionRate}% project completion`} icon={Activity} accent="red" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Pending Reports" value={metrics.pendingReports} description="Monthly or submitted reports needing action" icon={FileText} accent="orange" />
        <MetricCard title="Inventory Alerts" value={metrics.inventoryAlerts} description="Missing remarks, damaged, fair, or lost items" icon={Boxes} accent="red" />
        <MetricCard title="Activities" value={metrics.activityCount} description="Workbook activity categories logged" icon={Activity} accent="green" />
        <MetricCard title="Subjects" value={metrics.subjectIntegration} description="Subject integration coverage" icon={GraduationCap} accent="blue" />
      </div>
      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Assignment Lifecycle</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border bg-card p-3">
            <p className="text-sm font-semibold">Current Assignment</p>
            <p className="mt-2 text-lg font-bold">{currentAssignment?.schoolName ?? "No active school"}</p>
            <p className="text-sm text-muted-foreground">{currentAssignment?.status ?? "No active assignment"}</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="text-sm font-semibold">Previous Assignments</p>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {previousAssignments.map((assignment) => (
                <p key={`${assignment.schoolName}-${assignment.startDate.toISOString()}`}>
                  {assignment.schoolName} ({assignment.status})
                </p>
              ))}
              {!previousAssignments.length ? <p>No previous assignments.</p> : null}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Assigned School Snapshot</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Adoption</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspace.schools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell>{school.adoptionType ?? "Not set"}</TableCell>
                  <TableCell>{school.scheduleArrangement ?? "Not set"}</TableCell>
                  <TableCell>{"sections" in school ? school.sections.length : 0}</TableCell>
                  <TableCell><StatusBadge status={school.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
