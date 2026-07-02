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

function formatSheetSummary(value: string | null) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Record<
      string,
      { rowsRead?: number; rowsImported?: number; rowsSkipped?: number; rowsCreated?: number; rowsUpdated?: number }
    >;
    return Object.entries(parsed)
      .map(([sheet, counts]) =>
        counts.rowsCreated != null || counts.rowsUpdated != null
          ? `${sheet}: ${counts.rowsCreated ?? 0} created / ${counts.rowsUpdated ?? 0} updated / ${counts.rowsSkipped ?? 0} skipped`
          : `${sheet}: ${counts.rowsImported ?? 0} imported / ${counts.rowsSkipped ?? 0} skipped / ${counts.rowsRead ?? 0} read`,
      )
      .join(" | ");
  } catch {
    return null;
  }
}

export default async function ImportsPage() {
  await requireRole(["ADMIN"]);

  const [facilitators, importedSessions, importedProjects, importedInventory, importBatchCount, recentSessions, recentBatches] = await Promise.all([
    prisma.profile.findMany({ where: { role: "FACILITATOR", status: "ACTIVE" }, select: { email: true, fullName: true }, orderBy: { fullName: "asc" } }),
    prisma.aCESession.count({ where: { sourceWorkbookFile: { not: null } } }),
    prisma.aCEProject.count({ where: { sourceWorkbookFile: { not: null } } }),
    prisma.inventoryItem.count({ where: { sourceWorkbookFile: { not: null } } }),
    prisma.workbookImportBatch.count(),
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
    prisma.workbookImportBatch.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
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

      <section className="grid gap-3 md:grid-cols-4">
        <ImportMetric title="Imported Sessions" value={importedSessions} icon={CalendarDays} />
        <ImportMetric title="Imported Projects" value={importedProjects} icon={FolderKanban} />
        <ImportMetric title="Imported Inventory" value={importedInventory} icon={Boxes} />
        <ImportMetric title="Import Batches" value={importBatchCount} icon={FileSpreadsheet} />
      </section>

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Recent Import Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workbook</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Checksum</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentBatches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.fileName}</TableCell>
                  <TableCell>{batch.status}</TableCell>
                  <TableCell>{batch.schoolName ?? "Pending"}</TableCell>
                  <TableCell>
                    <p>{batch.rowsImported} imported / {batch.rowsSkipped} skipped / {batch.rowsRead} read</p>
                    {formatSheetSummary(batch.sheetSummary) ? (
                      <p className="text-xs text-muted-foreground">{formatSheetSummary(batch.sheetSummary)}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>{batch.checksum.slice(0, 16)}</TableCell>
                  <TableCell>{batch.createdAt.toLocaleString("en-US")}</TableCell>
                </TableRow>
              ))}
              {!recentBatches.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">No workbook import batches have been recorded yet.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
