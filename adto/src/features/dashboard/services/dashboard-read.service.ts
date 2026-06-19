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
