import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

export default async function ReportsPage() {
  const reports = await prisma.report.findMany({
    include: { school: true, facilitator: true },
    orderBy: { title: "asc" },
  });

  return (
    <Card>
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
                  <Badge>{report.status}</Badge>
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
  );
}
