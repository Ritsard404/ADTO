import type { ActiveProfile } from "@/features/facilitator/services/adms-workflow.service";
import { getAccessibleSchoolIds } from "@/features/facilitator/services/adms-workflow.service";
import { withMockRelations } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";

const activeSessionStatuses = ["NOT_STARTED", "ONGOING", "RESCHEDULED", "FOR_VERIFICATION"] as const;

type WorkspaceSchool = {
  id: string;
  name: string;
  status: string;
  adoptionType: string | null;
  scheduleArrangement: string | null;
  sections: Array<{ totalStudents: number }>;
  assignments: Array<{ schoolName: string; status: string; startDate: Date; endDate: Date | null }>;
};

type WorkspaceSession = {
  id: string;
  school: { name: string };
  status: string;
  scheduledDate: Date;
  durationHours: unknown;
  teacher: string | null;
  subject: string | null;
  activity: string | null;
  gradeLevel: string;
};

type WorkspaceProject = {
  id: string;
  school: { name: string };
  title: string;
  status: string;
  projectType: string | null;
  teacher: string | null;
  section: string | null;
  gradeLevel: string | null;
};

type WorkspaceInventoryItem = {
  condition: string;
  remarks: string | null;
};

type WorkspaceReport = {
  status: string;
};

type WorkspaceEvidence = {
  id: string;
  fileName: string;
  school: { name: string };
  session: { gradeLevel: string; section: string } | null;
  uploadedBy: { fullName: string };
  createdAt: Date;
};

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
      adoptionType: school.adoptionType,
      scheduleArrangement: school.scheduleArrangement,
      sections: school.sections.map((section) => ({ totalStudents: section.totalStudents })),
      assignments: school.assignments.map((assignment) => ({
        schoolName: school.name,
        status: assignment.status,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
      })),
    }));
    const workspaceSessions: WorkspaceSession[] = sessions.map((session) => ({
      id: session.id,
      school: { name: session.school.name },
      status: session.status,
      scheduledDate: session.scheduledDate,
      durationHours: session.durationHours,
      teacher: session.teacher,
      subject: session.subject,
      activity: session.activity,
      gradeLevel: session.gradeLevel,
    }));
    const workspaceProjects: WorkspaceProject[] = projects.map((project) => ({
      id: project.id,
      school: { name: project.school.name },
      title: project.title,
      status: project.status,
      projectType: project.projectType,
      teacher: project.teacher,
      section: project.section,
      gradeLevel: project.gradeLevel,
    }));
    const workspaceInventoryItems: WorkspaceInventoryItem[] = inventoryItems.map((item) => ({ condition: item.condition, remarks: item.remarks }));
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
      include: { school: true, session: true, uploadedBy: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const workspaceSchools: WorkspaceSchool[] = schools.map((school) => ({
    id: school.id,
    name: school.name,
    status: school.status,
    adoptionType: school.adoptionType,
    scheduleArrangement: school.scheduleArrangement,
    sections: school.sections.map((section) => ({ totalStudents: section.totalStudents })),
    assignments: school.assignments.map((assignment) => ({
      schoolName: school.name,
      status: assignment.status,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
    })),
  }));
  const workspaceSessions: WorkspaceSession[] = sessions.map((session) => ({
    id: session.id,
    school: { name: session.school.name },
    status: session.status,
    scheduledDate: session.scheduledDate,
    durationHours: session.durationHours,
    teacher: session.teacher,
    subject: session.subject,
    activity: session.activity,
    gradeLevel: session.gradeLevel,
  }));
  const workspaceProjects: WorkspaceProject[] = projects.map((project) => ({
    id: project.id,
    school: { name: project.school.name },
    title: project.title,
    status: project.status,
    projectType: project.projectType,
    teacher: project.teacher,
    section: project.section,
    gradeLevel: project.gradeLevel,
  }));
  const workspaceInventoryItems: WorkspaceInventoryItem[] = inventoryItems.map((item) => ({ condition: item.condition, remarks: item.remarks }));
  const workspaceReports: WorkspaceReport[] = reports.map((report) => ({ status: report.status }));
  const workspaceEvidence: WorkspaceEvidence[] = evidence.map((upload) => ({
    id: upload.id,
    fileName: upload.fileName,
    school: { name: upload.school.name },
    session: upload.session ? { gradeLevel: upload.session.gradeLevel, section: upload.session.section } : null,
    uploadedBy: { fullName: upload.uploadedBy.fullName },
    createdAt: upload.createdAt,
  }));

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
