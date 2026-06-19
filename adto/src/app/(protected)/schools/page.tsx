import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

export default async function SchoolsPage() {
  const schools = await prisma.school.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <PageHeader title="Schools" description="Manage school records, school year coverage, contact points, and ACE implementation status." />
    <Card className="adto-card">
      <CardHeader>
        <CardTitle>Schools</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>School Year</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schools.map((school) => (
              <TableRow key={school.id}>
                <TableCell className="font-medium">{school.name}</TableCell>
                <TableCell>{school.contactPerson}</TableCell>
                <TableCell>{school.schoolYear}</TableCell>
                <TableCell>
                  <StatusBadge status={school.status} />
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
