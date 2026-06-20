import { navigationItems } from "@/constants/navigation";
import { getAccessibleSchoolIds, type ActiveProfile } from "@/features/facilitator/services/adms-workflow.service";
import { prisma } from "@/lib/prisma";

export interface GlobalSearchResult {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  href: string;
}

export async function searchGlobal(profile: ActiveProfile, query: string): Promise<GlobalSearchResult[]> {
  const q = query.trim();
  if (q.length < 2) {
    return navigationItems
      .filter((item) => item.roles.includes(profile.role))
      .slice(0, 8)
      .map((item) => ({
        id: `nav-${item.href}-${item.title}`,
        category: "Navigation",
        title: item.title,
        subtitle: "Open workspace page",
        href: item.href,
      }));
  }

  const schoolIds = await getAccessibleSchoolIds(profile);
  const schoolWhere = schoolIds ? { schoolId: { in: schoolIds } } : {};
  const schoolIdWhere = schoolIds ? { id: { in: schoolIds } } : {};

  const [schools, facilitators, teachers, sessions, projects, reports] = await Promise.all([
    prisma.school.findMany({
      where: {
        ...schoolIdWhere,
        OR: [{ name: { contains: q, mode: "insensitive" } }, { schoolCode: { contains: q, mode: "insensitive" } }],
      },
      select: { id: true, name: true, schoolCode: true },
      take: 6,
    }),
    profile.role === "ADMIN"
      ? prisma.profile.findMany({
          where: { role: "FACILITATOR", fullName: { contains: q, mode: "insensitive" } },
          select: { id: true, fullName: true, email: true },
          take: 5,
        })
      : Promise.resolve([]),
    prisma.teacher.findMany({
      where: { fullName: { contains: q, mode: "insensitive" } },
      select: { id: true, fullName: true, department: true },
      take: 5,
    }),
    prisma.aCESession.findMany({
      where: {
        ...schoolWhere,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { activity: { contains: q, mode: "insensitive" } },
          { remarks: { contains: q, mode: "insensitive" } },
          { teacher: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { school: { select: { name: true } } },
      orderBy: { scheduledDate: "desc" },
      take: 8,
    }),
    prisma.aCEProject.findMany({
      where: {
        ...schoolWhere,
        OR: [{ title: { contains: q, mode: "insensitive" } }, { projectType: { contains: q, mode: "insensitive" } }],
      },
      include: { school: { select: { name: true } } },
      take: 6,
    }),
    prisma.report.findMany({
      where: {
        ...schoolWhere,
        OR: [{ title: { contains: q, mode: "insensitive" } }, { reportType: { contains: q, mode: "insensitive" } }],
      },
      include: { school: { select: { name: true } } },
      take: 5,
    }),
  ]);

  const navResults = navigationItems
    .filter((item) => item.roles.includes(profile.role) && item.title.toLowerCase().includes(q.toLowerCase()))
    .map((item) => ({ id: `nav-${item.href}-${item.title}`, category: "Navigation", title: item.title, subtitle: "Open workspace page", href: item.href }));

  return [
    ...navResults,
    ...schools.map((school) => ({
      id: `school-${school.id}`,
      category: "Schools",
      title: school.name,
      subtitle: school.schoolCode ?? "School record",
      href: `/schools?q=${encodeURIComponent(school.name)}`,
    })),
    ...facilitators.map((facilitator) => ({
      id: `facilitator-${facilitator.id}`,
      category: "Facilitators",
      title: facilitator.fullName,
      subtitle: facilitator.email,
      href: "/facilitators",
    })),
    ...teachers.map((teacher) => ({
      id: `teacher-${teacher.id}`,
      category: "Teachers",
      title: teacher.fullName,
      subtitle: teacher.department ?? "Teacher profile",
      href: `/schools?q=${encodeURIComponent(teacher.fullName)}`,
    })),
    ...sessions.map((session) => ({
      id: `session-${session.id}`,
      category: "Sessions",
      title: session.title,
      subtitle: `${session.school.name} | ${session.gradeLevel} ${session.section}`,
      href: `/sessions?schoolId=${session.schoolId}`,
    })),
    ...projects.map((project) => ({
      id: `project-${project.id}`,
      category: "Projects",
      title: project.title,
      subtitle: `${project.school.name} | ${project.projectType ?? "Project"}`,
      href: profile.role === "FACILITATOR" ? "/facilitator/projects" : `/reports?schoolId=${project.schoolId}`,
    })),
    ...reports.map((report) => ({
      id: `report-${report.id}`,
      category: "Reports",
      title: report.title,
      subtitle: `${report.school.name} | ${report.reportType}`,
      href: `/reports?schoolId=${report.schoolId}`,
    })),
  ].slice(0, 30);
}
