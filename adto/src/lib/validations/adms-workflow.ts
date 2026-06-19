import { z } from "zod";

const optionalText = (max = 500) => z.string().trim().max(max).optional().or(z.literal(""));

export const sessionUpdateSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(["NOT_STARTED", "ONGOING", "COMPLETED", "MISSED", "RESCHEDULED", "CANCELLED", "FOR_VERIFICATION"]),
  actualDate: optionalText(32),
  title: z.string().trim().min(1).max(160),
  remarks: optionalText(1000),
});

export const projectUpsertSchema = z.object({
  projectId: z.string().uuid().optional().or(z.literal("")),
  schoolId: z.string().uuid(),
  sessionId: z.string().uuid().optional().or(z.literal("")),
  title: z.string().trim().min(1).max(180),
  term: optionalText(80),
  gradeLevel: optionalText(80),
  section: optionalText(120),
  teacher: optionalText(160),
  projectType: optionalText(120),
  description: optionalText(2000),
  projectUrl: optionalText(500),
  remarks: optionalText(1000),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "SUBMITTED", "CHECKED", "NEEDS_REVISION", "COMPLETED"]),
  submittedAt: optionalText(32),
});

export const inventoryVerificationSchema = z.object({
  itemId: z.string().uuid(),
  condition: z.enum(["NEW", "GOOD", "FAIR", "NEEDS_REPLACEMENT", "LOST"]),
  quantity: z.coerce.number().int().min(0),
  remarks: optionalText(1000),
});
