import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { upsertProjectAction } from "@/features/facilitator/actions/adms-workflow";
import { getFacilitatorWorkspace } from "@/features/facilitator/services/facilitator-workspace.service";
import { requireActiveProfile } from "@/lib/auth";

export default async function FacilitatorProjectsPage() {
  const profile = await requireActiveProfile();
  const { projects, metrics } = await getFacilitatorWorkspace(profile);

  return (
    <div className="space-y-6">
      <PageHeader title="Project Monitoring" description="Verify student-created computational artifacts, project completion, teacher support, and documentation links." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="adto-card"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Projects</p><p className="text-3xl font-bold">{projects.length}</p></CardContent></Card>
        <Card className="adto-card"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Completion rate</p><p className="text-3xl font-bold">{metrics.projectCompletionRate}%</p></CardContent></Card>
        <Card className="adto-card"><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Artifact types</p><p className="text-3xl font-bold">{new Set(projects.map((project) => project.projectType).filter(Boolean)).size}</p></CardContent></Card>
      </div>
      <Card className="adto-card">
        <CardHeader className="flex flex-row items-center gap-3">
          <ClipboardList className="size-5 text-ace-blue" />
          <CardTitle>Project Register</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {projects.map((project) => (
            <form key={project.id} action={upsertProjectAction} className="grid gap-3 rounded-lg border p-3 lg:grid-cols-6">
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="schoolId" value={project.school.id} />
              <Label className="lg:col-span-2">
                Project title
                <Input name="title" defaultValue={project.title} className="mt-1" />
              </Label>
              <Label>
                Term
                <Input name="term" defaultValue={project.term ?? ""} className="mt-1" />
              </Label>
              <Label>
                Grade
                <Input name="gradeLevel" defaultValue={project.gradeLevel ?? ""} className="mt-1" />
              </Label>
              <Label>
                Section
                <Input name="section" defaultValue={project.section ?? ""} className="mt-1" />
              </Label>
              <Label>
                Status
                <select name="status" defaultValue={project.status} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "CHECKED", "NEEDS_REVISION", "COMPLETED"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
                </select>
              </Label>
              <Label>
                Students involved
                <Input name="students" defaultValue={project.students ?? ""} className="mt-1" />
              </Label>
              <Label>
                Teacher
                <Input name="teacher" defaultValue={project.teacher ?? ""} className="mt-1" />
              </Label>
              <Label>
                Type
                <Input name="projectType" defaultValue={project.projectType ?? ""} className="mt-1" />
              </Label>
              <Label>
                Submitted
                <Input name="submittedAt" type="date" defaultValue={project.submittedAt?.toISOString().slice(0, 10) ?? ""} className="mt-1" />
              </Label>
              <div className="flex items-end"><StatusBadge status={project.status} /></div>
              <Label className="lg:col-span-3">
                Description
                <Textarea name="description" defaultValue={project.description ?? ""} className="mt-1 min-h-20" />
              </Label>
              <Label className="lg:col-span-3">
                Remarks
                <Textarea name="remarks" defaultValue={project.remarks ?? ""} className="mt-1 min-h-20" />
              </Label>
              <Label className="lg:col-span-5">
                Documentation link
                <Input name="projectUrl" defaultValue={project.projectUrl ?? ""} className="mt-1" />
                {project.projectUrl ? <a href={project.projectUrl} className="mt-1 block text-xs font-semibold text-ace-blue" target="_blank" rel="noreferrer">Open project link</a> : null}
              </Label>
              <div className="flex items-end"><Button type="submit">Update</Button></div>
            </form>
          ))}
          {!projects.length ? <p className="text-sm text-muted-foreground">No projects have been recorded for assigned schools yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}
