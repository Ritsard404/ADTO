import { ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Teacher</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.title}</TableCell>
                  <TableCell>{project.school.name}</TableCell>
                  <TableCell>{project.section ?? project.gradeLevel ?? "Not set"}</TableCell>
                  <TableCell>{project.teacher ?? "Not set"}</TableCell>
                  <TableCell>{project.projectType ?? "Not set"}</TableCell>
                  <TableCell><StatusBadge status={project.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
