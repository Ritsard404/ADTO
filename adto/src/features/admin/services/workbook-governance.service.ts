import path from "node:path";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { withMockRelations } from "@/lib/mock-adms-data";
import { isMockDataMode } from "@/lib/runtime-mode";

export interface AdminWorkbookFilters {
  schoolId?: string;
  month?: string;
  term?: string;
  facilitatorId?: string;
  status?: string;
  adoptionType?: string;
}

interface SchoolQuickViewRow {
  id: string;
  name: string;
  schoolCode: string;
  deployedFormId: string;
  facilitatorNames: string;
  schoolYear: string;
  adoptionType: string;
  scheduledSessions: number;
  completedSessions: number;
  cancelledSessions: number;
  codingHours: number;
  activeCoders: number;
  projectCount: number;
  projectTypeMix: string;
  teachersInvolved: number;
  attention: string[];
}

interface ImportPreviewSheet {
  sheet: string;
  rowsRead: number;
  sample: Array<Record<string, string>>;
  errors: Array<{ row: number; field: string; message: string }>;
}

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function monthDateRange(month?: string) {
  if (!month) return {};
  const parsed = new Date(`${month}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return {};
  const next = new Date(parsed);
  next.setMonth(next.getMonth() + 1);
  return { gte: parsed, lt: next };
}

function typeMix(values: Array<string | null>) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value?.trim() || "Unspecified";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => `${label}: ${count}`)
    .join(", ");
}

function workbookSample(sheet: XLSX.WorkSheet | undefined, sheetName: string): ImportPreviewSheet {
  if (!sheet) return { sheet: sheetName, rowsRead: 0, sample: [], errors: [{ row: 0, field: "sheet", message: "Sheet not found in workbook." }] };
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  const sample = rows.slice(0, 5).map((row) =>
    Object.fromEntries(Object.entries(row).slice(0, 8).map(([key, value]) => [key, clean(value)])),
  );
  const errors = rows.slice(0, 50).flatMap((row, index) => {
    if (sheetName === "CleanedData" && !clean(row.Date)) return [{ row: index + 2, field: "Date", message: "Session row has no scheduled date." }];
    if (sheetName === "Projects" && index > 2 && !clean(Object.values(row)[7])) return [{ row: index + 2, field: "Project Title", message: "Project row has no title." }];
    return [];
  });
  return { sheet: sheetName, rowsRead: rows.length, sample, errors };
}

export async function getAdminWorkbookGovernanceReadModel(filters: AdminWorkbookFilters) {
  if (isMockDataMode()) {
    const mock = withMockRelations();
    return {
      filters: {
        schools: mock.schools.map((school) => ({ id: school.id, name: school.name })),
        facilitators: mock.facilitators.map((facilitator) => ({ id: facilitator.id, fullName: facilitator.fullName })),
        adoptionTypes: Array.from(new Set(mock.schools.map((school) => school.adoptionType).filter(Boolean))) as string[],
      },
      totals: {
        scheduledSessions: mock.sessions.length,
        completedSessions: mock.sessions.filter((session) => session.status === "COMPLETED").length,
        cancelledSessions: mock.sessions.filter((session) => session.status === "CANCELLED").length,
        codingHours: mock.sessions.reduce((sum, session) => sum + Number(session.durationHours ?? 0), 0),
        activeCoders: mock.schools.flatMap((school) => school.sections).reduce((sum, section) => sum + section.totalStudents, 0),
        projectCount: mock.projects.length,
        teachersInvolved: 0,
        schoolsNeedingAttention: mock.schools.filter((school) => !school.assignments.some((assignment) => assignment.status === "ACTIVE")).length,
      },
      schoolRows: [] as SchoolQuickViewRow[],
      coverage: { unassignedSchools: [], overloadedFacilitators: [], inactiveFacilitatorsWithActiveAssignments: [], schoolsWithMultipleActiveAssignments: [] },
      importPreview: [] as ImportPreviewSheet[],
      queues: { dataQuality: [], auditLogs: [], approvalRequests: [], reportHistory: [] },
    };
  }

  const sessionDateFilter = monthDateRange(filters.month);
  const schoolWhere = {
    id: filters.schoolId || undefined,
    status: filters.status && ["ACTIVE", "INACTIVE", "ARCHIVED"].includes(filters.status) ? filters.status as "ACTIVE" | "INACTIVE" | "ARCHIVED" : undefined,
    adoptionType: filters.adoptionType || undefined,
    assignments: filters.facilitatorId ? { some: { facilitatorId: filters.facilitatorId } } : undefined,
  };

  const [schools, facilitators, auditLogs, approvalRequests, reportHistory] = await Promise.all([
    prisma.school.findMany({
      where: schoolWhere,
      include: {
        assignments: { include: { facilitator: true }, orderBy: { startDate: "desc" } },
        sessions: {
          where: { scheduledDate: sessionDateFilter },
          select: { status: true, durationHours: true, teacher: true, subject: true, sourceKey: true, sourceSheet: true },
        },
        projects: { select: { projectType: true, projectUrl: true, title: true } },
        inventoryItems: { select: { condition: true, remarks: true, sourceKey: true } },
        reports: { select: { status: true, title: true } },
        sections: { select: { totalStudents: true } },
        teacherAssignments: { select: { teacherId: true, sessionsParticipated: true, hoursSupported: true, projectsFacilitated: true, attendanceRate: true, participationScore: true } },
        mediaUploads: { select: { id: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.profile.findMany({ where: { role: "FACILITATOR" }, select: { id: true, fullName: true, status: true }, orderBy: { fullName: "asc" } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.approvalRequest.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.reportHistory.findMany({ include: { school: true }, orderBy: { generatedAt: "desc" }, take: 10 }),
  ]);

  const schoolRows: SchoolQuickViewRow[] = schools.map((school) => {
    const activeAssignments = school.assignments.filter((assignment) => assignment.status === "ACTIVE");
    const attention = [
      !activeAssignments.length ? "No active facilitator" : "",
      !school.deployedFormId ? "Missing deployed form" : "",
      school.sessions.some((session) => !session.teacher || !session.subject) ? "Session missing teacher/subject" : "",
      school.projects.some((project) => !project.projectUrl) ? "Project missing link" : "",
      school.inventoryItems.some((item) => !item.remarks) ? "Inventory missing remarks" : "",
      school.reports.some((report) => report.status === "DRAFT") ? "Draft report pending" : "",
    ].filter(Boolean);
    return {
      id: school.id,
      name: school.name,
      schoolCode: school.schoolCode ?? "Not set",
      deployedFormId: school.deployedFormId ?? "Not set",
      facilitatorNames: activeAssignments.map((assignment) => assignment.facilitator.fullName).join(", ") || "Unassigned",
      schoolYear: school.schoolYear,
      adoptionType: school.adoptionType ?? "Not set",
      scheduledSessions: school.sessions.length,
      completedSessions: school.sessions.filter((session) => session.status === "COMPLETED").length,
      cancelledSessions: school.sessions.filter((session) => session.status === "CANCELLED").length,
      codingHours: school.sessions.reduce((sum, session) => sum + Number(session.durationHours ?? 0), 0),
      activeCoders: school.sections.reduce((sum, section) => sum + section.totalStudents, 0),
      projectCount: school.projects.length,
      projectTypeMix: typeMix(school.projects.map((project) => project.projectType)),
      teachersInvolved: new Set(school.teacherAssignments.map((assignment) => assignment.teacherId)).size,
      attention,
    };
  });

  const activeAssignments = schools.flatMap((school) => school.assignments.filter((assignment) => assignment.status === "ACTIVE").map((assignment) => ({ school, assignment })));
  const facilitatorLoad = new Map<string, { name: string; count: number }>();
  for (const item of activeAssignments) {
    const entry = facilitatorLoad.get(item.assignment.facilitatorId) ?? { name: item.assignment.facilitator.fullName, count: 0 };
    entry.count += 1;
    facilitatorLoad.set(item.assignment.facilitatorId, entry);
  }

  const workbookPath = path.join(process.cwd(), "legacy", "Colegio de la Immaculada Concepcion - Gorordo - ACE Sessions 2025 -2026.xlsx");
  let importPreview: ImportPreviewSheet[] = [];
  try {
    const workbook = XLSX.readFile(workbookPath, { cellDates: true, raw: false });
    importPreview = ["Data", "BackendData", "DataRef", "CleanedData", "Projects", "GS-i", "HS-i", "AdoptionDetails", "School_Info"].map((sheet) =>
      workbookSample(workbook.Sheets[sheet], sheet),
    );
  } catch {
    importPreview = [{ sheet: "Workbook", rowsRead: 0, sample: [], errors: [{ row: 0, field: "file", message: "Legacy workbook preview is unavailable." }] }];
  }

  const totals = {
    scheduledSessions: schoolRows.reduce((sum, row) => sum + row.scheduledSessions, 0),
    completedSessions: schoolRows.reduce((sum, row) => sum + row.completedSessions, 0),
    cancelledSessions: schoolRows.reduce((sum, row) => sum + row.cancelledSessions, 0),
    codingHours: schoolRows.reduce((sum, row) => sum + row.codingHours, 0),
    activeCoders: schoolRows.reduce((sum, row) => sum + row.activeCoders, 0),
    projectCount: schoolRows.reduce((sum, row) => sum + row.projectCount, 0),
    teachersInvolved: schoolRows.reduce((sum, row) => sum + row.teachersInvolved, 0),
    schoolsNeedingAttention: schoolRows.filter((row) => row.attention.length).length,
  };

  return {
    filters: {
      schools: schools.map((school) => ({ id: school.id, name: school.name })),
      facilitators: facilitators.map((facilitator) => ({ id: facilitator.id, fullName: facilitator.fullName })),
      adoptionTypes: Array.from(new Set(schools.map((school) => school.adoptionType).filter(Boolean))) as string[],
    },
    totals,
    schoolRows,
    coverage: {
      unassignedSchools: schools.filter((school) => !school.assignments.some((assignment) => assignment.status === "ACTIVE")).map((school) => school.name),
      overloadedFacilitators: Array.from(facilitatorLoad.values()).filter((entry) => entry.count > 1).map((entry) => `${entry.name} (${entry.count} active schools)`),
      inactiveFacilitatorsWithActiveAssignments: activeAssignments
        .filter((item) => item.assignment.facilitator.status !== "ACTIVE")
        .map((item) => `${item.assignment.facilitator.fullName} -> ${item.school.name}`),
      schoolsWithMultipleActiveAssignments: schools
        .filter((school) => school.assignments.filter((assignment) => assignment.status === "ACTIVE").length > 1)
        .map((school) => school.name),
    },
    importPreview,
    queues: {
      dataQuality: schoolRows.flatMap((row) => row.attention.map((issue) => ({ school: row.name, issue }))).slice(0, 20),
      auditLogs,
      approvalRequests,
      reportHistory,
    },
  };
}
