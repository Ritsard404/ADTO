import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { endAssignmentAction, upsertAssignmentAction } from "@/features/admin/actions/admin";
import { requireRole } from "@/lib/auth";
import { withMockRelations } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";

function dateInputValue(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function FacilitatorsPage() {
  await requireRole(["ADMIN"]);
  const mock = isMockDataMode() ? withMockRelations() : null;
  const [facilitators, schools, assignments] = mock
    ? [mock.facilitators, mock.schools, mock.assignments]
    : await Promise.all([
        prisma.profile.findMany({
          where: { role: "FACILITATOR" },
          include: { facilitatorAssignments: { include: { school: true }, orderBy: { startDate: "desc" } } },
          orderBy: { fullName: "asc" },
        }),
        prisma.school.findMany({ orderBy: { name: "asc" } }),
        prisma.facilitatorAssignment.findMany({
          include: { school: true, facilitator: true },
          orderBy: [{ status: "asc" }, { startDate: "desc" }],
        }),
      ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Facilitators" description="Assign, reassign, remove, and review ACE facilitator school coverage." />

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Assign AF to School</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={upsertAssignmentAction} className="grid gap-3 md:grid-cols-[1fr_1fr_180px_160px_auto]">
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
              Facilitator / AF
              <select name="facilitatorId" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {facilitators.map((facilitator) => (
                  <option key={facilitator.id} value={facilitator.id}>
                    {facilitator.fullName}
                  </option>
                ))}
              </select>
            </Label>
            <Label>
              Start date
              <Input name="startDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="mt-1" />
            </Label>
            <Label>
              Status
              <select name="status" defaultValue="ACTIVE" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {["ACTIVE", "PAUSED", "ENDED"].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Label>
            <div className="flex items-end">
              <Button type="submit">Assign AF</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Current and Historical Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Facilitator</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell className="font-medium">{assignment.school.name}</TableCell>
                  <TableCell>{assignment.facilitator.fullName}</TableCell>
                  <TableCell>
                    {assignment.startDate.toLocaleDateString("en-US")} -{" "}
                    {assignment.endDate ? assignment.endDate.toLocaleDateString("en-US") : "Current"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={assignment.status} />
                  </TableCell>
                  <TableCell>
                    {assignment.status === "ACTIVE" ? (
                      <form action={endAssignmentAction}>
                        <input type="hidden" name="assignmentId" value={assignment.id} />
                        <Button type="submit" variant="outline" size="sm">
                          Remove
                        </Button>
                      </form>
                    ) : (
                      <span className="text-sm text-muted-foreground">Closed</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Facilitator Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Active Schools</TableHead>
                <TableHead>Assignment History</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {facilitators.map((facilitator) => (
                <TableRow key={facilitator.id}>
                  <TableCell className="font-medium">{facilitator.fullName}</TableCell>
                  <TableCell>{facilitator.email}</TableCell>
                  <TableCell>
                    {facilitator.facilitatorAssignments
                      .filter((assignment) => assignment.status === "ACTIVE")
                      .map((assignment) => assignment.school.name)
                      .join(", ") || "None"}
                  </TableCell>
                  <TableCell>
                    {facilitator.facilitatorAssignments.map((assignment) => (
                      <div key={assignment.id} className="text-xs text-muted-foreground">
                        {assignment.school.name}: {dateInputValue(assignment.startDate)} - {assignment.endDate ? dateInputValue(assignment.endDate) : "Current"}
                      </div>
                    ))}
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
