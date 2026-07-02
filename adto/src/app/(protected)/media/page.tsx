import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bulkCreateEvidenceLinksAction, updateEvidenceReviewStatusAction } from "@/features/facilitator/actions/adms-workflow";
import { EvidenceLinkImporter } from "@/features/facilitator/components/evidence-link-importer";
import { getAccessibleSchoolIds } from "@/features/facilitator/services/adms-workflow.service";
import { resolveStorageUrl } from "@/features/media/services/private-storage.service";
import { requireActiveProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatBytes(value: number | null) {
  if (!value) return "External";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}

export default async function MediaPage() {
  const profile = await requireActiveProfile();
  const schoolIds = await getAccessibleSchoolIds(profile);
  const schoolWhere = schoolIds ? { id: { in: schoolIds } } : {};
  const childWhere = schoolIds ? { schoolId: { in: schoolIds } } : {};
  const [uploads, schools, projects] = await Promise.all([
    prisma.mediaUpload.findMany({
      where: childWhere,
      include: { school: true, uploadedBy: true, session: true, project: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.school.findMany({ where: schoolWhere, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.aCEProject.findMany({
      where: childWhere,
      include: { school: true, media: true },
      orderBy: [{ updatedAt: "desc" }],
      take: 100,
    }),
  ]);
  const uploadsWithUrls = await Promise.all(
    uploads.map(async (upload) => ({
      ...upload,
      downloadUrl: await resolveStorageUrl(upload.fileUrl),
    })),
  );
  const missingProjectLinks = projects.filter((project) => !project.projectUrl);
  const missingProjectMedia = projects.filter((project) => !project.media.length);

  return (
    <div className="space-y-6">
      <PageHeader title="Media Uploads" description="Browse uploaded session photos, student outputs, documents, and evidence files." />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="adto-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Evidence links</p>
            <p className="text-3xl font-bold">{uploadsWithUrls.length}</p>
          </CardContent>
        </Card>
        <Card className="adto-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Projects missing links</p>
            <p className="text-3xl font-bold">{missingProjectLinks.length}</p>
          </CardContent>
        </Card>
        <Card className="adto-card">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Projects missing media</p>
            <p className="text-3xl font-bold">{missingProjectMedia.length}</p>
          </CardContent>
        </Card>
      </div>

      {profile.role !== "SCHOOL_ADMIN" ? (
        <EvidenceLinkImporter schools={schools} action={bulkCreateEvidenceLinksAction} />
      ) : null}

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Project Evidence Review</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Link</TableHead>
                <TableHead>Media</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.slice(0, 30).map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.title}</TableCell>
                  <TableCell>{project.school.name}</TableCell>
                  <TableCell><StatusBadge status={project.status} /></TableCell>
                  <TableCell>{project.projectUrl ? <a href={project.projectUrl} className="text-ace-blue underline">Open</a> : "Missing"}</TableCell>
                  <TableCell>{project.media.length}</TableCell>
                </TableRow>
              ))}
              {!projects.length ? <TableRow><TableCell colSpan={5} className="text-muted-foreground">No projects to review.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Evidence Files</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Linked To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Uploaded By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploadsWithUrls.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell className="font-medium"><a href={upload.downloadUrl} target="_blank" rel="noreferrer" className="text-ace-blue underline">{upload.fileName}</a></TableCell>
                  <TableCell>{upload.school.name}</TableCell>
                  <TableCell>{upload.project?.title ?? (upload.session ? `${upload.session.gradeLevel} ${upload.session.section}` : "School")}</TableCell>
                  <TableCell>
                    {profile.role === "ADMIN" ? (
                      <form action={updateEvidenceReviewStatusAction} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="mediaUploadId" value={upload.id} />
                        <select
                          name="reviewStatus"
                          defaultValue={upload.reviewStatus}
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="ACCEPTED">Accepted</option>
                          <option value="NEEDS_REPLACEMENT">Needs replacement</option>
                          <option value="REJECTED">Rejected</option>
                        </select>
                        <Button type="submit" variant="outline" size="sm">Save</Button>
                      </form>
                    ) : (
                      `${formatStatus(upload.reviewStatus)} / ${formatStatus(upload.uploadStatus)}`
                    )}
                  </TableCell>
                  <TableCell>{[upload.gradeLevelTag, upload.sectionTag, upload.teacherTag, upload.reportPeriod].filter(Boolean).join(" | ") || "School level"}</TableCell>
                  <TableCell>{formatStatus(upload.originalSource)} - {formatBytes(upload.fileSizeBytes)}</TableCell>
                  <TableCell>{upload.uploadedBy.fullName}</TableCell>
                </TableRow>
              ))}
              {!uploadsWithUrls.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">No media uploaded yet.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
