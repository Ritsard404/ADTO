import type { SessionStatus, UserRole } from "@/generated/prisma/enums";
import type { CalendarReadModel, CalendarSessionEvent } from "@/features/calendar/dto/calendar-session.dto";
import { getSessionStatusColors } from "@/features/calendar/utils/session-status-colors";
import { withMockRelations } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";

type CalendarProfile = {
  id: string;
  email: string;
  role: UserRole;
};

type CalendarQuery = {
  schoolId?: string;
  facilitatorId?: string;
  gradeLevel?: string;
  section?: string;
  teacher?: string;
  activityType?: string;
  status?: SessionStatus;
  startDate?: string;
  endDate?: string;
};

const MAX_CALENDAR_WINDOW_DAYS = 731;

function dateInputValue(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function parseDateInput(value?: string) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function defaultCalendarDateRange(now = new Date()) {
  const schoolYearStart = now.getMonth() >= 5 ? now.getFullYear() - 1 : now.getFullYear() - 2;
  const start = new Date(schoolYearStart, 5, 1);
  const end = new Date(schoolYearStart + 2, 4, 31);
  return { startDate: dateInputValue(start), endDate: dateInputValue(end) };
}

export function normalizeCalendarQuery(query: CalendarQuery = {}): CalendarQuery {
  const defaults = defaultCalendarDateRange();
  const start = parseDateInput(query.startDate) ?? parseDateInput(defaults.startDate)!;
  let end = parseDateInput(query.endDate) ?? parseDateInput(defaults.endDate)!;

  if (end < start) {
    end = addDays(start, MAX_CALENDAR_WINDOW_DAYS);
  }

  const maxEnd = addDays(start, MAX_CALENDAR_WINDOW_DAYS);
  if (end > maxEnd) {
    end = maxEnd;
  }

  return {
    ...query,
    startDate: dateInputValue(start),
    endDate: dateInputValue(end),
  };
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function sessionEndDate(session: { scheduledDate: Date; startTime?: string | null; durationHours?: unknown }) {
  const start = new Date(session.scheduledDate);
  if (session.startTime) {
    const [hours = "0", minutes = "0"] = session.startTime.split(":");
    start.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0);
  }
  return addMinutes(start, Math.max(30, Math.round(Number(session.durationHours ?? 1) * 60)));
}

function sessionStartDate(session: { scheduledDate: Date; startTime?: string | null }) {
  const start = new Date(session.scheduledDate);
  if (session.startTime) {
    const [hours = "0", minutes = "0"] = session.startTime.split(":");
    start.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0);
  }
  return start;
}

function toEvent(session: {
  id: string;
  title: string;
  schoolId: string;
  school: { name: string };
  facilitatorId: string;
  facilitator: { fullName: string };
  gradeLevel: string;
  section: string;
  scheduledDate: Date;
  startTime?: string | null;
  durationHours?: unknown;
  subject?: string | null;
  teacher?: string | null;
  activity?: string | null;
  delivery?: string | null;
  remarks?: string | null;
  status: SessionStatus;
  media?: Array<unknown>;
  projects?: Array<unknown>;
}, activeSchoolIds: Set<string>, role: UserRole): CalendarSessionEvent {
  const colors = getSessionStatusColors(session.status);
  const start = sessionStartDate(session);
  const end = sessionEndDate(session);
  const shortTitle = `${session.gradeLevel.replace("Grade ", "G")}${session.section ? `-${session.section}` : ""} • ${session.activity || session.title}`;

  return {
    id: session.id,
    title: shortTitle,
    start: start.toISOString(),
    end: end.toISOString(),
    backgroundColor: colors.backgroundColor,
    borderColor: colors.borderColor,
    textColor: colors.textColor,
    extendedProps: {
      schoolId: session.schoolId,
      schoolName: session.school.name,
      gradeLevel: session.gradeLevel,
      section: session.section,
      teacherName: session.teacher ?? undefined,
      facilitatorName: session.facilitator.fullName,
      subject: session.subject ?? undefined,
      activityType: session.activity ?? undefined,
      status: session.status,
      durationMinutes: Math.round(Number(session.durationHours ?? 1) * 60),
      modality: session.delivery ?? undefined,
      remarks: session.remarks ?? undefined,
      evidenceCount: session.media?.length ?? 0,
      projectCount: session.projects?.length ?? 0,
      isReadOnly: role !== "ADMIN" && !activeSchoolIds.has(session.schoolId),
    },
  };
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))).sort();
}

function filterEvents(events: CalendarSessionEvent[], query: CalendarQuery) {
  return events.filter((event) => {
    const props = event.extendedProps;
    return (
      (!query.schoolId || props.schoolId === query.schoolId) &&
      (!query.gradeLevel || props.gradeLevel === query.gradeLevel) &&
      (!query.section || props.section === query.section) &&
      (!query.teacher || props.teacherName === query.teacher) &&
      (!query.activityType || props.activityType === query.activityType) &&
      (!query.status || props.status === query.status) &&
      (!query.startDate || event.start >= new Date(query.startDate).toISOString()) &&
      (!query.endDate || event.start <= new Date(query.endDate).toISOString())
    );
  });
}

export async function getCalendarReadModel(profile: CalendarProfile, query: CalendarQuery = {}): Promise<CalendarReadModel> {
  const normalizedQuery = normalizeCalendarQuery(query);
  if (isMockDataMode()) {
    const mock = withMockRelations();
    const assignments = profile.role === "FACILITATOR" ? mock.assignments.filter((assignment) => assignment.facilitatorId === profile.id) : mock.assignments;
    const assignedSchoolIds = new Set(assignments.map((assignment) => assignment.schoolId));
    const activeSchoolIds = new Set(assignments.filter((assignment) => assignment.status === "ACTIVE").map((assignment) => assignment.schoolId));
    const scopedSessions = mock.sessions.filter((session) => {
      if (profile.role === "ADMIN") return true;
      if (profile.role === "SCHOOL_ADMIN") return session.school.contactEmail?.toLowerCase() === profile.email.toLowerCase();
      return assignedSchoolIds.has(session.schoolId) || session.facilitatorId === profile.id;
    });
    const events = scopedSessions.map((session) => toEvent({ ...session, media: [], projects: mock.projects.filter((project) => project.sessionId === session.id) }, activeSchoolIds, profile.role));

    return {
      role: profile.role,
      canCreateSessions: profile.role === "ADMIN" || profile.role === "FACILITATOR",
      events: filterEvents(events, normalizedQuery),
      filters: {
        schools: mock.schools.filter((school) => profile.role === "ADMIN" || assignedSchoolIds.has(school.id) || school.contactEmail?.toLowerCase() === profile.email.toLowerCase()).map((school) => ({ id: school.id, name: school.name })),
        facilitators: mock.facilitators.map((facilitator) => ({ id: facilitator.id, name: facilitator.fullName })),
        gradeLevels: uniqueSorted(scopedSessions.map((session) => session.gradeLevel)),
        sections: uniqueSorted(scopedSessions.map((session) => session.section)),
        teachers: uniqueSorted(scopedSessions.map((session) => session.teacher)),
        activityTypes: uniqueSorted(scopedSessions.map((session) => session.activity)),
        statuses: Array.from(new Set(scopedSessions.map((session) => session.status))).sort(),
      },
    };
  }

  const activeAssignments =
    profile.role === "FACILITATOR"
      ? await prisma.facilitatorAssignment.findMany({ where: { facilitatorId: profile.id }, select: { schoolId: true, status: true } })
      : [];
  const schoolMemberships =
    profile.role === "SCHOOL_ADMIN"
      ? await prisma.schoolMembership.findMany({ where: { profileId: profile.id, status: "ACTIVE" }, select: { schoolId: true } })
      : [];
  const schoolAdminSchoolIds = schoolMemberships.map((membership) => membership.schoolId);
  const historicalSchoolIds = activeAssignments.map((assignment) => assignment.schoolId);
  const activeSchoolIds = new Set(activeAssignments.filter((assignment) => assignment.status === "ACTIVE").map((assignment) => assignment.schoolId));

  const scopedWhere =
    profile.role === "ADMIN"
      ? {}
      : profile.role === "SCHOOL_ADMIN"
        ? schoolAdminSchoolIds.length
          ? { schoolId: { in: schoolAdminSchoolIds } }
          : { school: { contactEmail: { equals: profile.email, mode: "insensitive" as const } } }
        : { OR: [{ schoolId: { in: historicalSchoolIds } }, { facilitatorId: profile.id }] };

  const sessions = await prisma.aCESession.findMany({
    where: {
      ...scopedWhere,
      schoolId: normalizedQuery.schoolId || undefined,
      facilitatorId: normalizedQuery.facilitatorId || undefined,
      gradeLevel: normalizedQuery.gradeLevel || undefined,
      section: normalizedQuery.section || undefined,
      teacher: normalizedQuery.teacher || undefined,
      activity: normalizedQuery.activityType || undefined,
      status: normalizedQuery.status || undefined,
      scheduledDate: {
        gte: parseDateInput(normalizedQuery.startDate)!,
        lte: parseDateInput(normalizedQuery.endDate)!,
      },
    },
    include: { school: true, facilitator: true, media: { select: { id: true } }, projects: { select: { id: true } } },
    orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
  });

  const schools = await prisma.school.findMany({
    where:
      profile.role === "ADMIN"
        ? {}
        : profile.role === "SCHOOL_ADMIN"
          ? schoolAdminSchoolIds.length
            ? { id: { in: schoolAdminSchoolIds } }
            : { contactEmail: { equals: profile.email, mode: "insensitive" } }
          : { id: { in: historicalSchoolIds } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const facilitators = profile.role === "ADMIN" ? await prisma.profile.findMany({ where: { role: "FACILITATOR" }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true } }) : [];
  const events = sessions.map((session) => toEvent(session, activeSchoolIds, profile.role));

  return {
    role: profile.role,
    canCreateSessions: profile.role === "ADMIN" || profile.role === "FACILITATOR",
    events,
    filters: {
      schools,
      facilitators: facilitators.map((facilitator) => ({ id: facilitator.id, name: facilitator.fullName })),
      gradeLevels: uniqueSorted(sessions.map((session) => session.gradeLevel)),
      sections: uniqueSorted(sessions.map((session) => session.section)),
      teachers: uniqueSorted(sessions.map((session) => session.teacher)),
      activityTypes: uniqueSorted(sessions.map((session) => session.activity)),
      statuses: Array.from(new Set(sessions.map((session) => session.status))).sort(),
    },
  };
}
