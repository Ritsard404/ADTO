import { Images } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createEvidenceLinkAction } from "@/features/facilitator/actions/adms-workflow";
import { getFacilitatorWorkspace } from "@/features/facilitator/services/facilitator-workspace.service";
import { requireActiveProfile } from "@/lib/auth";

export default async function FacilitatorEvidencePage() {
  const profile = await requireActiveProfile();
  const { schools, sessions, projects, evidence } = await getFacilitatorWorkspace(profile);

  return (
    <div className="space-y-6">
      <PageHeader title="Evidence Repository" description="Review session documentation, project files, attendance, teacher consultation evidence, and school activity uploads." />
      <Card className="adto-card">
        <CardHeader className="flex flex-row items-center gap-3">
          <Images className="size-5 text-ace-blue" />
          <CardTitle>Add Evidence Link</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createEvidenceLinkAction} className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Label>
              School
              <select name="schoolId" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
              </select>
            </Label>
            <Label>
              Session
              <select name="sessionId" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">School-level evidence</option>
                {sessions.map((session) => <option key={session.id} value={session.id}>{session.school.name} - {session.gradeLevel} {session.section}</option>)}
              </select>
            </Label>
            <Label>
              Project
              <select name="projectId" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">No project link</option>
                {projects.map((project) => <option key={project.id} value={project.id}>{project.school.name} - {project.title}</option>)}
              </select>
            </Label>
            <Label>
              Evidence type
              <select name="fileType" defaultValue="Drive link" className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {["Drive link", "Session evidence", "Project file", "Attendance image", "Consultation notes", "School activity"].map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </Label>
            <Label className="xl:col-span-2">
              Name
              <Input name="fileName" className="mt-1" placeholder="Grade 7 robotics activity photos" />
            </Label>
            <Label className="xl:col-span-2">
              Link
              <Input name="fileUrl" type="url" className="mt-1" placeholder="https://drive.google.com/..." />
            </Label>
            <Label className="md:col-span-2 xl:col-span-4">
              Description
              <Textarea name="description" className="mt-1 min-h-20" placeholder="What this evidence supports" />
            </Label>
            <Button type="submit" className="w-fit">Add evidence</Button>
          </form>
        </CardContent>
      </Card>
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
                <TableHead>Project</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evidence.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell className="font-medium"><a href={upload.fileUrl} target="_blank" rel="noreferrer" className="text-ace-blue">{upload.fileName}</a></TableCell>
                  <TableCell>{upload.school.name}</TableCell>
                  <TableCell>{upload.session ? `${upload.session.gradeLevel} ${upload.session.section}` : "School level"}</TableCell>
                  <TableCell>{upload.project?.title ?? "No project"}</TableCell>
                  <TableCell>{upload.fileType}</TableCell>
                  <TableCell>{upload.uploadedBy.fullName}</TableCell>
                  <TableCell>{upload.createdAt.toLocaleDateString("en-US")}</TableCell>
                </TableRow>
              ))}
              {!evidence.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">No evidence uploaded yet.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
