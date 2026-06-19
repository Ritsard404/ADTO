import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { assertWritableDataMode } from "@/lib/runtime-mode";
import { assertCanAccessSchool, type ActiveProfile } from "@/features/facilitator/services/adms-workflow.service";
import type { ScheduleBulkRowInput, ScheduleDuplicateInput } from "@/features/sessions/schemas/schedule-workflow";

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
