import { withMockRelations } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";

export async function getDashboardReadModel(schoolIds: string[] | null = null) {
  if (isMockDataMode()) {
    const mock = withMockRelations();
    const allowed = schoolIds ? new Set(schoolIds) : null;
    const mockSchools = mock.schools.filter((school) => !allowed || allowed.has(school.id));
    const mockSessions = mock.sessions.filter((session) => !allowed || allowed.has(session.schoolId));
    const mockProjects = mock.projects.filter((project) => !allowed || allowed.has(project.schoolId));
    const mockInventory = mock.inventoryItems.filter((item) => !allowed || allowed.has(item.schoolId));
    const mockReports = mock.reports.filter((report) => !allowed || allowed.has(report.schoolId));
    const activeSessions = mockSessions.filter((session) => ["NOT_STARTED", "ONGOING", "RESCHEDULED", "FOR_VERIFICATION"].includes(session.status)).length;
    const completedSessions = mockSessions.filter((session) => session.status === "COMPLETED").length;
    const pendingReports = mockReports.filter((report) => ["DRAFT", "SUBMITTED"].includes(report.status)).length;
    return {
      schools: mockSchools.length,
      activeSchools: mockSchools.filter((school) => school.status === "ACTIVE").length,
      facilitators: mock.facilitators.length,
      assignedFacilitators: mock.assignments.filter((assignment) => assignment.status === "ACTIVE" && (!allowed || allowed.has(assignment.schoolId))).length,
      unassignedSchools: mockSchools.filter((school) => !school.assignments.some((assignment) => assignment.status === "ACTIVE")).length,
      sessions: mockSessions.length,
      activeSessions,
      completedSessions,
      pendingReports,
      projects: mockProjects.length,
      pendingInventoryRemarks: mockInventory.filter((item) => !item.remarks || item.condition === "FAIR" || item.condition === "NEEDS_REPLACEMENT").length,
      totalStudents: mockSchools.flatMap((school) => school.sections).reduce((sum, section) => sum + section.totalStudents, 0),
      codingHours: mockSessions.reduce((sum, session) => sum + Number(session.durationHours ?? 0), 0),
      activities: new Set(mockSessions.map((session) => session.activity).filter(Boolean)).size,
      assignedInventoryItems: mockInventory.length,
      schoolProgress: mockSchools,
    };
  }
  const schoolWhere = schoolIds ? { schoolId: { in: schoolIds } } : {};
  const schoolIdWhere = schoolIds ? { id: { in: schoolIds } } : {};

  const [
    schools,
    activeSchools,
    facilitators,
    assignedFacilitators,
    unassignedSchools,
    sessions,
    activeSessions,
    completedSessions,
    pendingReports,
    projects,
    pendingInventoryRemarks,
    schoolProgress,
  ] = await Promise.all([
    prisma.school.count({ where: schoolIdWhere }),
    prisma.school.count({ where: { ...schoolIdWhere, status: "ACTIVE" } }),
    prisma.profile.count({ where: { role: "FACILITATOR" } }),
    prisma.facilitatorAssignment.count({ where: { status: "ACTIVE", ...(schoolIds ? { schoolId: { in: schoolIds } } : {}) } }),
    prisma.school.count({ where: { ...schoolIdWhere, assignments: { none: { status: "ACTIVE" } } } }),
    prisma.aCESession.count({ where: schoolWhere }),
    prisma.aCESession.count({ where: { ...schoolWhere, status: { in: ["NOT_STARTED", "ONGOING", "RESCHEDULED", "FOR_VERIFICATION"] } } }),
    prisma.aCESession.count({ where: { ...schoolWhere, status: "COMPLETED" } }),
    prisma.report.count({ where: { ...(schoolIds ? { schoolId: { in: schoolIds } } : {}), status: { in: ["DRAFT", "SUBMITTED"] } } }),
    prisma.aCEProject.count({ where: schoolWhere }),
    prisma.inventoryItem.count({ where: { ...schoolWhere, OR: [{ remarks: null }, { condition: { in: ["FAIR", "NEEDS_REPLACEMENT"] } }] } }),
    prisma.school.findMany({
      where: schoolIdWhere,
      take: 5,
      include: { sessions: { select: { status: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const [sectionAggregate, sessionRows, inventoryCount] = await Promise.all([
    prisma.schoolSection.aggregate({ where: schoolIds ? { schoolId: { in: schoolIds } } : {}, _sum: { totalStudents: true } }),
    prisma.aCESession.findMany({ where: schoolWhere, select: { durationHours: true, activity: true } }),
    prisma.inventoryItem.count({ where: schoolWhere }),
  ]);

  return {
    schools,
    activeSchools,
    facilitators,
    assignedFacilitators,
    unassignedSchools,
    sessions,
    activeSessions,
    completedSessions,
    pendingReports,
    projects,
    pendingInventoryRemarks,
    totalStudents: sectionAggregate._sum.totalStudents ?? 0,
    codingHours: sessionRows.reduce((sum, session) => sum + Number(session.durationHours ?? 0), 0),
    activities: new Set(sessionRows.map((session) => session.activity).filter(Boolean)).size,
    assignedInventoryItems: inventoryCount,
    schoolProgress,
  };
}

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

export async function getInventoryReadModel(schoolIds: string[] | null) {
  if (isMockDataMode()) {
    const mock = withMockRelations();
    const allowed = schoolIds ? new Set(schoolIds) : null;
    return {
      items: mock.inventoryItems.filter((item) => !allowed || allowed.has(item.schoolId)),
      recentChecks: mock.inventoryChecks.filter((check) => !allowed || allowed.has(check.item.schoolId)),
    };
  }

  const where = schoolIds ? { schoolId: { in: schoolIds } } : {};
  const [items, recentChecks] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      include: { school: true },
      orderBy: [{ school: { name: "asc" } }, { category: "asc" }, { itemName: "asc" }],
    }),
    prisma.inventoryCheck.findMany({
      where: schoolIds ? { item: { schoolId: { in: schoolIds } } } : {},
      include: { item: { include: { school: true } } },
      orderBy: { checkedAt: "desc" },
      take: 10,
    }),
  ]);
  return { items, recentChecks };
}

export async function getSchoolsPortalReadModel(schoolIds: string[] | null, query?: string, status?: string) {
  if (isMockDataMode()) {
    const mock = withMockRelations();
    const allowed = schoolIds ? new Set(schoolIds) : null;
    const schools = mock.schools
      .filter((school) => !allowed || allowed.has(school.id))
      .filter((school) => !status || school.status === status)
      .filter((school) => !query || [school.name, school.address, school.contactPerson].some((value) => value.toLowerCase().includes(query.toLowerCase())));
    return { schools, teachers: [], sections: schools.flatMap((school) => school.sections) };
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
      assignments: { where: { status: "ACTIVE" }, include: { facilitator: true } },
      projects: { select: { id: true } },
      inventoryItems: { select: { id: true, condition: true, remarks: true } },
      reports: { select: { id: true } },
      sessions: { select: { id: true, status: true, durationHours: true, activity: true } },
      schoolYears: true,
      sections: true,
      teacherAssignments: { include: { teacher: true, section: true } },
      remarks: true,
    },
    orderBy: { name: "asc" },
  });
  const teachers = await prisma.teacher.findMany({ orderBy: { fullName: "asc" } });
  return { schools, teachers, sections: schools.flatMap((school) => school.sections) };
}
