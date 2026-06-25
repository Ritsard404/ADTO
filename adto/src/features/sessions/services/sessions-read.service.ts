import { withMockRelations } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";

export interface SessionsReadFilters {
  schoolId?: string;
  month?: string;
}

function monthBounds(month?: string) {
  const now = new Date();
  const parsed = month ? new Date(`${month}-01T00:00:00.000Z`) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const start = Number.isNaN(parsed.getTime()) ? new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) : parsed;
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end, key: start.toISOString().slice(0, 7) };
}

export async function getSessionsReadModel(schoolIds: string[] | null, filters: SessionsReadFilters = {}) {
  const { start, end, key: monthKey } = monthBounds(filters.month);
  if (isMockDataMode()) {
    const mock = withMockRelations();
    const allowed = schoolIds ? new Set(schoolIds) : null;
    const schools = mock.schools.filter((school) => !allowed || allowed.has(school.id));
    const scopedSchools = schools.filter((school) => !filters.schoolId || school.id === filters.schoolId);
    const schoolSet = new Set(scopedSchools.map((school) => school.id));
    return {
      monthKey,
      sessions: mock.sessions.filter((session) => schoolSet.has(session.schoolId) && session.scheduledDate >= start && session.scheduledDate < end),
      schools,
      projects: mock.projects.filter((project) => schoolSet.has(project.schoolId)).slice(0, 25),
    };
  }

  const scopedSchoolIds = filters.schoolId
    ? schoolIds
      ? schoolIds.includes(filters.schoolId)
        ? [filters.schoolId]
        : []
      : [filters.schoolId]
    : schoolIds;
  const schoolFilter = scopedSchoolIds ? { schoolId: { in: scopedSchoolIds } } : {};
  const [sessions, schools, projects] = await Promise.all([
    prisma.aCESession.findMany({
      where: { ...schoolFilter, scheduledDate: { gte: start, lt: end } },
      include: { school: true, facilitator: true },
      orderBy: [{ scheduledDate: "asc" }, { gradeLevel: "asc" }, { section: "asc" }],
      take: 500,
    }),
    prisma.school.findMany({ where: schoolIds ? { id: { in: schoolIds } } : {}, orderBy: { name: "asc" } }),
    prisma.aCEProject.findMany({
      where: scopedSchoolIds ? { schoolId: { in: scopedSchoolIds } } : {},
      include: { school: true, session: true },
      orderBy: [{ updatedAt: "desc" }],
      take: 25,
    }),
  ]);
  return { monthKey, sessions, schools, projects };
}
