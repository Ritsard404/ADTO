import { Images } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFacilitatorWorkspace } from "@/features/facilitator/services/facilitator-workspace.service";
import { requireActiveProfile } from "@/lib/auth";

export default async function FacilitatorEvidencePage() {
  const profile = await requireActiveProfile();
  const { evidence } = await getFacilitatorWorkspace(profile);

  return (
    <div className="space-y-6">
      <PageHeader title="Evidence Repository" description="Review session documentation, project files, attendance, teacher consultation evidence, and school activity uploads." />
      <Card className="adto-card">
        <CardHeader className="flex flex-row items-center gap-3">
          <Images className="size-5 text-ace-orange" />
          <CardTitle>Uploaded Evidence</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evidence.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell className="font-medium">{upload.fileName}</TableCell>
                  <TableCell>{upload.school.name}</TableCell>
                  <TableCell>{upload.session ? `${upload.session.gradeLevel} ${upload.session.section}` : "School level"}</TableCell>
                  <TableCell>{upload.uploadedBy.fullName}</TableCell>
                  <TableCell>{upload.createdAt.toLocaleDateString("en-US")}</TableCell>
                </TableRow>
              ))}
              {!evidence.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">No evidence uploaded yet.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
