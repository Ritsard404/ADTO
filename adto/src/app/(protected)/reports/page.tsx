import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    include: { school: true, facilitator: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Review submitted ACE reports, year-end summaries, and implementation documentation." />
    <Card className="adto-card">
      <CardHeader>
        <CardTitle>Reports</CardTitle>
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
                  No reports yet.
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
