import { getAccessibleSchoolIds, type ActiveProfile } from "@/features/facilitator/services/adms-workflow.service";
import type { SessionStatus } from "@/generated/prisma/enums";
import { withMockRelations } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";

export interface CompactDashboardQuery {
  schoolId?: string;
  month?: string;
  grade?: string;
  teacher?: string;
  activity?: string;
  status?: string;
}

export interface CompactDashboardSession {
  id: string;
  date: Date;
  period: string;
  gradeLevel: string;
  section: string;
  subject: string;
  teacher: string;
  activity: string;
  topic: string;
  delivery: string;
  completion: string;
  status: string;
  remarks: string;
  schoolName: string;
  facilitatorName: string;
  durationHours: number;
}

const sessionStatuses = new Set<string>(["NOT_STARTED", "ONGOING", "COMPLETED", "MISSED", "RESCHEDULED", "CANCELLED", "FOR_VERIFICATION"]);

function parseSessionStatus(status?: string): SessionStatus | undefined {
  return status && sessionStatuses.has(status) ? (status as SessionStatus) : undefined;
}

function monthBounds(month?: string) {
  const fallback = new Date();
  const parsed = month ? new Date(`${month}-01T00:00:00`) : new Date(fallback.getFullYear(), fallback.getMonth(), 1);
  const start = Number.isNaN(parsed.getTime()) ? new Date(fallback.getFullYear(), fallback.getMonth(), 1) : parsed;
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end, key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}` };
}

function countClassDays(start: Date | null, end: Date | null) {
  if (!start || !end) return 0;
  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

function statusLabel(status: string, completion: string, remarks: string) {
  const joined = `${status} ${completion} ${remarks}`.toLowerCase();
  if (joined.includes("cancel")) return "Cancelled";
  if (status === "COMPLETED" || joined.includes("complete")) return "Completed";
  if (status === "NOT_STARTED" || status === "ONGOING" || status === "RESCHEDULED" || status === "FOR_VERIFICATION") return "Scheduled";
  return status.replaceAll("_", " ");
}

function projectMix(projects: Array<{ projectType: string | null }>) {
  const counts = new Map<string, number>();
  for (const project of projects) {
    const key = project.projectType || "Unspecified";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([type, count]) => `${type}: ${count}`).join(", ");
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getCompactDashboardReadModel(profile: ActiveProfile, query: CompactDashboardQuery) {
  const accessibleSchoolIds = await getAccessibleSchoolIds(profile);
  const { start, end, key: monthKey } = monthBounds(query.month);

  if (isMockDataMode()) {
    const mock = withMockRelations();
    const allowed = accessibleSchoolIds ? new Set(accessibleSchoolIds) : null;
    const schools = mock.schools.filter((school) => !allowed || allowed.has(school.id));
    const selectedSchool = schools.find((school) => school.id === query.schoolId) ?? schools[0];
    const sessions = mock.sessions
      .filter((session) => !selectedSchool || session.schoolId === selectedSchool.id)
      .filter((session) => session.scheduledDate >= start && session.scheduledDate < end)
      .filter((session) => !query.grade || session.gradeLevel === query.grade)
      .filter((session) => !query.teacher || session.teacher === query.teacher)
      .filter((session) => !query.activity || session.activity === query.activity)
      .filter((session) => !query.status || session.status === query.status)
      .map((session) => ({
        id: session.id,
        date: session.scheduledDate,
        period: session.period ?? "",
        gradeLevel: session.gradeLevel,
        section: session.section,
        subject: session.subject ?? "",
        teacher: session.teacher ?? "",
        activity: session.activity ?? "",
        topic: session.title,
        delivery: session.delivery ?? "",
        completion: session.completion ?? "",
        status: session.status,
        remarks: session.remarks ?? "",
        schoolName: session.school.name,
        facilitatorName: session.facilitator.fullName,
        durationHours: Number(session.durationHours ?? 0),
      }));
    const projects = mock.projects.filter((project) => !selectedSchool || project.schoolId === selectedSchool.id);
    const teachers = new Set(sessions.map((session) => session.teacher).filter(Boolean));
    const gradeCounts = sessions.reduce<Record<string, number>>((acc, session) => {
      acc[session.gradeLevel] = (acc[session.gradeLevel] ?? 0) + 1;
      return acc;
    }, {});
    const mostActiveGrade = Object.entries(gradeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No sessions";

    return {
      monthKey,
      selectedSchool,
      schools: schools.map((school) => ({ id: school.id, name: school.name })),
      filters: {
        grades: Array.from(new Set(mock.sessions.map((session) => session.gradeLevel))).sort(),
        teachers: Array.from(new Set(mock.sessions.map((session) => session.teacher).filter(Boolean))).sort() as string[],
        activities: Array.from(new Set(mock.sessions.map((session) => session.activity).filter(Boolean))).sort() as string[],
        statuses: Array.from(new Set(mock.sessions.map((session) => session.status))).sort(),
      },
      terms: [],
      sessions,
      sessionsByDay: sessions.reduce<Record<string, CompactDashboardSession[]>>((acc, session) => {
        const key = dayKey(session.date);
        acc[key] = [...(acc[key] ?? []), session];
        return acc;
      }, {}),
      summary: {
        schoolName: selectedSchool?.name ?? "No school selected",
        schoolYear: selectedSchool?.schoolYear ?? "Not set",
        assignedFacilitator: selectedSchool?.assignments.find((assignment) => assignment.status === "ACTIVE")?.facilitator.fullName ?? "Unassigned",
        currentMonth: start.toLocaleString("en-US", { month: "long", year: "numeric" }),
        currentTerm: selectedSchool?.schoolYear ?? "Not set",
        scheduledSessions: sessions.length,
        completedSessions: sessions.filter((session) => statusLabel(session.status, session.completion, session.remarks) === "Completed").length,
        cancelledSessions: sessions.filter((session) => statusLabel(session.status, session.completion, session.remarks) === "Cancelled").length,
        codingHours: sessions.reduce((sum, session) => sum + Number(session.durationHours ?? 0), 0),
        activeCoders: selectedSchool?.sections.reduce((sum, section) => sum + section.totalStudents, 0) ?? 0,
        projectsCreated: projects.length,
        activeTeachers: teachers.size,
        adoptionType: selectedSchool?.adoptionType ?? "Not set",
        deployedFormId: selectedSchool?.deployedFormId ?? "Not set",
        projectMix: projectMix(projects),
        mostActiveGrade,
      },
    };
  }

  const schoolScope = accessibleSchoolIds ? { id: { in: accessibleSchoolIds } } : {};
  const schools = await prisma.school.findMany({
    where: schoolScope,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  const selectedSchoolId = query.schoolId && schools.some((school) => school.id === query.schoolId) ? query.schoolId : schools[0]?.id;
  const selectedStatus = parseSessionStatus(query.status);

  const [selectedSchool, sessions, allSessionsForFilters, projects] = await Promise.all([
    selectedSchoolId
      ? prisma.school.findUnique({
          where: { id: selectedSchoolId },
          include: {
            assignments: { where: { status: "ACTIVE" }, include: { facilitator: true } },
            schoolYears: { orderBy: { startDate: "asc" } },
            sections: true,
            teacherAssignments: { include: { teacher: true } },
          },
        })
      : null,
    prisma.aCESession.findMany({
      where: {
        schoolId: selectedSchoolId,
        scheduledDate: { gte: start, lt: end },
        gradeLevel: query.grade || undefined,
        teacher: query.teacher || undefined,
        activity: query.activity || undefined,
        status: selectedStatus,
      },
      include: { school: true, facilitator: true },
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
    }),
    prisma.aCESession.findMany({
      where: { schoolId: selectedSchoolId, scheduledDate: { gte: start, lt: end } },
      select: { gradeLevel: true, teacher: true, activity: true, status: true },
    }),
    prisma.aCEProject.findMany({ where: { schoolId: selectedSchoolId }, select: { projectType: true, submittedAt: true } }),
  ]);

  const normalizedSessions: CompactDashboardSession[] = sessions.map((session) => ({
    id: session.id,
    date: session.scheduledDate,
    period: session.period ?? "",
    gradeLevel: session.gradeLevel,
    section: session.section,
    subject: session.subject ?? "",
    teacher: session.teacher ?? "",
    activity: session.activity ?? "",
    topic: session.title,
    delivery: session.delivery ?? "",
    completion: session.completion ?? "",
    status: session.status,
    remarks: session.remarks ?? "",
    schoolName: session.school.name,
    facilitatorName: session.facilitator.fullName,
    durationHours: Number(session.durationHours ?? 0),
  }));
  const teachers = new Set(normalizedSessions.map((session) => session.teacher).filter(Boolean));
  const gradeCounts = normalizedSessions.reduce<Record<string, number>>((acc, session) => {
    acc[session.gradeLevel] = (acc[session.gradeLevel] ?? 0) + 1;
    return acc;
  }, {});
  const mostActiveGrade = Object.entries(gradeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No sessions";

  return {
    monthKey,
    selectedSchool,
    schools,
    filters: {
      grades: Array.from(new Set(allSessionsForFilters.map((session) => session.gradeLevel))).sort(),
      teachers: Array.from(new Set(allSessionsForFilters.map((session) => session.teacher).filter(Boolean))).sort() as string[],
      activities: Array.from(new Set(allSessionsForFilters.map((session) => session.activity).filter(Boolean))).sort() as string[],
      statuses: Array.from(new Set(allSessionsForFilters.map((session) => session.status))).sort(),
    },
    terms: selectedSchool?.schoolYears.map((term) => ({
      label: term.label,
      startDate: term.startDate,
      endDate: term.endDate,
      classDays: countClassDays(term.startDate, term.endDate),
      holidayNote: "Review school calendar",
      status: term.status,
    })) ?? [],
    sessions: normalizedSessions,
    sessionsByDay: normalizedSessions.reduce<Record<string, CompactDashboardSession[]>>((acc, session) => {
      const key = dayKey(session.date);
      acc[key] = [...(acc[key] ?? []), session];
      return acc;
    }, {}),
    summary: {
      schoolName: selectedSchool?.name ?? "No school selected",
      schoolYear: selectedSchool?.schoolYear ?? "Not set",
      assignedFacilitator: selectedSchool?.assignments.map((assignment) => assignment.facilitator.fullName).join(", ") || "Unassigned",
      currentMonth: start.toLocaleString("en-US", { month: "long", year: "numeric" }),
      currentTerm: selectedSchool?.schoolYears.find((term) => term.startDate && term.endDate && term.startDate <= start && term.endDate >= start)?.label ?? selectedSchool?.schoolYear ?? "Not set",
      scheduledSessions: normalizedSessions.length,
      completedSessions: normalizedSessions.filter((session) => statusLabel(session.status, session.completion, session.remarks) === "Completed").length,
      cancelledSessions: normalizedSessions.filter((session) => statusLabel(session.status, session.completion, session.remarks) === "Cancelled").length,
      codingHours: sessions.reduce((sum, session) => sum + Number(session.durationHours ?? 0), 0),
      activeCoders: selectedSchool?.sections.reduce((sum, section) => sum + section.totalStudents, 0) ?? 0,
      projectsCreated: projects.filter((project) => !project.submittedAt || (project.submittedAt >= start && project.submittedAt < end)).length,
      activeTeachers: teachers.size,
      adoptionType: selectedSchool?.adoptionType ?? "Not set",
      deployedFormId: selectedSchool?.deployedFormId ?? "Not set",
      projectMix: projectMix(projects),
      mostActiveGrade,
    },
  };
}

export { statusLabel };
