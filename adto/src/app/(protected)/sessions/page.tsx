import { CalendarDays, ClipboardList, Plus } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createActivityCategoryAction, upsertAdminSessionAction } from "@/features/admin/actions/admin";
import { createFacilitatorSessionAction, updateSessionAction, upsertProjectAction } from "@/features/facilitator/actions/adms-workflow";
import { previewBulkSchedulePasteAction, previewDuplicateScheduleAction, saveBulkScheduleRowsAction } from "@/features/sessions/actions/schedule-workflow";
import { ScheduleWorkbench } from "@/features/sessions/components/schedule-workbench";
import { requireActiveProfile } from "@/lib/auth";
import { withMockRelations } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";
import { getAccessibleSchoolIds } from "@/features/facilitator/services/adms-workflow.service";
import { getSessionsReadModel } from "@/features/sessions/services/sessions-read.service";

function dateInputValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default async function SessionsPage() {
  const profile = await requireActiveProfile();
  const schoolIds = await getAccessibleSchoolIds(profile);
  const { sessions, schools, projects } = await getSessionsReadModel(schoolIds);
  const mock = isMockDataMode() ? withMockRelations() : null;
  const facilitators = mock
    ? mock.facilitators
    : await prisma.profile.findMany({ where: { role: "FACILITATOR", status: "ACTIVE" }, orderBy: { fullName: "asc" } });
  const activityCategories = mock
    ? ["Onboarding", "Orientation", "Coding Session", "Build and Code Session", "Project Creation", "Showcase"]
    : await prisma.activityCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });

  type SessionRow = (typeof sessions)[number];
  const sessionsByMonth = sessions.reduce<Record<string, SessionRow[]>>((groups, session) => {
    const key = monthLabel(session.scheduledDate);
    groups[key] = groups[key] ?? [];
    groups[key].push(session);
    return groups;
  }, {});
  const canUpdateSessions = profile.role === "FACILITATOR";

  return (
    <div className="space-y-6">
      <PageHeader
        title="ACE Sessions"
        description="Update monthly ADMS sessions, facilitator remarks, and student-created ACE project records from the Excel workbook flow."
      />

      {profile.role === "ADMIN" ? (
        <Card className="adto-card">
          <CardHeader>
            <CardTitle>Admin Session Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={upsertAdminSessionAction} className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
              <Label>
                School
                <select name="schoolId" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </Label>
              <Label>
                Facilitator
                <select name="facilitatorId" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {facilitators.map((facilitator) => (
                    <option key={facilitator.id} value={facilitator.id}>
                      {facilitator.fullName}
                    </option>
                  ))}
                </select>
              </Label>
              <Label>
                Title
                <Input name="title" defaultValue="Coding Session" className="mt-1" />
              </Label>
              <Label>
                Date
                <Input name="scheduledDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1" />
              </Label>
              <Label>
                Time
                <Input name="startTime" type="time" className="mt-1" />
              </Label>
              <Label>
                Duration
                <Input name="durationHours" type="number" step="0.25" min="0" defaultValue="1" className="mt-1" />
              </Label>
              <Label>
                Grade
                <Input name="gradeLevel" defaultValue="Grade 7" className="mt-1" />
              </Label>
              <Label>
                Section
                <Input name="section" defaultValue="St. Francis" className="mt-1" />
              </Label>
              <Label>
                Subject
                <Input name="subject" defaultValue="Computer" className="mt-1" />
              </Label>
              <Label>
                Teacher
                <Input name="teacher" className="mt-1" />
              </Label>
              <Label>
                Activity
                <select name="activity" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {activityCategories.map((activity) => {
                    const name = typeof activity === "string" ? activity : activity.name;
                    return (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </Label>
              <Label>
                Modality
                <Input name="delivery" defaultValue="Classroom" className="mt-1" />
              </Label>
              <Label>
                Session #
                <Input name="sessionNumber" type="number" min="1" defaultValue={sessions.length + 1} className="mt-1" />
              </Label>
              <Label>
                Status
                <select name="status" defaultValue="NOT_STARTED" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {["NOT_STARTED", "ONGOING", "COMPLETED", "MISSED", "RESCHEDULED", "CANCELLED"].map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </Label>
              <div className="flex items-end">
                <Button type="submit">Create session</Button>
              </div>
            </form>
            <form action={createActivityCategoryAction} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
              <Input name="name" placeholder="New activity category" />
              <Input name="description" placeholder="Description" />
              <Button type="submit" variant="outline">Add activity</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {profile.role === "FACILITATOR" ? (
        <Card className="adto-card">
          <CardHeader>
            <CardTitle>Create ACE Session</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createFacilitatorSessionAction} className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
              <Label>
                School
                <select name="schoolId" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </Label>
              <Label>
                Session title
                <Input name="title" defaultValue="Coding Session" className="mt-1" />
              </Label>
              <Label>
                Date
                <Input name="scheduledDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1" />
              </Label>
              <Label>
                Time
                <Input name="startTime" type="time" className="mt-1" />
              </Label>
              <Label>
                Duration
                <Input name="durationHours" type="number" step="0.25" min="0" defaultValue="1" className="mt-1" />
              </Label>
              <Label>
                Grade
                <Input name="gradeLevel" defaultValue="Grade 7" className="mt-1" />
              </Label>
              <Label>
                Section
                <Input name="section" defaultValue="St. Francis" className="mt-1" />
              </Label>
              <Label>
                Subject
                <Input name="subject" defaultValue="Computer" className="mt-1" />
              </Label>
              <Label>
                Teacher
                <Input name="teacher" className="mt-1" />
              </Label>
              <Label>
                Activity
                <select name="activity" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {["Onboarding", "Student Orientation", "Coding Session", "Build and Code Session", "Project Creation", "Project Revision", "Consultation", "Assessment", "Competition", "Showcase"].map((activity) => (
                    <option key={activity} value={activity}>
                      {activity}
                    </option>
                  ))}
                </select>
              </Label>
              <Label>
                Modality
                <Input name="delivery" defaultValue="Classroom" className="mt-1" />
              </Label>
              <Label>
                Session #
                <Input name="sessionNumber" type="number" min="1" defaultValue={sessions.length + 1} className="mt-1" />
              </Label>
              <Label className="md:col-span-2">
                Remarks
                <Textarea name="remarks" className="mt-1 min-h-20" />
              </Label>
              <div className="flex items-end">
                <Button type="submit">Create session</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {(profile.role === "ADMIN" || profile.role === "FACILITATOR") && schools.length ? (
        <Card className="adto-card">
          <CardHeader>
            <CardTitle>Schedule Duplication and Excel Paste</CardTitle>
          </CardHeader>
          <CardContent>
            <ScheduleWorkbench
              schools={schools.map((school) => ({ id: school.id, name: school.name }))}
              facilitators={facilitators.map((facilitator) => ({ id: facilitator.id, fullName: facilitator.fullName }))}
              previewDuplicateAction={previewDuplicateScheduleAction}
              previewBulkAction={previewBulkSchedulePasteAction}
              saveBulkAction={saveBulkScheduleRowsAction}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="adto-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Monthly sessions</p>
            <p className="text-3xl font-bold">{sessions.length}</p>
          </CardContent>
        </Card>
        <Card className="adto-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-3xl font-bold">{sessions.filter((session) => session.status === "COMPLETED").length}</p>
          </CardContent>
        </Card>
        <Card className="adto-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">For action</p>
            <p className="text-3xl font-bold">
              {sessions.filter((session) => ["NOT_STARTED", "RESCHEDULED", "FOR_VERIFICATION"].includes(session.status)).length}
            </p>
          </CardContent>
        </Card>
        <Card className="adto-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Projects tracked</p>
            <p className="text-3xl font-bold">{projects.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="adto-card">
        <CardHeader className="flex flex-row items-center gap-3">
          <CalendarDays className="size-5 text-ace-blue" />
          <CardTitle>Monthly Session Calendar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(sessionsByMonth).map(([month, monthSessions]) => (
            <section key={month} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{month}</h2>
                <span className="text-sm text-muted-foreground">{monthSessions.length} sessions</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {monthSessions.map((session) => (
                  <div key={session.id} className="rounded-lg border bg-card p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{session.school.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {dateInputValue(session.scheduledDate)} · {session.gradeLevel} {session.section}
                        </p>
                      </div>
                      <StatusBadge status={session.status} />
                    </div>
                    {canUpdateSessions ? (
                      <form action={updateSessionAction} className="grid gap-3">
                        <input type="hidden" name="sessionId" value={session.id} />
                        <Label>
                          Session title
                          <Input name="title" defaultValue={session.title} className="mt-1" />
                        </Label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <Label>
                            Status
                            <select
                              name="status"
                              defaultValue={session.status}
                              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                              {["NOT_STARTED", "ONGOING", "COMPLETED", "RESCHEDULED", "CANCELLED", "FOR_VERIFICATION", "MISSED"].map((status) => (
                                <option key={status} value={status}>
                                  {status.replaceAll("_", " ")}
                                </option>
                              ))}
                            </select>
                          </Label>
                          <Label>
                            Date conducted
                            <Input name="actualDate" type="date" defaultValue={dateInputValue(session.actualDate)} className="mt-1" />
                          </Label>
                        </div>
                        <Label>
                          Facilitator remarks
                          <Textarea name="remarks" defaultValue={session.remarks ?? ""} className="mt-1 min-h-20" />
                        </Label>
                        <Button type="submit" className="w-fit">
                          Update session
                        </Button>
                      </form>
                    ) : (
                      <div className="grid gap-2 text-sm">
                        <p>
                          <span className="font-medium">Title:</span> {session.title}
                        </p>
                        <p>
                          <span className="font-medium">Date conducted:</span>{" "}
                          {session.actualDate ? dateInputValue(session.actualDate) : "Not recorded"}
                        </p>
                        <p>
                          <span className="font-medium">Remarks:</span> {session.remarks || "No remarks"}
                        </p>
                        <p className="rounded-md bg-muted p-2 text-muted-foreground">
                          Admins can view coding sessions but cannot modify them. Session updates are handled by facilitators.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </CardContent>
      </Card>

      <Card className="adto-card">
        <CardHeader className="flex flex-row items-center gap-3">
          <Plus className="size-5 text-ace-orange" />
          <CardTitle>Project Input</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={upsertProjectAction} className="grid gap-4 md:grid-cols-2">
            <Label>
              School
              <select name="schoolId" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" required>
                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </Label>
            <Label>
              Related session
              <select name="sessionId" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">No specific session</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {dateInputValue(session.scheduledDate)} · {session.gradeLevel} {session.section} · {session.title}
                  </option>
                ))}
              </select>
            </Label>
            <Label>
              Project title
              <Input name="title" className="mt-1" required />
            </Label>
            <Label>
              Project status
              <select name="status" defaultValue="SUBMITTED" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "CHECKED", "NEEDS_REVISION", "COMPLETED"].map((status) => (
                  <option key={status} value={status}>
                    {status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Label>
            <Label>
              Term
              <Input name="term" className="mt-1" placeholder="Quarter 3" />
            </Label>
            <Label>
              Grade/section
              <Input name="section" className="mt-1" placeholder="Grade 7 - Chastity" />
            </Label>
            <Label>
              Project type
              <Input name="projectType" className="mt-1" placeholder="Interactive Storybook" />
            </Label>
            <Label>
              Date submitted
              <Input name="submittedAt" type="date" className="mt-1" />
            </Label>
            <Label className="md:col-span-2">
              Link
              <Input name="projectUrl" className="mt-1" placeholder="Google Drive or documentation link" />
            </Label>
            <Label className="md:col-span-2">
              Description
              <Textarea name="description" className="mt-1 min-h-20" />
            </Label>
            <Label className="md:col-span-2">
              Remarks
              <Textarea name="remarks" className="mt-1 min-h-20" />
            </Label>
            <Button type="submit" className="w-fit md:col-span-2">
              Save project
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="adto-card">
        <CardHeader className="flex flex-row items-center gap-3">
          <ClipboardList className="size-5 text-ace-blue" />
          <CardTitle>Recent Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.title}</TableCell>
                  <TableCell>{project.school.name}</TableCell>
                  <TableCell>{project.section ?? project.gradeLevel ?? "Not specified"}</TableCell>
                  <TableCell>{project.projectType ?? "Not specified"}</TableCell>
                  <TableCell>
                    <StatusBadge status={project.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
