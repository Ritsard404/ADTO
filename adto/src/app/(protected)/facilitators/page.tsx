import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

export default async function FacilitatorsPage() {
  const facilitators = await prisma.profile.findMany({
    where: { role: "FACILITATOR" },
    include: { facilitatorAssignments: { include: { school: true } } },
    orderBy: { fullName: "asc" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facilitators</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Assignments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {facilitators.map((facilitator) => (
              <TableRow key={facilitator.id}>
                <TableCell className="font-medium">{facilitator.fullName}</TableCell>
                <TableCell>{facilitator.email}</TableCell>
                <TableCell>{facilitator.facilitatorAssignments.map((assignment) => assignment.school.name).join(", ") || "None"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
