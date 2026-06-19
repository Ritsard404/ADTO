import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

export default async function SessionsPage() {
  const sessions = await prisma.aCESession.findMany({
    include: { school: true, facilitator: true },
    orderBy: { scheduledDate: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="ACE Sessions" description="Track scheduled ACE sessions by school, facilitator, grade level, and implementation status." />
    <Card className="adto-card">
      <CardHeader>
        <CardTitle>ACE Sessions</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Facilitator</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="font-medium">{session.title}</TableCell>
                <TableCell>{session.school.name}</TableCell>
                <TableCell>{session.facilitator.fullName}</TableCell>
                <TableCell>
                  <StatusBadge status={session.status} />
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
