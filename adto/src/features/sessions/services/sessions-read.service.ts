import { withMockRelations } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";

export async function getSessionsReadModel(schoolIds: string[] | null) {
  if (isMockDataMode()) {
    const mock = withMockRelations();
    const allowed = schoolIds ? new Set(schoolIds) : null;
    return {
      sessions: mock.sessions.filter((session) => !allowed || allowed.has(session.schoolId)),
      schools: mock.schools.filter((school) => !allowed || allowed.has(school.id)),
      projects: mock.projects.filter((project) => !allowed || allowed.has(project.schoolId)),
    };
  }

  const schoolFilter = schoolIds ? { schoolId: { in: schoolIds } } : {};
  const [sessions, schools, projects] = await Promise.all([
    prisma.aCESession.findMany({
      where: schoolFilter,
      include: { school: true, facilitator: true },
      orderBy: [{ scheduledDate: "asc" }, { gradeLevel: "asc" }, { section: "asc" }],
    }),
    prisma.school.findMany({ where: schoolIds ? { id: { in: schoolIds } } : {}, orderBy: { name: "asc" } }),
    prisma.aCEProject.findMany({
      where: schoolIds ? { schoolId: { in: schoolIds } } : {},
      include: { school: true, session: true },
      orderBy: [{ updatedAt: "desc" }],
      take: 25,
    }),
  ]);
  return { sessions, schools, projects };
}
