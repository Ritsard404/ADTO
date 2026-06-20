import PptxGenJS from "pptxgenjs";
import type { UserRole } from "@/generated/prisma/enums";
import { withMockRelations } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";

const ACE = {
  blue: "1155CC",
  darkBlue: "1C4587",
  orange: "FF9900",
  orange2: "ED7D31",
  paleBlue: "C9DAF8",
  paleOrange: "FCE5CD",
  text: "434343",
  white: "FFFFFF",
};

export type ReportType = "dashboard" | "mid-year" | "year-end";

type ProfileLike = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
};

export async function getAccessibleReportSchools(profile: ProfileLike) {
  if (isMockDataMode()) {
    const mock = withMockRelations();
    if (profile.role === "ADMIN") return mock.schools;
    if (profile.role === "SCHOOL_ADMIN") return mock.schools.filter((school) => school.contactEmail?.toLowerCase() === profile.email.toLowerCase());
    if (profile.role === "FACILITATOR") {
      return mock.schools.filter((school) => school.assignments.some((assignment) => assignment.facilitatorId === profile.id && assignment.status === "ACTIVE"));
    }
    return [];
  }

  if (profile.role === "ADMIN") {
    return prisma.school.findMany({ orderBy: { name: "asc" } });
  }

  if (profile.role === "SCHOOL_ADMIN") {
    const memberships = await prisma.schoolMembership.findMany({
      where: { profileId: profile.id, status: "ACTIVE" },
      include: { school: true },
      orderBy: { school: { name: "asc" } },
    });
    if (memberships.length) return memberships.map((membership) => membership.school);
    return prisma.school.findMany({ where: { contactEmail: { equals: profile.email, mode: "insensitive" } }, orderBy: { name: "asc" } });
  }

  if (profile.role === "FACILITATOR") {
    const assignments = await prisma.facilitatorAssignment.findMany({
      where: { facilitatorId: profile.id, status: "ACTIVE" },
      include: { school: true },
      orderBy: { startDate: "desc" },
    });
    return assignments.map((assignment) => assignment.school);
  }

  return [];
}

export async function assertCanAccessReportSchool(profile: ProfileLike, schoolId: string) {
  if (profile.role === "ADMIN") return;

  if (profile.role !== "SCHOOL_ADMIN") {
    throw new Error("Only school admins and admins can generate official school reports.");
  }

  if (isMockDataMode()) {
    const mock = withMockRelations();
    const school = mock.schools.find((item) => item.id === schoolId && item.contactEmail?.toLowerCase() === profile.email.toLowerCase());
    if (!school) {
      throw new Error("You can only access official reports for your assigned school.");
    }
    return;
  }

  const membership = await prisma.schoolMembership.findFirst({
    where: { schoolId, profileId: profile.id, status: "ACTIVE" },
    select: { id: true },
  });

  if (membership) return;

  const fallbackSchool = await prisma.school.findFirst({
    where: { id: schoolId, contactEmail: { equals: profile.email, mode: "insensitive" } },
    select: { id: true },
  });

  if (!fallbackSchool) {
    throw new Error("You can only access official reports for your assigned school.");
  }
}

function firstNumber(value: string | null | undefined) {
  const match = String(value ?? "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function uniqueCount(values: Array<string | null>) {
  return new Set(values.map((value) => (value ?? "").trim()).filter(Boolean)).size;
}

export async function buildSchoolReportPreview(schoolId: string, schoolYear: string, reportType: ReportType) {
  if (isMockDataMode()) {
    const mock = withMockRelations();
    const school = mock.schools.find((item) => item.id === schoolId);
    if (!school) throw new Error("School not found.");
    return buildPreviewFromSchool(school, schoolYear, reportType);
  }

  const school = await prisma.school.findUniqueOrThrow({
    where: { id: schoolId },
    include: {
      assignments: { include: { facilitator: true } },
      sessions: { include: { facilitator: true }, orderBy: { scheduledDate: "asc" } },
      projects: true,
      inventoryItems: true,
      reports: true,
    },
  });

  return buildPreviewFromSchool(school, schoolYear, reportType);
}

function buildPreviewFromSchool(
  school: Awaited<ReturnType<typeof prisma.school.findUniqueOrThrow>> & {
    assignments: Array<{ facilitator: { fullName: string } }>;
    sessions: Array<{
      scheduledDate: Date;
      activity: string | null;
      teacher: string | null;
      facilitator: { fullName: string };
      subject: string | null;
      delivery: string | null;
      gradeLevel: string;
    }>;
    projects: Array<{ projectType: string | null; students: string | null }>;
    inventoryItems: Array<unknown>;
    reports: Array<unknown>;
  },
  schoolYear: string,
  reportType: ReportType,
) {
  const sessions = reportType === "mid-year" ? school.sessions.filter((session) => session.scheduledDate.getMonth() <= 9) : school.sessions;
  const totalSessions = sessions.length;
  const codingHours = Math.round((sessions.length * 45) / 60);
  const activities = uniqueCount(sessions.map((session) => session.activity));
  const teachers = uniqueCount(sessions.map((session) => session.teacher));
  const assignmentHistoryFacilitators = Array.from(new Set(school.assignments.map((assignment) => assignment.facilitator.fullName).filter(Boolean)));
  const facilitators = assignmentHistoryFacilitators.length || uniqueCount(sessions.map((session) => session.facilitator.fullName));
  const subjects = uniqueCount(sessions.map((session) => session.subject));
  const modalities = uniqueCount(sessions.map((session) => session.delivery));
  const projectTypes = uniqueCount(school.projects.map((project) => project.projectType));
  const studentCoders = school.projects.reduce((sum, project) => sum + Math.max(firstNumber(project.students), 0), 0);
  const gradeCounts = sessions.reduce<Record<string, number>>((acc, session) => {
    acc[session.gradeLevel] = (acc[session.gradeLevel] ?? 0) + 1;
    return acc;
  }, {});
  const teacherCounts = sessions.reduce<Record<string, number>>((acc, session) => {
    const teacher = session.teacher || "Not encoded";
    acc[teacher] = (acc[teacher] ?? 0) + 1;
    return acc;
  }, {});
  const activityCounts = sessions.reduce<Record<string, number>>((acc, session) => {
    const activity = session.activity || "Not encoded";
    acc[activity] = (acc[activity] ?? 0) + 1;
    return acc;
  }, {});

  const mostActiveGrade = Object.entries(gradeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No sessions";
  const mostActiveTeacher = Object.entries(teacherCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No teacher data";
  const mostActiveFacilitator =
    sessions.reduce<Record<string, number>>((acc, session) => {
      acc[session.facilitator.fullName] = (acc[session.facilitator.fullName] ?? 0) + 1;
      return acc;
    }, {});

  return {
    school,
    reportType,
    schoolYear,
    templateName: "Colegio de la Immaculada Concepcion - Gorordo YearEnd Report.pptx",
    metrics: {
      totalSessions,
      codingHours,
      activities,
      artifacts: school.projects.length,
      teachers,
      studentCoders,
      facilitators,
      facilitatorsInvolved: assignmentHistoryFacilitators.join(", ") || "No assignment history",
      subjects,
      modalities,
      projectTypes,
      totalProjects: school.projects.length,
      totalInventory: school.inventoryItems.length,
      mostActiveGrade,
      mostActiveTeacher,
      mostActiveFacilitator: Object.entries(mostActiveFacilitator).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No facilitator data",
    },
    activityCounts,
    gradeCounts,
    teacherCounts,
    projectTypeCounts: school.projects.reduce<Record<string, number>>((acc, project) => {
      const type = project.projectType || "Not encoded";
      acc[type] = (acc[type] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

function addHeader(slide: PptxGenJS.Slide, title: string) {
  slide.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.28, fill: { color: ACE.orange }, line: { color: ACE.orange } });
  slide.addText(title, { x: 0.5, y: 0.48, w: 8.8, h: 0.36, fontFace: "Arial", fontSize: 17, bold: true, color: ACE.blue });
}

function addKpi(slide: PptxGenJS.Slide, label: string, value: string | number, x: number, y: number, color = ACE.blue) {
  slide.addShape("roundRect", { x, y, w: 2.85, h: 1.1, rectRadius: 0.08, fill: { color: ACE.white }, line: { color } });
  slide.addText(String(value), { x: x + 0.12, y: y + 0.16, w: 2.6, h: 0.36, fontFace: "Arial", fontSize: 22, bold: true, color });
  slide.addText(label, { x: x + 0.12, y: y + 0.62, w: 2.6, h: 0.26, fontFace: "Arial", fontSize: 8.5, color: ACE.text, fit: "shrink" });
}

function addBarList(slide: PptxGenJS.Slide, entries: [string, number][], x: number, y: number, w: number, title: string) {
  slide.addText(title, { x, y, w, h: 0.28, fontFace: "Arial", fontSize: 10, bold: true, color: ACE.darkBlue });
  const top = entries.slice(0, 7);
  const max = Math.max(...top.map(([, value]) => value), 1);
  top.forEach(([label, value], index) => {
    const rowY = y + 0.42 + index * 0.34;
    slide.addText(label, { x, y: rowY, w: w * 0.48, h: 0.22, fontFace: "Arial", fontSize: 7.5, color: ACE.text, fit: "shrink" });
    slide.addShape("rect", { x: x + w * 0.5, y: rowY + 0.03, w: (w * 0.38 * value) / max, h: 0.13, fill: { color: ACE.orange }, line: { color: ACE.orange } });
    slide.addText(String(value), { x: x + w * 0.9, y: rowY, w: 0.4, h: 0.2, fontFace: "Arial", fontSize: 7, color: ACE.text });
  });
}

export async function generateSchoolReportPptx(preview: Awaited<ReturnType<typeof buildSchoolReportPreview>>) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "ADTO";
  pptx.company = "ACE";
  pptx.subject = `${preview.reportType} report`;
  pptx.title = `${preview.school.name} ${preview.reportType} report`;

  const cover = pptx.addSlide();
  cover.background = { color: ACE.white };
  cover.addShape("rect", { x: 0, y: 0, w: 13.33, h: 0.5, fill: { color: ACE.orange }, line: { color: ACE.orange } });
  cover.addText("Aralinks Coding Education", { x: 0.75, y: 1.35, w: 7.5, h: 0.45, fontFace: "Arial", fontSize: 24, bold: true, color: ACE.blue });
  cover.addText(`${preview.reportType.replace("-", " ")} Program Integration Report`, {
    x: 0.75,
    y: 1.95,
    w: 8.5,
    h: 0.55,
    fontFace: "Arial",
    fontSize: 22,
    color: ACE.text,
  });
  cover.addText(preview.school.name, { x: 0.75, y: 2.72, w: 9, h: 0.38, fontFace: "Arial", fontSize: 16, color: ACE.darkBlue, bold: true });
  cover.addText(`Report Generation: SY ${preview.schoolYear}`, { x: 0.75, y: 3.15, w: 6, h: 0.3, fontFace: "Arial", fontSize: 12, color: ACE.text });
  cover.addShape("rect", { x: 9.5, y: 1.2, w: 2.7, h: 4.4, fill: { color: ACE.paleBlue }, line: { color: ACE.blue } });
  cover.addText("Official ACE template structure", { x: 9.72, y: 2.95, w: 2.25, h: 0.42, fontFace: "Arial", fontSize: 12, bold: true, color: ACE.blue, align: "center" });

  const overview = pptx.addSlide();
  addHeader(overview, "Schoolwide Coding Engagement - By the Numbers");
  addKpi(overview, "Coding Sessions Logged", preview.metrics.totalSessions, 0.65, 1.25);
  addKpi(overview, "Coding Hours Delivered", preview.metrics.codingHours, 3.75, 1.25, ACE.orange);
  addKpi(overview, "Activities Count", preview.metrics.activities, 6.85, 1.25);
  addKpi(overview, "Computational Artifacts Created", preview.metrics.artifacts, 9.95, 1.25, ACE.orange);
  overview.addText(`Generated from ADMS database records for ${preview.school.name}.`, {
    x: 0.7,
    y: 3.0,
    w: 11.8,
    h: 0.4,
    fontFace: "Arial",
    fontSize: 13,
    color: ACE.text,
  });

  const setup = pptx.addSlide();
  addHeader(setup, "ACE Implementation Setup");
  addKpi(setup, "Participating Teachers", preview.metrics.teachers, 0.65, 1.15);
  addKpi(setup, "Student Coders", preview.metrics.studentCoders || "Encoded by projects", 3.75, 1.15, ACE.orange);
  addKpi(setup, "Active Facilitators", preview.metrics.facilitators, 6.85, 1.15);
  addKpi(setup, "Inventory Records", preview.metrics.totalInventory, 9.95, 1.15, ACE.orange);
  setup.addText(
    `Most active grade: ${preview.metrics.mostActiveGrade}\nMost active teacher: ${preview.metrics.mostActiveTeacher}\nMost active facilitator: ${preview.metrics.mostActiveFacilitator}\nFacilitators involved: ${preview.metrics.facilitatorsInvolved}`,
    { x: 0.75, y: 3.0, w: 10.5, h: 1.1, fontFace: "Arial", fontSize: 13, color: ACE.text, breakLine: false },
  );

  const breakdown = pptx.addSlide();
  addHeader(breakdown, "Coding Session and Participation Breakdown");
  addBarList(breakdown, Object.entries(preview.gradeCounts).sort((a, b) => b[1] - a[1]), 0.75, 1.1, 5.7, "Grade Level Sessions");
  addBarList(breakdown, Object.entries(preview.teacherCounts).sort((a, b) => b[1] - a[1]), 7.0, 1.1, 5.5, "Teacher Participation");

  const activities = pptx.addSlide();
  addHeader(activities, "Activities, Subjects, Modalities, and Projects");
  addKpi(activities, "Subject Integration", preview.metrics.subjects, 0.65, 1.05);
  addKpi(activities, "Modalities", preview.metrics.modalities, 3.75, 1.05, ACE.orange);
  addKpi(activities, "Project Types", preview.metrics.projectTypes, 6.85, 1.05);
  addKpi(activities, "Total Projects", preview.metrics.totalProjects, 9.95, 1.05, ACE.orange);
  addBarList(activities, Object.entries(preview.activityCounts).sort((a, b) => b[1] - a[1]), 0.75, 2.75, 5.7, "Activities Conducted");
  addBarList(activities, Object.entries(preview.projectTypeCounts).sort((a, b) => b[1] - a[1]), 7.0, 2.75, 5.5, "Project Types");

  const closing = pptx.addSlide();
  addHeader(closing, "Report Preview and Download Notes");
  closing.addText(
    [
      { text: "This generated file follows the official ACE Year-End Report narrative order and palette derived from the local template. ", options: { breakLine: true } },
      { text: `Template reference: ${preview.templateName}`, options: { breakLine: true, bold: true, color: ACE.blue } },
      { text: "All metrics are computed from ADMS database records at generation time." },
    ],
    { x: 0.75, y: 1.35, w: 11.5, h: 1.6, fontFace: "Arial", fontSize: 15, color: ACE.text, fit: "shrink" },
  );
  closing.addShape("rect", { x: 0.75, y: 4.2, w: 11.4, h: 0.2, fill: { color: ACE.orange }, line: { color: ACE.orange } });

  const output = await pptx.write({ outputType: "nodebuffer" });
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}

export function generateSchoolReportPdf(preview: Awaited<ReturnType<typeof buildSchoolReportPreview>>) {
  const lines = [
    `${preview.school.name} ${preview.reportType} Report`,
    `School Year: ${preview.schoolYear}`,
    `Coding Sessions Logged: ${preview.metrics.totalSessions}`,
    `Coding Hours Delivered: ${preview.metrics.codingHours}`,
    `Activities Count: ${preview.metrics.activities}`,
    `Computational Artifacts Created: ${preview.metrics.artifacts}`,
    `Participating Teachers: ${preview.metrics.teachers}`,
    `Student Coders: ${preview.metrics.studentCoders}`,
    `Active Facilitators: ${preview.metrics.facilitators}`,
    `Facilitators Involved: ${preview.metrics.facilitatorsInvolved}`,
    `Most Active Grade: ${preview.metrics.mostActiveGrade}`,
    `Most Active Teacher: ${preview.metrics.mostActiveTeacher}`,
  ];
  const stream = `BT /F1 14 Tf 50 760 Td ${lines.map((line) => `(${line.replace(/[()\\]/g, "")}) Tj 0 -26 Td`).join(" ")} ET`;
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
  ];
  const body = objects.join("\n");
  return Buffer.from(`%PDF-1.4\n${body}\ntrailer << /Root 1 0 R >>\n%%EOF`);
}
