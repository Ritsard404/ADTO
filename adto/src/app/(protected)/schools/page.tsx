import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateSchoolAction } from "@/lib/actions/admin";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const query = params.q?.trim();
  const status = params.status && params.status !== "ALL" ? params.status : undefined;
  const schools = await prisma.school.findMany({
    where: {
      status: status ? (status as "ACTIVE" | "INACTIVE" | "ARCHIVED") : undefined,
      OR: query
        ? [
            { name: { contains: query, mode: "insensitive" } },
            { address: { contains: query, mode: "insensitive" } },
            { contactPerson: { contains: query, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: {
      assignments: {
        where: { status: "ACTIVE" },
        include: { facilitator: true },
      },
      projects: { select: { id: true } },
      inventoryItems: { select: { id: true, condition: true, remarks: true } },
      reports: { select: { id: true } },
      sessions: { select: { id: true, status: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Schools" description="Manage school records, assigned AF visibility, and related non-session ADMS data." />

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Search and Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <Input name="q" defaultValue={query ?? ""} placeholder="Search by school, location, or contact" />
            <select name="status" defaultValue={status ?? "ALL"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {["ALL", "ACTIVE", "INACTIVE", "ARCHIVED"].map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <Button type="submit">Apply</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>School Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {schools.map((school) => {
            const activeAf = school.assignments.map((assignment) => assignment.facilitator.fullName).join(", ") || "Unassigned";
            const inventoryReview = school.inventoryItems.filter(
              (item) => !item.remarks || item.condition === "FAIR" || item.condition === "NEEDS_REPLACEMENT",
            ).length;

            return (
              <form key={school.id} action={updateSchoolAction} className="grid gap-3 rounded-lg border bg-card p-4 xl:grid-cols-6">
                <input type="hidden" name="schoolId" value={school.id} />
                <Label className="xl:col-span-2">
                  School
                  <Input name="name" defaultValue={school.name} className="mt-1" />
                </Label>
                <Label className="xl:col-span-2">
                  Address
                  <Input name="address" defaultValue={school.address} className="mt-1" />
                </Label>
                <Label>
                  School year
                  <Input name="schoolYear" defaultValue={school.schoolYear} className="mt-1" />
                </Label>
                <Label>
                  Status
                  <select name="status" defaultValue={school.status} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {["ACTIVE", "INACTIVE", "ARCHIVED"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Label>
                <Label>
                  Contact
                  <Input name="contactPerson" defaultValue={school.contactPerson} className="mt-1" />
                </Label>
                <Label>
                  Contact email
                  <Input name="contactEmail" defaultValue={school.contactEmail ?? ""} className="mt-1" />
                </Label>
                <div className="xl:col-span-3">
                  <p className="text-sm font-medium">Assigned AF</p>
                  <p className="mt-2 text-sm text-muted-foreground">{activeAf}</p>
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm xl:col-span-4">
                  <span>Sessions: {school.sessions.length}</span>
                  <span>Projects: {school.projects.length}</span>
                  <span>Inventory review: {inventoryReview}</span>
                  <span>Reports: {school.reports.length}</span>
                </div>
                <div className="flex items-end justify-between gap-3 xl:col-span-2">
                  <StatusBadge status={school.status} />
                  <Button type="submit">Save school</Button>
                </div>
              </form>
            );
          })}
        </CardContent>
      </Card>

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Read-only Session Visibility</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell>{school.sessions.length}</TableCell>
                  <TableCell>{school.sessions.filter((session) => session.status === "COMPLETED").length}</TableCell>
                  <TableCell>{school.sessions.filter((session) => session.status !== "COMPLETED").length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
