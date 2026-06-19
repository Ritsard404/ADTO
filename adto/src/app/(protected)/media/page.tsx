import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";

export default async function MediaPage() {
  const uploads = await prisma.mediaUpload.findMany({
    include: { school: true, uploadedBy: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Media Uploads" description="Browse uploaded session photos, student outputs, documents, and evidence files." />
    <Card className="adto-card">
      <CardHeader>
        <CardTitle>Media</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Uploaded By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uploads.map((upload) => (
              <TableRow key={upload.id}>
                <TableCell className="font-medium">{upload.fileName}</TableCell>
                <TableCell>{upload.school.name}</TableCell>
                <TableCell>{upload.uploadedBy.fullName}</TableCell>
              </TableRow>
            ))}
            {!uploads.length ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No media uploaded yet.
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
