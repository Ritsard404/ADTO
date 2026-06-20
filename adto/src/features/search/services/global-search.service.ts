import { navigationItems } from "@/constants/navigation";
import { getAccessibleSchoolIds, type ActiveProfile } from "@/features/facilitator/services/adms-workflow.service";
import { prisma } from "@/lib/prisma";

export type GlobalSearchCategory =
  | "Navigation"
  | "Quick Actions"
  | "Schools"
  | "Facilitators"
  | "Teachers"
  | "Sessions"
  | "Calendar"
  | "Projects"
  | "Inventory"
  | "Reports"
  | "Media"
  | "Help";

export interface GlobalSearchResult {
  id: string;
  category: GlobalSearchCategory;
  title: string;
  subtitle: string;
  href: string;
  matchedFields?: string[];
  status?: string;
  date?: string;
  school?: string;
  actionLabel?: string;
}

export interface GlobalSearchQuery {
  query?: string;
  category?: GlobalSearchCategory;
  limit?: number;
}

const quickActions: Array<GlobalSearchResult & { roles: ActiveProfile["role"][] }> = [
  { id: "action-create-session", category: "Quick Actions", title: "Create session", subtitle: "Open ACE session entry", href: "/sessions", actionLabel: "Create", roles: ["ADMIN", "FACILITATOR"] },
  { id: "action-schedule-workbench", category: "Quick Actions", title: "Open schedule workbench", subtitle: "Paste or duplicate session schedules", href: "/sessions", actionLabel: "Schedule", roles: ["ADMIN", "FACILITATOR"] },
  { id: "action-add-evidence", category: "Quick Actions", title: "Add evidence", subtitle: "Open media uploads", href: "/media", actionLabel: "Upload", roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
  { id: "action-report-preview", category: "Quick Actions", title: "Open report preview", subtitle: "Review school report outputs", href: "/reports", actionLabel: "Preview", roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
  { id: "action-verify-inventory", category: "Quick Actions", title: "Verify inventory", subtitle: "Review deployed equipment", href: "/inventory", actionLabel: "Verify", roles: ["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"] },
  { id: "action-manage-school-access", category: "Quick Actions", title: "Manage school access", subtitle: "Open settings and school memberships", href: "/settings", actionLabel: "Manage", roles: ["ADMIN"] },
];

const helpResults: GlobalSearchResult[] = [
  { id: "help-navigation", category: "Help", title: "Navigation", subtitle: "Sidebar, bottom navigation, and global search.", href: "/help", actionLabel: "Read" },
  { id: "help-facilitator-workspace", category: "Help", title: "Facilitator workspace", subtitle: "Assigned-school operations, schedules, projects, reports, and evidence.", href: "/help", actionLabel: "Read" },
  { id: "help-facilitator-workbook-tools", category: "Help", title: "Facilitator workbook tools", subtitle: "Monthly QuickView, project register, inventory, evidence, and report preview.", href: "/help", actionLabel: "Read" },
  { id: "help-admin-workbook-governance", category: "Help", title: "Admin workbook governance", subtitle: "Cross-school workbook health, import preview, and quality queues.", href: "/help", actionLabel: "Read" },
  { id: "help-school-admin-portal", category: "Help", title: "School admin portal", subtitle: "School-scoped access for principals and stakeholders.", href: "/help", actionLabel: "Read" },
  { id: "help-assignments", category: "Help", title: "Assignments", subtitle: "Facilitator assignment history and reassignment.", href: "/help", actionLabel: "Read" },
  { id: "help-calendar", category: "Help", title: "Calendar", subtitle: "Shared school calendar filters and views.", href: "/help", actionLabel: "Read" },
  { id: "help-schedules", category: "Help", title: "Schedules", subtitle: "Duplicate schedules, templates, and paste from Excel.", href: "/help", actionLabel: "Read" },
  { id: "help-passwords", category: "Help", title: "Passwords", subtitle: "Account password rules and admin resets.", href: "/help", actionLabel: "Read" },
];

function matchesQuery(result: Pick<GlobalSearchResult, "title" | "subtitle">, query: string) {
  const normalized = query.toLowerCase();
  return `${result.title} ${result.subtitle}`.toLowerCase().includes(normalized);
}

function formatDate(date?: Date | null) {
  return date ? date.toISOString().slice(0, 10) : undefined;
}

function byCategory(category?: GlobalSearchCategory) {
  return (result: GlobalSearchResult) => !category || result.category === category;
}

export async function searchGlobal(profile: ActiveProfile, input: string | GlobalSearchQuery): Promise<GlobalSearchResult[]> {
  const q = (typeof input === "string" ? input : input.query ?? "").trim();
  const category = typeof input === "string" ? undefined : input.category;
  const limit = typeof input === "string" ? 30 : input.limit ?? 30;

  const roleQuickActions = quickActions
    .filter((action) => action.roles.includes(profile.role))
    .map(
      (action): GlobalSearchResult => ({
        id: action.id,
        category: action.category,
        title: action.title,
        subtitle: action.subtitle,
        href: action.href,
        actionLabel: action.actionLabel,
      }),
    )
    .filter((action) => !q || matchesQuery(action, q));

  const roleHelpResults = helpResults.filter((result) => !q || matchesQuery(result, q));

  if (q.length < 2) {
    const navigation = navigationItems
      .filter((item) => item.roles.includes(profile.role))
      .slice(0, 8)
      .map((item) => ({
        id: `nav-${item.href}-${item.title}`,
        category: "Navigation",
        title: item.title,
        subtitle: "Open workspace page",
        href: item.href,
        actionLabel: "Open",
      } satisfies GlobalSearchResult));

    return [...roleQuickActions, ...navigation, ...roleHelpResults.slice(0, 4)].filter(byCategory(category)).slice(0, limit);
  }

  const schoolIds = await getAccessibleSchoolIds(profile);
  const schoolWhere = schoolIds ? { schoolId: { in: schoolIds } } : {};
  const schoolIdWhere = schoolIds ? { id: { in: schoolIds } } : {};

  const [schools, facilitators, teacherAssignments, sessions, projects, inventoryItems, reports, mediaUploads] = await Promise.all([
    prisma.school.findMany({
      where: {
        ...schoolIdWhere,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { schoolCode: { contains: q, mode: "insensitive" } },
          { region: { contains: q, mode: "insensitive" } },
          { division: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, schoolCode: true, status: true, region: true },
      take: 6,
    }),
    profile.role === "ADMIN"
      ? prisma.profile.findMany({
          where: { role: "FACILITATOR", fullName: { contains: q, mode: "insensitive" } },
          select: { id: true, fullName: true, email: true },
          take: 5,
        })
      : Promise.resolve([]),
    prisma.teacherAssignment.findMany({
      where: {
        ...schoolWhere,
        OR: [
          { gradeLevel: { contains: q, mode: "insensitive" } },
          { subject: { contains: q, mode: "insensitive" } },
          { teacher: { fullName: { contains: q, mode: "insensitive" } } },
          { teacher: { department: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: { teacher: { select: { id: true, fullName: true, department: true } }, school: { select: { id: true, name: true } } },
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
    prisma.inventoryItem.findMany({
      where: {
        ...schoolWhere,
        OR: [
          { itemName: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
          { assetNumber: { contains: q, mode: "insensitive" } },
          { serialNumber: { contains: q, mode: "insensitive" } },
          { deviceType: { contains: q, mode: "insensitive" } },
        ],
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
    prisma.mediaUpload.findMany({
      where: {
        ...schoolWhere,
        OR: [
          { fileName: { contains: q, mode: "insensitive" } },
          { fileType: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { school: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const navResults = navigationItems
    .filter((item) => item.roles.includes(profile.role) && item.title.toLowerCase().includes(q.toLowerCase()))
    .map((item) => ({ id: `nav-${item.href}-${item.title}`, category: "Navigation", title: item.title, subtitle: "Open workspace page", href: item.href, actionLabel: "Open" } satisfies GlobalSearchResult));

  const results: GlobalSearchResult[] = [
    ...roleQuickActions,
    ...navResults,
    ...roleHelpResults,
    ...schools.map((school): GlobalSearchResult => ({
      id: `school-${school.id}`,
      category: "Schools",
      title: school.name,
      subtitle: school.schoolCode ?? school.region ?? "School record",
      href: `/schools?q=${encodeURIComponent(school.name)}`,
      matchedFields: ["name", "schoolCode", "region", "division"],
      status: school.status,
      actionLabel: "Open",
    })),
    ...facilitators.map((facilitator): GlobalSearchResult => ({
      id: `facilitator-${facilitator.id}`,
      category: "Facilitators",
      title: facilitator.fullName,
      subtitle: facilitator.email,
      href: "/facilitators",
      matchedFields: ["fullName"],
      actionLabel: "Open",
    })),
    ...teacherAssignments.map((assignment): GlobalSearchResult => ({
      id: `teacher-${assignment.id}`,
      category: "Teachers",
      title: assignment.teacher.fullName,
      subtitle: `${assignment.school.name} | ${assignment.gradeLevel} ${assignment.subject}`,
      href: `/schools?q=${encodeURIComponent(assignment.school.name)}`,
      matchedFields: ["fullName", "department", "subject", "gradeLevel"],
      school: assignment.school.name,
      actionLabel: "Open",
    })),
    ...sessions.map((session): GlobalSearchResult => ({
      id: `session-${session.id}`,
      category: "Sessions",
      title: session.title,
      subtitle: `${session.school.name} | ${session.gradeLevel} ${session.section}`,
      href: `/sessions?schoolId=${session.schoolId}`,
      matchedFields: ["title", "activity", "remarks", "teacher"],
      status: session.status,
      date: formatDate(session.scheduledDate),
      school: session.school.name,
      actionLabel: "Open",
    })),
    ...sessions.map((session): GlobalSearchResult => ({
      id: `calendar-${session.id}`,
      category: "Calendar",
      title: session.title,
      subtitle: `${session.school.name} | ${formatDate(session.scheduledDate) ?? "Scheduled session"}`,
      href: `/calendar?schoolId=${session.schoolId}&startDate=${formatDate(session.scheduledDate) ?? ""}`,
      status: session.status,
      date: formatDate(session.scheduledDate),
      school: session.school.name,
      actionLabel: "View",
    })),
    ...projects.map((project): GlobalSearchResult => ({
      id: `project-${project.id}`,
      category: "Projects",
      title: project.title,
      subtitle: `${project.school.name} | ${project.projectType ?? "Project"}`,
      href: profile.role === "FACILITATOR" ? "/facilitator/projects" : `/reports?schoolId=${project.schoolId}`,
      matchedFields: ["title", "projectType"],
      status: project.status,
      date: formatDate(project.submittedAt),
      school: project.school.name,
      actionLabel: "Open",
    })),
    ...inventoryItems.map((item): GlobalSearchResult => ({
      id: `inventory-${item.id}`,
      category: "Inventory",
      title: item.itemName,
      subtitle: `${item.school.name} | ${item.category}`,
      href: `/inventory?schoolId=${item.schoolId}`,
      matchedFields: ["itemName", "category", "assetNumber", "serialNumber", "deviceType"],
      status: item.assetStatus,
      date: formatDate(item.lastCheckedAt),
      school: item.school.name,
      actionLabel: "Review",
    })),
    ...reports.map((report): GlobalSearchResult => ({
      id: `report-${report.id}`,
      category: "Reports",
      title: report.title,
      subtitle: `${report.school.name} | ${report.reportType}`,
      href: `/reports?schoolId=${report.schoolId}`,
      matchedFields: ["title", "reportType"],
      status: report.status,
      date: formatDate(report.submittedAt),
      school: report.school.name,
      actionLabel: "Open",
    })),
    ...mediaUploads.map((media): GlobalSearchResult => ({
      id: `media-${media.id}`,
      category: "Media",
      title: media.fileName,
      subtitle: `${media.school.name} | ${media.fileType}`,
      href: `/media?schoolId=${media.schoolId}`,
      matchedFields: ["fileName", "fileType", "description"],
      date: formatDate(media.createdAt),
      school: media.school.name,
      actionLabel: "Open",
    })),
  ];

  return results.filter(byCategory(category)).slice(0, limit);
}
