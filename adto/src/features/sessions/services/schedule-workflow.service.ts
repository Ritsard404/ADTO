import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { assertWritableDataMode, isMockDataMode } from "@/lib/runtime-mode";
import { assertCanAccessSchool, type ActiveProfile } from "@/features/facilitator/services/adms-workflow.service";
import type {
  ScheduleBulkRowInput,
  ScheduleDuplicateInput,
  ScheduleTemplateInput,
  ScheduleTemplatePreviewInput,
} from "@/features/sessions/schemas/schedule-workflow";

export type SchedulePreviewStatus = "ready" | "duplicate" | "conflict" | "missing";

export type SchedulePreviewRow = {
  sourceSessionId?: string;
  schoolId: string;
  facilitatorId: string;
  scheduledDate: string;
  startTime: string;
  durationHours: number;
  gradeLevel: string;
  section: string;
  subject: string;
  teacher: string;
  activity: string;
  title: string;
  delivery: string;
  remarks: string;
  sessionNumber: number;
  status: SchedulePreviewStatus;
  warnings: string[];
};

export type ScheduleTemplateOption = {
  id: string;
  schoolId: string;
  name: string;
  dayOfWeek: number;
  startTime: string;
  durationHours: number;
  gradeLevel: string;
  section: string;
  subject: string;
  teacher: string;
  facilitatorId: string;
  delivery: string;
  activity: string;
  defaultTopic: string;
  defaultRemarks: string;
};

type ExistingSession = {
  id: string;
  schoolId: string;
  facilitatorId: string;
  scheduledDate: Date;
  startTime: string | null;
  durationHours: Prisma.Decimal | number | null;
  gradeLevel: string;
  section: string;
  subject: string | null;
  teacher: string | null;
  activity: string | null;
  delivery: string | null;
  title: string;
};

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function eachDateInRange(start: Date, end: Date) {
  const dates: Date[] = [];
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    dates.push(new Date(cursor));
  }
  return dates;
}

function minutesFromTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const [hours, minutes] = value.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

function sessionEndMinutes(startTime: string, durationHours: number) {
  const start = minutesFromTime(startTime);
  return start === null ? null : start + Math.round(durationHours * 60);
}

function overlaps(aStart: string, aDuration: number, bStart: string | null, bDuration: Prisma.Decimal | number | null) {
  const startA = minutesFromTime(aStart);
  const endA = sessionEndMinutes(aStart, aDuration);
  const startB = minutesFromTime(bStart);
  const endB = startB === null ? null : startB + Math.round(Number(bDuration ?? 1) * 60);
  if (startA === null || endA === null || startB === null || endB === null) {
    return false;
  }
  return startA < endB && startB < endA;
}

function incrementSessionText(value: string) {
  return value.replace(/session\s+(\d+)/i, (match, number) => match.replace(number, String(Number(number) + 1)));
}

async function assertScheduleAccess(profile: ActiveProfile, schoolId: string) {
  if (profile.role === "SCHOOL_ADMIN") {
    throw new Error("School admins can view schedules but cannot modify ACE session logs.");
  }
  await assertCanAccessSchool(profile, schoolId);
}

function mapTemplate(template: {
  id: string;
  schoolId: string;
  name: string;
  dayOfWeek: number;
  startTime: string;
  durationHours: Prisma.Decimal | number;
  gradeLevel: string;
  section: string;
  subject: string | null;
  teacher: string | null;
  facilitatorId: string | null;
  delivery: string | null;
  activity: string | null;
  defaultTopic: string | null;
  defaultRemarks: string | null;
}): ScheduleTemplateOption {
  return {
    id: template.id,
    schoolId: template.schoolId,
    name: template.name,
    dayOfWeek: template.dayOfWeek,
    startTime: template.startTime,
    durationHours: Number(template.durationHours),
    gradeLevel: template.gradeLevel,
    section: template.section,
    subject: template.subject ?? "",
    teacher: template.teacher ?? "",
    facilitatorId: template.facilitatorId ?? "",
    delivery: template.delivery ?? "",
    activity: template.activity ?? "",
    defaultTopic: template.defaultTopic ?? "",
    defaultRemarks: template.defaultRemarks ?? "",
  };
}

function normalizePreviewRow(row: SchedulePreviewRow, existing: ExistingSession[]) {
  const warnings: string[] = [];
  if (!row.schoolId || !row.facilitatorId || !row.scheduledDate || !row.gradeLevel || !row.section) {
    warnings.push("Missing required school, facilitator, date, grade, or section.");
  }

  const sameDay = existing.filter((session) => dateOnly(session.scheduledDate) === row.scheduledDate && session.schoolId === row.schoolId);
  const duplicate = sameDay.some(
    (session) =>
      session.section.toLowerCase() === row.section.toLowerCase() &&
      (session.startTime ?? "") === row.startTime &&
      session.gradeLevel.toLowerCase() === row.gradeLevel.toLowerCase(),
  );
  if (duplicate) {
    warnings.push("Possible duplicate: same school, grade, section, date, and start time.");
  }

  const sectionConflict = sameDay.some((session) => session.section.toLowerCase() === row.section.toLowerCase() && overlaps(row.startTime, row.durationHours, session.startTime, session.durationHours));
  if (sectionConflict) {
    warnings.push("Section conflict: overlapping session for the same section.");
  }

  const facilitatorConflict = sameDay.some((session) => session.facilitatorId === row.facilitatorId && overlaps(row.startTime, row.durationHours, session.startTime, session.durationHours));
  if (facilitatorConflict) {
    warnings.push("Facilitator conflict: overlapping session for the same facilitator.");
  }

  const roomConflict = row.delivery
    ? sameDay.some((session) => (session.delivery ?? "").toLowerCase() === row.delivery.toLowerCase() && overlaps(row.startTime, row.durationHours, session.startTime, session.durationHours))
    : false;
  if (roomConflict) {
    warnings.push("Venue conflict: overlapping session in the same venue or modality.");
  }

  const status: SchedulePreviewStatus = warnings.some((warning) => warning.startsWith("Missing"))
    ? "missing"
    : duplicate
      ? "duplicate"
      : warnings.length
        ? "conflict"
        : "ready";

  return { ...row, warnings, status };
}

export async function buildDuplicateSchedulePreview(profile: ActiveProfile, input: ScheduleDuplicateInput) {
  await assertScheduleAccess(profile, input.schoolId);

  const sourceStart = parseDate(input.sourceStartDate);
  const sourceEnd = input.mode === "week" ? addDays(sourceStart, 6) : sourceStart;
  const targetStart = parseDate(input.targetStartDate);
  const targetEnd = input.mode === "week" ? addDays(targetStart, 6) : targetStart;

  const sourceSessions = await prisma.aCESession.findMany({
    where: {
      schoolId: input.schoolId,
      scheduledDate: { gte: sourceStart, lte: sourceEnd },
      gradeLevel: input.gradeLevel || undefined,
      section: input.section || undefined,
      facilitatorId: input.facilitatorId || undefined,
    },
    orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }, { gradeLevel: "asc" }, { section: "asc" }],
  });

  const filteredSource = input.sourceDay
    ? sourceSessions.filter((session) => session.scheduledDate.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" }) === input.sourceDay)
    : sourceSessions;

  const existingTarget = await prisma.aCESession.findMany({
    where: { schoolId: input.schoolId, scheduledDate: { gte: targetStart, lte: targetEnd } },
  });

  return filteredSource.map((session, index) => {
    const offset = input.mode === "week" ? Math.round((session.scheduledDate.getTime() - sourceStart.getTime()) / 86_400_000) : 0;
    const targetDate = addDays(targetStart, offset);
    const activity = input.topicMode === "clear" ? "" : input.topicMode === "increment" ? incrementSessionText(session.activity ?? "") : (session.activity ?? "");
    const title = input.topicMode === "clear" ? "ACE Session" : input.topicMode === "increment" ? incrementSessionText(session.title) : session.title;
    return normalizePreviewRow(
      {
        sourceSessionId: session.id,
        schoolId: session.schoolId,
        facilitatorId: session.facilitatorId,
        scheduledDate: dateOnly(targetDate),
        startTime: session.startTime ?? "",
        durationHours: Number(session.durationHours ?? 1),
        gradeLevel: session.gradeLevel,
        section: session.section,
        subject: session.subject ?? "",
        teacher: session.teacher ?? "",
        activity,
        title,
        delivery: session.delivery ?? "",
        remarks: "",
        sessionNumber: session.sessionNumber + index + 1,
        status: "ready",
        warnings: [],
      },
      existingTarget,
    );
  });
}

export async function buildBulkSchedulePreview(profile: ActiveProfile, rows: ScheduleBulkRowInput[]) {
  const schoolIds = [...new Set(rows.map((row) => row.schoolId))];
  for (const schoolId of schoolIds) {
    await assertScheduleAccess(profile, schoolId);
  }

  const dates = rows.map((row) => parseDate(row.scheduledDate));
  const minDate = new Date(Math.min(...dates.map((date) => date.getTime())));
  const maxDate = new Date(Math.max(...dates.map((date) => date.getTime())));
  const existing = await prisma.aCESession.findMany({
    where: { schoolId: { in: schoolIds }, scheduledDate: { gte: minDate, lte: maxDate } },
  });

  return rows.map((row, index) =>
    normalizePreviewRow(
      {
        schoolId: row.schoolId,
        facilitatorId: row.facilitatorId || profile.id,
        scheduledDate: row.scheduledDate,
        startTime: row.startTime || "",
        durationHours: Number(row.durationHours || 1),
        gradeLevel: row.gradeLevel,
        section: row.section,
        subject: row.subject || "",
        teacher: row.teacher || "",
        activity: row.activity || "Coding Session",
        title: row.title || row.activity || "ACE Session",
        delivery: row.delivery || "",
        remarks: row.remarks || "",
        sessionNumber: index + 1,
        status: "ready",
        warnings: [],
      },
      existing,
    ),
  );
}

export async function getScheduleTemplates(profile: ActiveProfile, schoolIds: string[] | null): Promise<ScheduleTemplateOption[]> {
  if (profile.role === "SCHOOL_ADMIN" || isMockDataMode()) {
    return [];
  }

  const templates = await prisma.scheduleTemplate.findMany({
    where: {
      isActive: true,
      schoolId: schoolIds ? { in: schoolIds } : undefined,
    },
    orderBy: [{ name: "asc" }],
  });

  return templates.map(mapTemplate);
}

export async function createScheduleTemplate(profile: ActiveProfile, input: ScheduleTemplateInput): Promise<ScheduleTemplateOption> {
  assertWritableDataMode();
  await assertScheduleAccess(profile, input.schoolId);

  const template = await prisma.scheduleTemplate.upsert({
    where: { schoolId_name: { schoolId: input.schoolId, name: input.name } },
    update: {
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      durationHours: input.durationHours,
      gradeLevel: input.gradeLevel,
      section: input.section,
      subject: input.subject || null,
      teacher: input.teacher || null,
      facilitatorId: input.facilitatorId || null,
      delivery: input.delivery || null,
      activity: input.activity || null,
      defaultTopic: input.defaultTopic || null,
      defaultRemarks: input.defaultRemarks || null,
      isActive: true,
    },
    create: {
      schoolId: input.schoolId,
      name: input.name,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      durationHours: input.durationHours,
      gradeLevel: input.gradeLevel,
      section: input.section,
      subject: input.subject || null,
      teacher: input.teacher || null,
      facilitatorId: input.facilitatorId || null,
      delivery: input.delivery || null,
      activity: input.activity || null,
      defaultTopic: input.defaultTopic || null,
      defaultRemarks: input.defaultRemarks || null,
      createdById: profile.id,
    },
  });

  return mapTemplate(template);
}

export async function buildTemplateSchedulePreview(profile: ActiveProfile, input: ScheduleTemplatePreviewInput) {
  const template = await prisma.scheduleTemplate.findUnique({ where: { id: input.templateId } });
  if (!template || !template.isActive) {
    throw new Error("Resolve schedule template before generating sessions.");
  }

  await assertScheduleAccess(profile, template.schoolId);
  if (!template.facilitatorId && profile.role === "ADMIN") {
    throw new Error("Resolve the template facilitator before generating sessions.");
  }

  const start = parseDate(input.startDate);
  const end = parseDate(input.endDate);
  if (end < start) {
    throw new Error("Resolve the date range before generating sessions.");
  }

  const excluded = new Set(
    input.excludedDates
      ? input.excludedDates.split(/[\s,]+/).map((date) => date.trim()).filter(Boolean)
      : [],
  );
  const dates = eachDateInRange(start, end).filter((date) => date.getUTCDay() === template.dayOfWeek && !excluded.has(dateOnly(date)));
  const existing = await prisma.aCESession.findMany({
    where: { schoolId: template.schoolId, scheduledDate: { gte: start, lte: end } },
  });

  return dates.map((date, index) =>
    normalizePreviewRow(
      {
        schoolId: template.schoolId,
        facilitatorId: template.facilitatorId || profile.id,
        scheduledDate: dateOnly(date),
        startTime: template.startTime,
        durationHours: Number(template.durationHours),
        gradeLevel: template.gradeLevel,
        section: template.section,
        subject: template.subject ?? "",
        teacher: template.teacher ?? "",
        activity: template.activity ?? "Coding Session",
        title: template.defaultTopic ?? template.activity ?? "ACE Session",
        delivery: template.delivery ?? "",
        remarks: template.defaultRemarks ?? "",
        sessionNumber: index + 1,
        status: "ready",
        warnings: [],
      },
      existing,
    ),
  );
}

export async function saveScheduleRows(profile: ActiveProfile, rows: SchedulePreviewRow[], allowConflicts: boolean) {
  assertWritableDataMode();
  for (const row of rows) {
    await assertScheduleAccess(profile, row.schoolId);
  }

  const blocked = rows.filter((row) => row.status !== "ready");
  if (blocked.length && !(allowConflicts && profile.role === "ADMIN")) {
    throw new Error("Resolve duplicate or conflicting rows before saving.");
  }

  const rowsToCreate = allowConflicts && profile.role === "ADMIN" ? rows.filter((row) => row.status !== "missing") : rows.filter((row) => row.status === "ready");
  await prisma.$transaction(
    rowsToCreate.map((row) =>
      prisma.aCESession.create({
        data: {
          schoolId: row.schoolId,
          facilitatorId: row.facilitatorId,
          title: row.title || row.activity || "ACE Session",
          gradeLevel: row.gradeLevel,
          section: row.section,
          sessionNumber: row.sessionNumber,
          scheduledDate: parseDate(row.scheduledDate),
          startTime: row.startTime || null,
          durationHours: row.durationHours,
          subject: row.subject || null,
          teacher: row.teacher || null,
          activity: row.activity || null,
          delivery: row.delivery || null,
          remarks: row.remarks || null,
          status: "NOT_STARTED",
          actualDate: null,
          completion: null,
        },
      }),
    ),
  );

  return { created: rowsToCreate.length, skipped: rows.length - rowsToCreate.length };
}
