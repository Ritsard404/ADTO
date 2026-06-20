import { Activity, AlertTriangle, Boxes, CalendarDays, FileText, GraduationCap, School, Users } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireActiveProfile } from "@/lib/auth";
import { getAccessibleSchoolIds } from "@/features/facilitator/services/adms-workflow.service";
import { getDashboardReadModel } from "@/features/dashboard/services/dashboard-read.service";
import { getAdminWorkbookGovernanceReadModel } from "@/features/admin/services/workbook-governance.service";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string; month?: string; term?: string; facilitatorId?: string; status?: string; adoptionType?: string }>;
}) {
  const profile = await requireActiveProfile();
  const params = await searchParams;
  const schoolIds = await getAccessibleSchoolIds(profile);
  const {
    schools,
    activeSchools,
    facilitators,
    assignedFacilitators,
    unassignedSchools,
    sessions,
    activeSessions,
    completedSessions,
    pendingReports,
    projects,
    pendingInventoryRemarks,
    totalStudents,
    codingHours,
    activities,
    assignedInventoryItems,
    schoolProgress,
  } = await getDashboardReadModel(schoolIds);
  const adminWorkbook = profile.role === "ADMIN" ? await getAdminWorkbookGovernanceReadModel(params) : null;
  const completionRate = sessions ? Math.round((completedSessions / sessions) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="A live ACE implementation snapshot for school coverage, facilitator activity, active sessions, reports, and completion progress."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total Schools" value={schools} description="Schools tracked in ADTO" icon={School} accent="blue" />
        <MetricCard title="Active Schools" value={activeSchools} description={`${unassignedSchools} schools need AF assignment`} icon={School} accent="orange" />
        <MetricCard title="Total Facilitators" value={facilitators} description={`${assignedFacilitators} active AF assignments`} icon={Users} accent="orange" />
        <MetricCard title="Active Sessions" value={activeSessions} description="Scheduled, ongoing, or rescheduled" icon={GraduationCap} accent="green" />
        <MetricCard title="Completion Rate" value={`${completionRate}%`} description={`${completedSessions} of ${sessions} sessions completed`} icon={Activity} accent="red" />
      </div>
      {profile.role === "FACILITATOR" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Students Reached" value={totalStudents} description="Assigned-school student coders" icon={Users} accent="blue" />
          <MetricCard title="Coding Hours" value={codingHours} description="Delivered session hours" icon={Activity} accent="green" />
          <MetricCard title="Activities Conducted" value={activities} description="Unique ACE activities encoded" icon={CalendarDays} accent="orange" />
          <MetricCard title="Assigned Inventory" value={assignedInventoryItems} description="Inventory items in assigned schools" icon={Boxes} accent="red" />
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Projects" value={projects} description="Student-created ACE projects tracked" icon={FileText} accent="blue" />
        <MetricCard title="Pending Remarks" value={pendingInventoryRemarks} description="Inventory items needing verification notes" icon={Boxes} accent="orange" />
        <MetricCard title="Session Updates" value={activeSessions} description="Facilitator session records still open" icon={CalendarDays} accent="green" />
        <MetricCard title="Reports Pending" value={pendingReports} description="Draft or submitted reports" icon={FileText} accent="red" />
      </div>
      {adminWorkbook ? (
        <div className="space-y-6">
          <Card className="adto-card">
            <CardHeader>
              <CardTitle className="text-2xl">Workbook QuickView Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                <select name="schoolId" defaultValue={params.schoolId ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">All schools</option>
                  {adminWorkbook.filters.schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
                </select>
                <input name="month" type="month" defaultValue={params.month ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
                <input name="term" defaultValue={params.term ?? ""} placeholder="Term / quarter" className="h-10 rounded-md border border-input bg-background px-3 text-sm" />
                <select name="facilitatorId" defaultValue={params.facilitatorId ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">All facilitators</option>
                  {adminWorkbook.filters.facilitators.map((facilitator) => <option key={facilitator.id} value={facilitator.id}>{facilitator.fullName}</option>)}
                </select>
                <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">All statuses</option>
                  {["ACTIVE", "INACTIVE", "ARCHIVED"].map((statusOption) => <option key={statusOption} value={statusOption}>{statusOption}</option>)}
                </select>
                <select name="adoptionType" defaultValue={params.adoptionType ?? ""} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">All adoption types</option>
                  {adminWorkbook.filters.adoptionTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
                <Button type="submit" className="xl:col-start-6">Apply</Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Scheduled Sessions" value={adminWorkbook.totals.scheduledSessions} description="Workbook-style scheduled rows" icon={CalendarDays} accent="blue" />
            <MetricCard title="Completed Sessions" value={adminWorkbook.totals.completedSessions} description={`${adminWorkbook.totals.cancelledSessions} cancelled`} icon={GraduationCap} accent="green" />
            <MetricCard title="Coding Hours" value={adminWorkbook.totals.codingHours} description={`${adminWorkbook.totals.activeCoders} active coders`} icon={Activity} accent="orange" />
            <MetricCard title="Needs Attention" value={adminWorkbook.totals.schoolsNeedingAttention} description="Schools with setup or evidence gaps" icon={AlertTriangle} accent="red" />
          </div>

          <Card className="adto-card">
            <CardHeader>
              <CardTitle className="text-2xl">Admin Cross-School Workbook QuickView</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>AF</TableHead>
                    <TableHead>Sessions</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Coders</TableHead>
                    <TableHead>Projects</TableHead>
                    <TableHead>Teachers</TableHead>
                    <TableHead>Attention</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminWorkbook.schoolRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.name}<span className="block text-xs text-muted-foreground">{row.adoptionType}</span></TableCell>
                      <TableCell>{row.deployedFormId}<span className="block text-xs text-muted-foreground">{row.schoolCode}</span></TableCell>
                      <TableCell>{row.facilitatorNames}</TableCell>
                      <TableCell>{row.completedSessions}/{row.scheduledSessions}<span className="block text-xs text-muted-foreground">{row.cancelledSessions} cancelled</span></TableCell>
                      <TableCell>{row.codingHours}</TableCell>
                      <TableCell>{row.activeCoders}</TableCell>
                      <TableCell>{row.projectCount}<span className="block max-w-48 truncate text-xs text-muted-foreground">{row.projectTypeMix || "No mix yet"}</span></TableCell>
                      <TableCell>{row.teachersInvolved}</TableCell>
                      <TableCell className="max-w-64 text-xs text-muted-foreground">{row.attention.join(", ") || "Clear"}</TableCell>
                    </TableRow>
                  ))}
                  {!adminWorkbook.schoolRows.length ? (
                    <TableRow><TableCell colSpan={9} className="text-muted-foreground">No schools match the selected workbook filters.</TableCell></TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="adto-card">
              <CardHeader><CardTitle>Assignment And Coverage Governance</CardTitle></CardHeader>
              <CardContent className="grid gap-3 text-sm">
                {[
                  ["Unassigned schools", adminWorkbook.coverage.unassignedSchools],
                  ["Overloaded facilitators", adminWorkbook.coverage.overloadedFacilitators],
                  ["Inactive AF with active assignment", adminWorkbook.coverage.inactiveFacilitatorsWithActiveAssignments],
                  ["Schools with multiple active AFs", adminWorkbook.coverage.schoolsWithMultipleActiveAssignments],
                ].map(([label, values]) => (
                  <div key={label as string} className="rounded-lg border p-3">
                    <p className="font-semibold">{label as string}</p>
                    <p className="mt-1 text-muted-foreground">{(values as string[]).join(", ") || "None"}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="adto-card">
              <CardHeader><CardTitle>Data Quality Queue</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>School</TableHead><TableHead>Issue</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {adminWorkbook.queues.dataQuality.map((item) => (
                      <TableRow key={`${item.school}-${item.issue}`}><TableCell>{item.school}</TableCell><TableCell>{item.issue}</TableCell></TableRow>
                    ))}
                    {!adminWorkbook.queues.dataQuality.length ? <TableRow><TableCell colSpan={2} className="text-muted-foreground">No report-blocking data quality issues found.</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card className="adto-card">
            <CardHeader><CardTitle>Workbook Import Review Preview</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Sheet</TableHead><TableHead>Rows</TableHead><TableHead>Sample fields</TableHead><TableHead>Validation notes</TableHead></TableRow></TableHeader>
                <TableBody>
                  {adminWorkbook.importPreview.map((sheet) => (
                    <TableRow key={sheet.sheet}>
                      <TableCell className="font-medium">{sheet.sheet}</TableCell>
                      <TableCell>{sheet.rowsRead}</TableCell>
                      <TableCell className="max-w-96 truncate text-xs text-muted-foreground">{sheet.sample[0] ? Object.keys(sheet.sample[0]).join(", ") : "No sample rows"}</TableCell>
                      <TableCell className="max-w-96 text-xs text-muted-foreground">{sheet.errors.slice(0, 3).map((error) => `Row ${error.row} ${error.field}: ${error.message}`).join("; ") || "Ready for review"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="adto-card">
              <CardHeader><CardTitle>Audit Trail</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Entity</TableHead><TableHead>Action</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {adminWorkbook.queues.auditLogs.map((log) => (
                      <TableRow key={log.id}><TableCell>{log.entityType}</TableCell><TableCell>{log.action}</TableCell><TableCell>{log.createdAt.toLocaleDateString("en-US")}</TableCell></TableRow>
                    ))}
                    {!adminWorkbook.queues.auditLogs.length ? <TableRow><TableCell colSpan={3} className="text-muted-foreground">No audit records yet.</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card className="adto-card">
              <CardHeader><CardTitle>Approvals And Report History</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {adminWorkbook.queues.approvalRequests.map((request) => (
                      <TableRow key={request.id}><TableCell>{request.entityType} {request.action}</TableCell><TableCell>{request.status}</TableCell><TableCell>{request.createdAt.toLocaleDateString("en-US")}</TableCell></TableRow>
                    ))}
                    {adminWorkbook.queues.reportHistory.map((entry) => (
                      <TableRow key={entry.id}><TableCell>{entry.school.name} {entry.reportType}</TableCell><TableCell>Generated</TableCell><TableCell>{entry.generatedAt.toLocaleDateString("en-US")}</TableCell></TableRow>
                    ))}
                    {!adminWorkbook.queues.approvalRequests.length && !adminWorkbook.queues.reportHistory.length ? <TableRow><TableCell colSpan={3} className="text-muted-foreground">No approvals or report history yet.</TableCell></TableRow> : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
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
