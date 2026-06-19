import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

export default async function SessionsPage() {
  const sessions = await prisma.aCESession.findMany({
    include: { school: true, facilitator: true },
    orderBy: { scheduledDate: "asc" },
  });

  return (
    <Card>
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
                  <Badge variant="secondary">{session.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
