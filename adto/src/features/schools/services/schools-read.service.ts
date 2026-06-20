import { withMockRelations } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";

export async function getSchoolsPortalReadModel(schoolIds: string[] | null, query?: string, status?: string) {
  if (isMockDataMode()) {
    const mock = withMockRelations();
    const allowed = schoolIds ? new Set(schoolIds) : null;
    const schools = mock.schools
      .filter((school) => !allowed || allowed.has(school.id))
      .filter((school) => !status || school.status === status)
      .filter((school) => !query || [school.name, school.address, school.contactPerson].some((value) => value.toLowerCase().includes(query.toLowerCase())))
      .map((school) => ({ ...school, memberships: [] }));
    return { schools, teachers: [], sections: schools.flatMap((school) => school.sections), schoolUsers: [] };
  }

  const schools = await prisma.school.findMany({
    where: {
      id: schoolIds ? { in: schoolIds } : undefined,
      status: status ? (status as "ACTIVE" | "INACTIVE" | "ARCHIVED") : undefined,
      OR: query
        ? [
            { name: { contains: query, mode: "insensitive" } },
            { address: { contains: query, mode: "insensitive" } },
            { contactPerson: { contains: query, mode: "insensitive" } },
          ]
        : undefined,
    },
    include: {
      assignments: { include: { facilitator: true }, orderBy: { startDate: "asc" } },
      projects: { select: { id: true } },
      inventoryItems: { select: { id: true, condition: true, remarks: true } },
      reports: { select: { id: true } },
      sessions: { select: { id: true, status: true, durationHours: true, activity: true } },
      schoolYears: true,
      sections: true,
      teacherAssignments: { include: { teacher: true, section: true } },
      remarks: true,
      memberships: { include: { profile: true }, orderBy: { createdAt: "desc" } },
    },
    orderBy: { name: "asc" },
  });
  const [teachers, schoolUsers] = await Promise.all([
    prisma.teacher.findMany({ orderBy: { fullName: "asc" } }),
    prisma.profile.findMany({
      where: { role: "SCHOOL_ADMIN" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, email: true },
    }),
  ]);
  return { schools, teachers, sections: schools.flatMap((school) => school.sections), schoolUsers };
}
