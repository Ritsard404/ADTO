import type { ActiveProfile } from "@/features/facilitator/services/adms-workflow.service";
import { getAccessibleSchoolIds } from "@/features/facilitator/services/adms-workflow.service";
import { resolveStorageUrl } from "@/features/media/services/private-storage.service";
import { withMockRelations } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";

const activeSessionStatuses = ["NOT_STARTED", "ONGOING", "RESCHEDULED", "FOR_VERIFICATION"] as const;

type WorkspaceSchool = {
  id: string;
  name: string;
  status: string;
  schoolCode: string | null;
  deployedFormId: string | null;
  adoptionYear: string | null;
  adoptionType: string | null;
  gradeLevelAdoption: string | null;
  unitHead: string | null;
  supervisor: string | null;
  edtechSpecialist: string | null;
  adoptionRemarks: string | null;
  scheduleArrangement: string | null;
  codingModality: string | null;
  hardwareAllocation: string | null;
  softwareAllocation: string | null;
  sections: Array<{ totalStudents: number }>;
  schoolYears: Array<{ label: string; startDate: Date | null; endDate: Date | null; status: string }>;
  teacherAssignments: Array<{
    teacher: { fullName: string };
    subject: string;
    gradeLevel: string;
    sessionsParticipated: number;
    hoursSupported: unknown;
    projectsFacilitated: number;
    attendanceRate: number;
    participationScore: number;
  }>;
  assignments: Array<{ schoolName: string; status: string; startDate: Date; endDate: Date | null }>;
};

type WorkspaceSession = {
  id: string;
  school: { id: string; name: string };
  status: string;
  scheduledDate: Date;
  durationHours: unknown;
  teacher: string | null;
  subject: string | null;
  activity: string | null;
  gradeLevel: string;
  section: string;
};

type WorkspaceProject = {
  id: string;
  school: { id: string; name: string };
  title: string;
  status: string;
  term: string | null;
  students: string | null;
  description: string | null;
  projectUrl: string | null;
  remarks: string | null;
  submittedAt: Date | null;
  projectType: string | null;
  teacher: string | null;
  section: string | null;
  gradeLevel: string | null;
};

type WorkspaceInventoryItem = {
  id?: string;
  itemName?: string;
  category?: string;
  quantity?: number;
  unit?: string | null;
  assetStatus?: string;
  lastCheckedAt?: Date | null;
  lastCheckedBy?: string | null;
  school?: { name: string };
  condition: string;
  remarks: string | null;
  sourceSheet?: string | null;
};

type WorkspaceReport = {
  status: string;
};

type WorkspaceEvidence = {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  description: string | null;
  fileSizeBytes: number | null;
  mimeType: string | null;
  originalSource: string;
  uploadStatus: string;
  reviewStatus: string;
  teacherTag: string | null;
  gradeLevelTag: string | null;
  sectionTag: string | null;
  reportPeriod: string | null;
  school: { name: string };
  session: { gradeLevel: string; section: string } | null;
  project: { title: string } | null;
  uploadedBy: { fullName: string };
  createdAt: Date;
};

function projectTypeMix(projects: WorkspaceProject[]) {
  const counts = new Map<string, number>();
  for (const project of projects) {
    const key = project.projectType || "Unspecified";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([label, count]) => `${label}: ${count}`).join(", ");
}

function monthDateRange(month?: string) {
  if (!month) return null;
  const parsed = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const next = new Date(parsed);
  next.setMonth(next.getMonth() + 1);
  return { start: parsed, end: next };
}

function inAllowedSchool(schoolIds: string[] | null) {
  return schoolIds ? { schoolId: { in: schoolIds } } : {};
}

export async function getFacilitatorWorkspace(profile: ActiveProfile) {
  const schoolIds = await getAccessibleSchoolIds(profile);

  if (isMockDataMode()) {
    const mock = withMockRelations();
    const allowed = schoolIds ? new Set(schoolIds) : null;
    const schools = mock.schools.filter((school) => !allowed || allowed.has(school.id));
    const sessions = mock.sessions.filter((session) => !allowed || allowed.has(session.schoolId));
    const projects = mock.projects.filter((project) => !allowed || allowed.has(project.schoolId));
    const inventoryItems = mock.inventoryItems.filter((item) => !allowed || allowed.has(item.schoolId));
    const reports = mock.reports.filter((report) => !allowed || allowed.has(report.schoolId));

    const workspaceSchools: WorkspaceSchool[] = schools.map((school) => ({
      id: school.id,
      name: school.name,
      status: school.status,
      schoolCode: school.schoolCode,
      deployedFormId: school.deployedFormId,
      adoptionYear: school.adoptionYear,
      adoptionType: school.adoptionType,
      gradeLevelAdoption: school.gradeLevelAdoption,
      unitHead: school.unitHead,
      supervisor: school.supervisor,
      edtechSpecialist: school.edtechSpecialist,
      adoptionRemarks: school.adoptionRemarks,
      scheduleArrangement: school.scheduleArrangement,
      codingModality: school.codingModality,
      hardwareAllocation: school.hardwareAllocation,
      softwareAllocation: school.softwareAllocation,
      sections: school.sections.map((section) => ({ totalStudents: section.totalStudents })),
      schoolYears: [],
      teacherAssignments: [],
      assignments: school.assignments.map((assignment) => ({
        schoolName: school.name,
        status: assignment.status,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
      })),
    }));
    const workspaceSessions: WorkspaceSession[] = sessions.map((session) => ({
      id: session.id,
      school: { id: session.school.id, name: session.school.name },
      status: session.status,
      scheduledDate: session.scheduledDate,
      durationHours: session.durationHours,
      teacher: session.teacher,
      subject: session.subject,
      activity: session.activity,
      gradeLevel: session.gradeLevel,
      section: session.section,
    }));
    const workspaceProjects: WorkspaceProject[] = projects.map((project) => ({
      id: project.id,
      school: { id: project.school.id, name: project.school.name },
      title: project.title,
      status: project.status,
      term: project.term,
      students: project.students,
      description: project.description,
      projectUrl: project.projectUrl,
      remarks: project.remarks,
      submittedAt: project.submittedAt,
      projectType: project.projectType,
      teacher: project.teacher,
      section: project.section,
      gradeLevel: project.gradeLevel,
    }));
    const workspaceInventoryItems: WorkspaceInventoryItem[] = inventoryItems.map((item) => ({
      id: item.id,
      itemName: item.itemName,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      assetStatus: item.assetStatus,
      lastCheckedAt: item.lastCheckedAt,
      lastCheckedBy: item.lastCheckedBy,
      school: { name: item.school.name },
      condition: item.condition,
      remarks: item.remarks,
      sourceSheet: item.sourceSheet,
    }));
    const workspaceReports: WorkspaceReport[] = reports.map((report) => ({ status: report.status }));

    return {
      schools: workspaceSchools,
      sessions: workspaceSessions,
      projects: workspaceProjects,
      inventoryItems: workspaceInventoryItems,
      reports: workspaceReports,
      evidence: [],
      metrics: buildMetrics(workspaceSchools, workspaceSessions, workspaceProjects, workspaceInventoryItems, workspaceReports),
    };
  }

  const schoolWhere = schoolIds ? { id: { in: schoolIds } } : {};
  const childWhere = inAllowedSchool(schoolIds);

  const [schools, sessions, projects, inventoryItems, reports, evidence] = await Promise.all([
    prisma.school.findMany({
      where: schoolWhere,
      include: {
        sections: { orderBy: [{ gradeLevel: "asc" }, { sectionName: "asc" }] },
        schoolYears: { orderBy: { startDate: "asc" } },
        assignments: { where: { status: "ACTIVE" }, include: { facilitator: true } },
        teacherAssignments: { include: { teacher: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.aCESession.findMany({
      where: childWhere,
      include: { school: true, facilitator: true },
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
    }),
    prisma.aCEProject.findMany({
      where: childWhere,
      include: { school: true, session: true },
      orderBy: [{ updatedAt: "desc" }],
    }),
    prisma.inventoryItem.findMany({
      where: childWhere,
      include: { school: true },
      orderBy: [{ school: { name: "asc" } }, { category: "asc" }, { itemName: "asc" }],
    }),
    prisma.report.findMany({
      where: childWhere,
      include: { school: true, facilitator: true },
      orderBy: [{ submittedAt: "desc" }, { title: "asc" }],
    }),
    prisma.mediaUpload.findMany({
      where: childWhere,
      include: { school: true, session: true, project: true, uploadedBy: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const workspaceSchools: WorkspaceSchool[] = schools.map((school) => ({
    id: school.id,
    name: school.name,
    status: school.status,
    schoolCode: school.schoolCode,
    deployedFormId: school.deployedFormId,
    adoptionYear: school.adoptionYear,
    adoptionType: school.adoptionType,
    gradeLevelAdoption: school.gradeLevelAdoption,
    unitHead: school.unitHead,
    supervisor: school.supervisor,
    edtechSpecialist: school.edtechSpecialist,
    adoptionRemarks: school.adoptionRemarks,
    scheduleArrangement: school.scheduleArrangement,
    codingModality: school.codingModality,
    hardwareAllocation: school.hardwareAllocation,
    softwareAllocation: school.softwareAllocation,
    sections: school.sections.map((section) => ({ totalStudents: section.totalStudents })),
    schoolYears: school.schoolYears.map((year) => ({ label: year.label, startDate: year.startDate, endDate: year.endDate, status: year.status })),
    teacherAssignments: school.teacherAssignments.map((assignment) => ({
      teacher: { fullName: assignment.teacher.fullName },
      subject: assignment.subject,
      gradeLevel: assignment.gradeLevel,
      sessionsParticipated: assignment.sessionsParticipated,
      hoursSupported: assignment.hoursSupported,
      projectsFacilitated: assignment.projectsFacilitated,
      attendanceRate: assignment.attendanceRate,
      participationScore: assignment.participationScore,
    })),
    assignments: school.assignments.map((assignment) => ({
      schoolName: school.name,
      status: assignment.status,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
    })),
  }));
  const workspaceSessions: WorkspaceSession[] = sessions.map((session) => ({
    id: session.id,
    school: { id: session.school.id, name: session.school.name },
    status: session.status,
    scheduledDate: session.scheduledDate,
    durationHours: session.durationHours,
    teacher: session.teacher,
    subject: session.subject,
    activity: session.activity,
    gradeLevel: session.gradeLevel,
    section: session.section,
  }));
  const workspaceProjects: WorkspaceProject[] = projects.map((project) => ({
    id: project.id,
    school: { id: project.school.id, name: project.school.name },
    title: project.title,
    status: project.status,
    term: project.term,
    students: project.students,
    description: project.description,
    projectUrl: project.projectUrl,
    remarks: project.remarks,
    submittedAt: project.submittedAt,
    projectType: project.projectType,
    teacher: project.teacher,
    section: project.section,
    gradeLevel: project.gradeLevel,
  }));
  const workspaceInventoryItems: WorkspaceInventoryItem[] = inventoryItems.map((item) => ({
    id: item.id,
    itemName: item.itemName,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    assetStatus: item.assetStatus,
    lastCheckedAt: item.lastCheckedAt,
    lastCheckedBy: item.lastCheckedBy,
    school: { name: item.school.name },
    condition: item.condition,
    remarks: item.remarks,
    sourceSheet: item.sourceSheet,
  }));
  const workspaceReports: WorkspaceReport[] = reports.map((report) => ({ status: report.status }));
  const workspaceEvidence: WorkspaceEvidence[] = await Promise.all(evidence.map(async (upload) => ({
    id: upload.id,
    fileName: upload.fileName,
    fileUrl: await resolveStorageUrl(upload.fileUrl),
    fileType: upload.fileType,
    description: upload.description,
    fileSizeBytes: upload.fileSizeBytes,
    mimeType: upload.mimeType,
    originalSource: upload.originalSource,
    uploadStatus: upload.uploadStatus,
    reviewStatus: upload.reviewStatus,
    teacherTag: upload.teacherTag,
    gradeLevelTag: upload.gradeLevelTag,
    sectionTag: upload.sectionTag,
    reportPeriod: upload.reportPeriod,
    school: { name: upload.school.name },
    session: upload.session ? { gradeLevel: upload.session.gradeLevel, section: upload.session.section } : null,
    project: upload.project ? { title: upload.project.title } : null,
    uploadedBy: { fullName: upload.uploadedBy.fullName },
    createdAt: upload.createdAt,
  })));

  return {
    schools: workspaceSchools,
    sessions: workspaceSessions,
    projects: workspaceProjects,
    inventoryItems: workspaceInventoryItems,
    reports: workspaceReports,
    evidence: workspaceEvidence,
    metrics: buildMetrics(workspaceSchools, workspaceSessions, workspaceProjects, workspaceInventoryItems, workspaceReports),
  };
}

export async function getFacilitatorMonthlyQuickView(profile: ActiveProfile, filters: { schoolId?: string; month?: string }) {
  const workspace = await getFacilitatorWorkspace(profile);
  const activeSchool = workspace.schools.find((school) => !filters.schoolId || school.id === filters.schoolId) ?? workspace.schools[0];
  const range = monthDateRange(filters.month);
  const schoolSessions = workspace.sessions.filter((session) => !activeSchool || session.school.name === activeSchool.name);
  const monthSessions = range ? schoolSessions.filter((session) => session.scheduledDate >= range.start && session.scheduledDate < range.end) : schoolSessions;
  const schoolProjects = workspace.projects.filter((project) => !activeSchool || project.school.name === activeSchool.name);
  const monthProjects = range ? schoolProjects.filter((project) => project.submittedAt && project.submittedAt >= range.start && project.submittedAt < range.end) : schoolProjects;

  const buildTotals = (sessions: WorkspaceSession[], projects: WorkspaceProject[]) => ({
    scheduledSessions: sessions.length,
    completedSessions: sessions.filter((session) => session.status === "COMPLETED").length,
    cancelledSessions: sessions.filter((session) => session.status === "CANCELLED").length,
    codingHours: sessions.reduce((sum, session) => sum + Number(session.durationHours ?? 0), 0),
    activeCoders: activeSchool?.sections.reduce((sum, section) => sum + section.totalStudents, 0) ?? 0,
    projectsCreated: projects.length,
    projectTypeMix: projectTypeMix(projects) || "No project types yet",
  });

  return {
    schools: workspace.schools.map((school) => ({ id: school.id, name: school.name })),
    selectedSchool: activeSchool,
    month: filters.month,
    thisMonth: buildTotals(monthSessions, monthProjects),
    cumulative: buildTotals(schoolSessions, schoolProjects),
  };
}

function buildMetrics(
  schools: WorkspaceSchool[],
  sessions: WorkspaceSession[],
  projects: WorkspaceProject[],
  inventoryItems: WorkspaceInventoryItem[],
  reports: WorkspaceReport[],
) {
  const now = new Date();
  const upcomingSessions = sessions.filter((session) => session.scheduledDate >= now && activeSessionStatuses.includes(session.status as (typeof activeSessionStatuses)[number]));
  const completedSessions = sessions.filter((session) => session.status === "COMPLETED");
  const teachers = new Set(sessions.map((session) => session.teacher).filter(Boolean));
  const subjects = new Set(sessions.map((session) => session.subject).filter(Boolean));
  const activities = new Set(sessions.map((session) => session.activity).filter(Boolean));

  return {
    assignedSchools: schools.length,
    activeSchools: schools.filter((school) => school.status === "ACTIVE").length,
    upcomingSessions: upcomingSessions.length,
    completedSessions: completedSessions.length,
    codingHours: sessions.reduce((sum, session) => sum + Number(session.durationHours ?? 0), 0),
    studentParticipation: schools.flatMap((school) => school.sections ?? []).reduce((sum, section) => sum + section.totalStudents, 0),
    teacherParticipation: teachers.size,
    computationalArtifacts: projects.length,
    pendingReports: reports.filter((report) => ["DRAFT", "SUBMITTED"].includes(report.status)).length,
    inventoryAlerts: inventoryItems.filter((item) => !item.remarks || ["FAIR", "NEEDS_REPLACEMENT", "LOST"].includes(item.condition)).length,
    subjectIntegration: subjects.size,
    activityCount: activities.size,
    projectCompletionRate: projects.length ? Math.round((projects.filter((project) => project.status === "COMPLETED").length / projects.length) * 100) : 0,
  };
}
