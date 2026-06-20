import { Activity, Boxes, CalendarDays, FileText, GraduationCap, School, Users } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFacilitatorMonthlyQuickView, getFacilitatorWorkspace } from "@/features/facilitator/services/facilitator-workspace.service";
import { requireActiveProfile } from "@/lib/auth";

export default async function FacilitatorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string; month?: string }>;
}) {
  const profile = await requireActiveProfile();
  const params = await searchParams;
  const workspace = await getFacilitatorWorkspace(profile);
  const quickView = await getFacilitatorMonthlyQuickView(profile, params);
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
          <CardTitle>Monthly QuickView</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
            <select name="schoolId" defaultValue={quickView.selectedSchool?.id ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {quickView.schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
            <Input name="month" type="month" defaultValue={quickView.month ?? ""} />
            <Button type="submit">Apply</Button>
          </form>
          {quickView.selectedSchool ? (
            <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr_1.1fr]">
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-semibold">{quickView.selectedSchool.name}</p>
                <p className="mt-1 text-muted-foreground">Form: {quickView.selectedSchool.deployedFormId ?? "Not set"}</p>
                <p className="text-muted-foreground">AF: {profile.fullName}</p>
                <p className="text-muted-foreground">Grades: {quickView.selectedSchool.gradeLevelAdoption ?? "Not set"}</p>
                <p className="text-muted-foreground">Adoption: {quickView.selectedSchool.adoptionYear ?? "Not set"} / {quickView.selectedSchool.adoptionType ?? "Not set"}</p>
                <p className="text-muted-foreground">Schedule: {quickView.selectedSchool.scheduleArrangement ?? "Not set"}</p>
              </div>
              {[
                ["This month", quickView.thisMonth],
                ["Cumulative", quickView.cumulative],
              ].map(([label, totals]) => (
                <div key={label as string} className="grid gap-2 rounded-lg border p-3 text-sm sm:grid-cols-2">
                  <p className="font-semibold sm:col-span-2">{label as string}</p>
                  <p>Scheduled: {(totals as typeof quickView.thisMonth).scheduledSessions}</p>
                  <p>Completed: {(totals as typeof quickView.thisMonth).completedSessions}</p>
                  <p>Cancelled: {(totals as typeof quickView.thisMonth).cancelledSessions}</p>
                  <p>Hours: {(totals as typeof quickView.thisMonth).codingHours}</p>
                  <p>Coders: {(totals as typeof quickView.thisMonth).activeCoders}</p>
                  <p>Projects: {(totals as typeof quickView.thisMonth).projectsCreated}</p>
                  <p className="text-muted-foreground sm:col-span-2">Project mix: {(totals as typeof quickView.thisMonth).projectTypeMix}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active school assignment is available for this QuickView.</p>
          )}
        </CardContent>
      </Card>
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
