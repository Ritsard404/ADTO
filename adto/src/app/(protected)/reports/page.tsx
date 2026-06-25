import { Download, Eye, FileText } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { askReportAssistantAction } from "@/features/assistant/actions/report-assistant";
import { ReportAssistantPanel } from "@/features/assistant/components/report-assistant-panel";
import { createFacilitatorMonthlyReportAction } from "@/features/facilitator/actions/adms-workflow";
import { requireActiveProfile } from "@/lib/auth";
import { withMockRelations } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";
import { buildSchoolReportPreview, getAccessibleReportSchools, type ReportType } from "@/features/reports/services/school-report.service";

const officialReportTypes: Array<{ value: ReportType; label: string; tab: string }> = [
  { value: "dashboard", label: "School Dashboard Report", tab: "Dashboard Reports" },
  { value: "mid-year", label: "Mid-Year Report", tab: "Mid-Year Reports" },
  { value: "year-end", label: "Year-End Report", tab: "Year-End Reports" },
];

function metricCard(label: string, value: string | number) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string; schoolYear?: string; reportType?: string }>;
}) {
  const profile = await requireActiveProfile();
  const params = await searchParams;
  const reportSchools = await getAccessibleReportSchools(profile);
  const selectedSchool = reportSchools.find((school) => school.id === params.schoolId) ?? reportSchools[0];
  const selectedSchoolYear = params.schoolYear ?? selectedSchool?.schoolYear ?? "2025 - 2026";
  const selectedReportType = officialReportTypes.some((item) => item.value === params.reportType)
    ? (params.reportType as ReportType)
    : "year-end";
  const canUseOfficialReports = profile.role === "ADMIN" || profile.role === "SCHOOL_ADMIN";

  const mock = isMockDataMode() ? withMockRelations() : null;
  const [reports, history, preview] = await Promise.all([
    mock
      ? Promise.resolve(mock.reports.filter((report) => !selectedSchool || report.schoolId === selectedSchool.id))
      : prisma.report.findMany({
          where: selectedSchool ? { schoolId: selectedSchool.id } : undefined,
          include: { school: true, facilitator: true },
          orderBy: { title: "asc" },
        }),
    mock
      ? Promise.resolve(mock.reportHistories.filter((entry) => !selectedSchool || entry.schoolId === selectedSchool.id))
      : prisma.reportHistory.findMany({
          where: selectedSchool ? { schoolId: selectedSchool.id } : undefined,
          include: { school: true },
          orderBy: { generatedAt: "desc" },
          take: 25,
        }),
    selectedSchool ? buildSchoolReportPreview(selectedSchool.id, selectedSchoolYear, selectedReportType) : null,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Preview official ACE school reports, generate PPT/PDF downloads, and review report history from ADMS data."
      />

      {canUseOfficialReports ? (
        <Tabs defaultValue={selectedReportType} className="space-y-4">
          <TabsList className="flex-wrap">
            {officialReportTypes.map((type) => (
              <TabsTrigger key={type.value} value={type.value}>
                {type.tab}
              </TabsTrigger>
            ))}
            <TabsTrigger value="history">Download History</TabsTrigger>
          </TabsList>

          {officialReportTypes.map((type) => (
            <TabsContent key={type.value} value={type.value} className="space-y-4">
              <Card className="adto-card">
                <CardHeader>
                  <CardTitle>{type.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form className="grid gap-3 md:grid-cols-[1fr_180px_auto]">
                    <input type="hidden" name="reportType" value={type.value} />
                    <Label>
                      School
                      <select
                        name="schoolId"
                        defaultValue={selectedSchool?.id}
                        className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {reportSchools.map((school) => (
                          <option key={school.id} value={school.id}>
                            {school.name}
                          </option>
                        ))}
                      </select>
                    </Label>
                    <Label>
                      School year
                      <Input name="schoolYear" defaultValue={selectedSchoolYear} className="mt-1" />
                    </Label>
                    <div className="flex items-end">
                      <Button type="submit" variant="outline">
                        <Eye className="size-4" />
                        Preview
                      </Button>
                    </div>
                  </form>

                  {preview ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border bg-muted/40 p-4">
                        <p className="font-semibold">{preview.school.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Template: {preview.templateName}. Metrics are computed from ADMS database records.
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {metricCard("Coding Sessions Logged", preview.metrics.totalSessions)}
                        {metricCard("Coding Hours Delivered", preview.metrics.codingHours)}
                        {metricCard("Activities Count", preview.metrics.activities)}
                        {metricCard("Computational Artifacts", preview.metrics.artifacts)}
                        {metricCard("Participating Teachers", preview.metrics.teachers)}
                        {metricCard("Student Coders", preview.metrics.studentCoders || "From projects")}
                        {metricCard("Active Facilitators", preview.metrics.facilitators)}
                        {metricCard("Most Active Grade", preview.metrics.mostActiveGrade)}
                      </div>
                      <ReportAssistantPanel
                        schoolId={preview.school.id}
                        schoolYear={selectedSchoolYear}
                        reportType={type.value}
                        action={askReportAssistantAction}
                      />
                      <div className="flex flex-wrap gap-3">
                        <Button asChild>
                          <a
                            href={`/reports/official?schoolId=${preview.school.id}&schoolYear=${encodeURIComponent(
                              selectedSchoolYear,
                            )}&reportType=${type.value}&format=pptx`}
                          >
                            <Download className="size-4" />
                            Generate PPT
                          </a>
                        </Button>
                        <Button asChild variant="outline">
                          <a
                            href={`/reports/official?schoolId=${preview.school.id}&schoolYear=${encodeURIComponent(
                              selectedSchoolYear,
                            )}&reportType=${type.value}&format=pdf`}
                          >
                            <Download className="size-4" />
                            Generate PDF
                          </a>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No accessible school is linked to this account for official report generation.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}

          <TabsContent value="history">
            <Card className="adto-card">
              <CardHeader>
                <CardTitle>Download History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>School Year</TableHead>
                      <TableHead>Generated</TableHead>
                      <TableHead>Downloads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.school.name}</TableCell>
                        <TableCell>{entry.reportType.replace("-", " ")}</TableCell>
                        <TableCell>{entry.schoolYear}</TableCell>
                        <TableCell>{entry.generatedAt.toLocaleString("en-US")}</TableCell>
                        <TableCell className="flex gap-2">
                          <Button asChild size="sm" variant="outline">
                            <a href={entry.pptFileUrl}>PPT</a>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <a href={entry.pdfFileUrl}>PDF</a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!history.length ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-muted-foreground">
                          No official report downloads yet.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <Card className="adto-card">
          <CardHeader>
            <CardTitle>Facilitator Report Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <FileText className="size-5" />
              Official PPT/PDF generation is limited to School Admins and Admins. Use this preview to prepare monthly narratives and check the metrics they will see.
            </div>
            {preview ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {metricCard("Coding Sessions Logged", preview.metrics.totalSessions)}
                  {metricCard("Coding Hours Delivered", preview.metrics.codingHours)}
                  {metricCard("Activities Count", preview.metrics.activities)}
                  {metricCard("Student Outputs", preview.metrics.artifacts)}
                  {metricCard("Participating Teachers", preview.metrics.teachers)}
                  {metricCard("Project Types", preview.metrics.projectTypes)}
                  {metricCard("Most Active Grade", preview.metrics.mostActiveGrade)}
                  {metricCard("Most Active Teacher", preview.metrics.mostActiveTeacher)}
                </div>
                <ReportAssistantPanel
                  schoolId={preview.school.id}
                  schoolYear={selectedSchoolYear}
                  reportType={selectedReportType}
                  action={askReportAssistantAction}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No assigned school is available for report preview.</p>
            )}
          </CardContent>
        </Card>
      )}

      {profile.role === "FACILITATOR" ? (
        <Card className="adto-card">
          <CardHeader>
            <CardTitle>Monthly Monitoring Report</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createFacilitatorMonthlyReportAction} className="grid gap-3 md:grid-cols-2">
              <Label>
                School
                <select name="schoolId" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {reportSchools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </Label>
              <Label>
                School year
                <Input name="schoolYear" defaultValue={selectedSchoolYear} className="mt-1" />
              </Label>
              <Label className="md:col-span-2">
                Report title
                <Input name="title" defaultValue="Monthly ACE Monitoring Report" className="mt-1" />
              </Label>
              <Label>
                Accomplishments
                <textarea name="accomplishments" className="mt-1 min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </Label>
              <Label>
                Challenges
                <textarea name="challenges" className="mt-1 min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </Label>
              <Label>
                Recommendations
                <textarea name="recommendations" className="mt-1 min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </Label>
              <Label>
                School updates
                <textarea name="schoolUpdates" className="mt-1 min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </Label>
              <Label className="md:col-span-2">
                Quick insights
                <textarea name="quickInsights" className="mt-1 min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </Label>
              <Button type="submit" className="w-fit md:col-span-2">
                Submit monthly report
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {profile.role === "ADMIN" ? (
        <Card className="adto-card">
          <CardHeader>
            <CardTitle>Admin CSV Downloads</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["summary", "Overall ADMS summary"],
              ["schools", "School summary"],
              ["assignments", "AF assignment report"],
              ["projects", "Project report"],
              ["inventory", "Inventory report"],
              ["inventory-remarks", "Inventory remarks report"],
            ].map(([csvType, label]) => (
              <Button key={csvType} asChild variant="outline">
                <a href={`/reports/download?type=${csvType}`}>{label}</a>
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Submitted Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Facilitator</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.title}</TableCell>
                  <TableCell>{report.school.name}</TableCell>
                  <TableCell>{report.facilitator.fullName}</TableCell>
                  <TableCell>
                    <StatusBadge status={report.status} />
                  </TableCell>
                </TableRow>
              ))}
              {!reports.length ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No submitted reports yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
