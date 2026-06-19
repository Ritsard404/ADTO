import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  bulkCreateSectionsAction,
  createSchoolRemarkAction,
  createSchoolYearAction,
  createTeacherAction,
  createTeacherAssignmentAction,
  updateSchoolAction,
} from "@/lib/actions/admin";
import {
  createFacilitatorSchoolRemarkAction,
  createFacilitatorTeacherAction,
  upsertFacilitatorSectionAction,
} from "@/lib/actions/adms-workflow";
import { requireActiveProfile } from "@/lib/auth";
import { getAccessibleSchoolIds } from "@/lib/services/adms-workflow.service";
import { getSchoolsPortalReadModel } from "@/lib/services/mockable-adms-read.service";

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const profile = await requireActiveProfile();
  const params = await searchParams;
  const query = params.q?.trim();
  const status = params.status && params.status !== "ALL" ? params.status : undefined;
  const schoolIds = await getAccessibleSchoolIds(profile);
  const { schools, teachers, sections } = await getSchoolsPortalReadModel(schoolIds, query, status);
  const canManageCoreSchool = profile.role === "ADMIN";
  const sectionAction = canManageCoreSchool ? bulkCreateSectionsAction : upsertFacilitatorSectionAction;
  const teacherAction = canManageCoreSchool ? createTeacherAction : createFacilitatorTeacherAction;
  const remarkAction = canManageCoreSchool ? createSchoolRemarkAction : createFacilitatorSchoolRemarkAction;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schools"
        description={
          canManageCoreSchool
            ? "Manage school records, assigned AF visibility, and related non-session ADMS data."
            : "View assigned schools, maintain implementation details, update sections, teachers, student counts, and school remarks."
        }
      />

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Search and Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <Input name="q" defaultValue={query ?? ""} placeholder="Search by school, location, or contact" />
            <select name="status" defaultValue={status ?? "ALL"} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {["ALL", "ACTIVE", "INACTIVE", "ARCHIVED"].map((option) => (
                <option key={option} value={option}>
                  {option.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <Button type="submit">Apply</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>School Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {schools.map((school) => {
            const activeAf = school.assignments.map((assignment) => assignment.facilitator.fullName).join(", ") || "Unassigned";
            const inventoryReview = school.inventoryItems.filter(
              (item) => !item.remarks || item.condition === "FAIR" || item.condition === "NEEDS_REPLACEMENT",
            ).length;

            return (
              <form key={school.id} action={updateSchoolAction} className="grid gap-3 rounded-lg border bg-card p-4 xl:grid-cols-6">
                <input type="hidden" name="schoolId" value={school.id} />
                <Label className="xl:col-span-2">
                  School
                  <Input name="name" defaultValue={school.name} className="mt-1" readOnly={!canManageCoreSchool} />
                </Label>
                <Label className="xl:col-span-2">
                  Address
                  <Input name="address" defaultValue={school.address} className="mt-1" readOnly={!canManageCoreSchool} />
                </Label>
                <Label>
                  School year
                  <Input name="schoolYear" defaultValue={school.schoolYear} className="mt-1" />
                </Label>
                <Label>
                  Status
                  <select name="status" defaultValue={school.status} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {["ACTIVE", "INACTIVE", "ARCHIVED"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </Label>
                <Label>
                  Contact
                  <Input name="contactPerson" defaultValue={school.contactPerson} className="mt-1" />
                </Label>
                <Label>
                  Contact email
                  <Input name="contactEmail" defaultValue={school.contactEmail ?? ""} className="mt-1" />
                </Label>
                <Label>
                  Contact number
                  <Input name="contactNumber" defaultValue={"contactNumber" in school ? (school.contactNumber ?? "") : ""} className="mt-1" />
                </Label>
                <Label>
                  School code
                  <Input name="schoolCode" defaultValue={"schoolCode" in school ? (school.schoolCode ?? "") : ""} className="mt-1" />
                </Label>
                <Label>
                  Region
                  <Input name="region" defaultValue={"region" in school ? (school.region ?? "") : ""} className="mt-1" />
                </Label>
                <Label>
                  Division
                  <Input name="division" defaultValue={"division" in school ? (school.division ?? "") : ""} className="mt-1" />
                </Label>
                <Label>
                  School type
                  <Input name="schoolType" defaultValue={"schoolType" in school ? (school.schoolType ?? "") : ""} className="mt-1" />
                </Label>
                <Label>
                  Adoption year
                  <Input name="adoptionYear" defaultValue={"adoptionYear" in school ? (school.adoptionYear ?? "") : ""} className="mt-1" />
                </Label>
                <Label>
                  Implementation year
                  <Input name="implementationYear" defaultValue={"implementationYear" in school ? (school.implementationYear ?? "") : ""} className="mt-1" />
                </Label>
                <Label>
                  Adoption type
                  <select name="adoptionType" defaultValue={"adoptionType" in school ? (school.adoptionType ?? "") : ""} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {["", "Software-based / Creative Coding", "Hardware-based / Physical Computing", "Creative Coding + Physical Computing"].map((option) => (
                      <option key={option} value={option}>{option || "Not set"}</option>
                    ))}
                  </select>
                </Label>
                <Label>
                  Schedule arrangement
                  <select name="scheduleArrangement" defaultValue={"scheduleArrangement" in school ? (school.scheduleArrangement ?? "") : ""} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {["", "Fixed Schedule", "Scheduled by Subject Areas", "Fixed Schedule and Integrated"].map((option) => (
                      <option key={option} value={option}>{option || "Not set"}</option>
                    ))}
                  </select>
                </Label>
                <Label>
                  Coding modality
                  <Input name="codingModality" defaultValue={"codingModality" in school ? (school.codingModality ?? "") : ""} className="mt-1" />
                </Label>
                <Label className="xl:col-span-3">
                  Hardware allocation
                  <Textarea name="hardwareAllocation" defaultValue={"hardwareAllocation" in school ? (school.hardwareAllocation ?? "") : ""} className="mt-1 min-h-20" />
                </Label>
                <Label className="xl:col-span-3">
                  Software allocation
                  <Textarea name="softwareAllocation" defaultValue={"softwareAllocation" in school ? (school.softwareAllocation ?? "") : ""} className="mt-1 min-h-20" />
                </Label>
                <div className="xl:col-span-3">
                  <p className="text-sm font-medium">Assigned AF</p>
                  <p className="mt-2 text-sm text-muted-foreground">{activeAf}</p>
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm xl:col-span-4">
                  <span>Sessions: {school.sessions.length}</span>
                  <span>Projects: {school.projects.length}</span>
                  <span>Inventory review: {inventoryReview}</span>
                  <span>Reports: {school.reports.length}</span>
                </div>
                <div className="flex items-end justify-between gap-3 xl:col-span-2">
                  <StatusBadge status={school.status} />
                  {canManageCoreSchool ? <Button type="submit">Save school</Button> : null}
                </div>
              </form>
            );
          })}
        </CardContent>
      </Card>

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Implementation Planning Controls</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 xl:grid-cols-2">
          {canManageCoreSchool ? <form action={createSchoolYearAction} className="grid gap-3 rounded-lg border p-4">
            <h3 className="font-semibold">Create / Update School Year</h3>
            <select name="schoolId" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
            <Input name="label" placeholder="SY 2026-2027" />
            <div className="grid gap-3 sm:grid-cols-3">
              <Input name="startDate" type="date" />
              <Input name="endDate" type="date" />
              <select name="status" defaultValue="OPEN" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                {["OPEN", "CLOSED", "ARCHIVED"].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <Button type="submit">Save school year</Button>
          </form> : null}

          <form action={sectionAction} className="grid gap-3 rounded-lg border p-4">
            <h3 className="font-semibold">{canManageCoreSchool ? "Bulk Import Sections" : "Add / Update Section"}</h3>
            <select name="schoolId" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="schoolYear" placeholder="2025 - 2026" />
              <Input name="gradeLevel" placeholder="Grade 7" />
            </div>
            {canManageCoreSchool ? (
              <Textarea name="sections" className="min-h-28" placeholder={"St. Francis, Adviser Name, 20, 18\nSt. Dominic, Adviser Name, 19, 21"} />
            ) : (
              <>
                <Input name="sectionName" placeholder="Section name" />
                <Input name="adviserName" placeholder="Adviser" />
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input name="maleStudents" type="number" min="0" defaultValue="0" />
                  <Input name="femaleStudents" type="number" min="0" defaultValue="0" />
                  <select name="isActive" defaultValue="true" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </>
            )}
            <Button type="submit">{canManageCoreSchool ? "Import sections" : "Save section"}</Button>
          </form>

          <form action={teacherAction} className="grid gap-3 rounded-lg border p-4">
            <h3 className="font-semibold">Teacher Profile</h3>
            {!canManageCoreSchool ? (
              <select name="schoolId" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
              </select>
            ) : null}
            <Input name="fullName" placeholder="Full name" />
            <Input name="department" placeholder="Department" />
            <Input name="email" type="email" placeholder="Email" />
            <Input name="contactNumber" placeholder="Contact number" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="position" placeholder="Position" />
              <Input name="employmentStatus" placeholder="Employment status" />
            </div>
            {!canManageCoreSchool ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <Input name="schoolYear" placeholder="2025 - 2026" />
                <Input name="gradeLevel" placeholder="Grade 7" />
                <Input name="subject" placeholder="Science" />
              </div>
            ) : null}
            <Button type="submit">Add teacher</Button>
          </form>

          {canManageCoreSchool ? <form action={createTeacherAssignmentAction} className="grid gap-3 rounded-lg border p-4">
            <h3 className="font-semibold">Teacher Assignment</h3>
            <select name="teacherId" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>)}
            </select>
            <select name="schoolId" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
            <select name="sectionId" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">No section</option>
              {sections.map((section) => <option key={section.id} value={section.id}>{section.gradeLevel} - {section.sectionName}</option>)}
            </select>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input name="schoolYear" placeholder="2025 - 2026" />
              <Input name="gradeLevel" placeholder="Grade 7" />
              <Input name="subject" placeholder="Science" />
            </div>
            <Button type="submit">Assign teacher</Button>
          </form> : null}

          <form action={remarkAction} className="grid gap-3 rounded-lg border p-4 xl:col-span-2">
            <h3 className="font-semibold">School Monitoring Remarks</h3>
            <select name="schoolId" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
            <div className="grid gap-3 md:grid-cols-4">
              <Input name="schoolYear" placeholder="2025 - 2026" />
              <Input name="period" placeholder="Quarter 1" />
              <Input name="remarkType" placeholder="Monthly Remarks" />
              <Input name="title" placeholder="Schedule conflicts" />
            </div>
            <Textarea name="details" placeholder="Observation details" />
            <Textarea name="actionItems" placeholder="Action items" />
            <Button type="submit">Add remark</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="adto-card">
        <CardHeader>
          <CardTitle>Read-only Session Visibility</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((school) => (
                <TableRow key={school.id}>
                  <TableCell className="font-medium">{school.name}</TableCell>
                  <TableCell>{school.sessions.length}</TableCell>
                  <TableCell>{school.sessions.filter((session) => session.status === "COMPLETED").length}</TableCell>
                  <TableCell>{school.sessions.filter((session) => session.status !== "COMPLETED").length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
