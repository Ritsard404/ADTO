import { Boxes, CalendarDays, FileSpreadsheet, FolderKanban } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { previewWorkbookImportAction, runWorkbookImportAction } from "@/features/admin/actions/admin";
import { WorkbookImportWizard } from "@/features/admin/components/workbook-import-wizard";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function ImportMetric({ title, value, icon: Icon }: { title: string; value: number; icon: typeof FileSpreadsheet }) {
  return (
    <Card className="adto-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default async function ImportsPage() {
  await requireRole(["ADMIN"]);

  const [facilitators, importedSessions, importedProjects, importedInventory, recentSessions] = await Promise.all([
    prisma.profile.findMany({ where: { role: "FACILITATOR", status: "ACTIVE" }, select: { email: true, fullName: true }, orderBy: { fullName: "asc" } }),
    prisma.aCESession.count({ where: { sourceWorkbookFile: { not: null } } }),
    prisma.aCEProject.count({ where: { sourceWorkbookFile: { not: null } } }),
    prisma.inventoryItem.count({ where: { sourceWorkbookFile: { not: null } } }),
    prisma.aCESession.findMany({
      where: { importedAt: { not: null } },
      orderBy: { importedAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        gradeLevel: true,
        section: true,
        scheduledDate: true,
        sourceWorkbookFile: true,
        importedAt: true,
        school: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="ADMS Import" description="Upload ADMS workbooks and store workbook rows in ADTO." />

      <WorkbookImportWizard
        facilitators={facilitators}
        previewAction={previewWorkbookImportAction}
        importAction={runWorkbookImportAction}
      />

      <section className="grid gap-3 md:grid-cols-3">
        <ImportMetric title="Imported Sessions" value={importedSessions} icon={CalendarDays} />
        <ImportMetric title="Imported Projects" value={importedProjects} icon={FolderKanban} />
        <ImportMetric title="Imported Inventory" value={importedInventory} icon={Boxes} />
      </section>

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Recent Workbook Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Workbook</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.school.name}</TableCell>
                  <TableCell>{session.scheduledDate.toLocaleDateString("en-US")}</TableCell>
                  <TableCell>{session.gradeLevel} {session.section}</TableCell>
                  <TableCell>{session.title}</TableCell>
                  <TableCell>{session.sourceWorkbookFile ?? "Workbook"}</TableCell>
                </TableRow>
              ))}
              {!recentSessions.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">No workbook sessions imported yet.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
