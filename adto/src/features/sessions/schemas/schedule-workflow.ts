import { z } from "zod";

const optionalText = (max = 500) => z.string().trim().max(max).optional().or(z.literal(""));

export const scheduleDuplicateSchema = z.object({
  schoolId: z.string().uuid(),
  sourceStartDate: z.string().trim().min(1),
  targetStartDate: z.string().trim().min(1),
  mode: z.enum(["week", "day"]),
  gradeLevel: optionalText(80),
  section: optionalText(120),
  facilitatorId: optionalText(80),
  sourceDay: optionalText(16),
  topicMode: z.enum(["copy", "clear", "increment"]).default("copy"),
  allowConflicts: z.enum(["true", "false"]).default("false"),
});

export const scheduleBulkRowSchema = z.object({
  schoolId: z.string().uuid(),
  facilitatorId: optionalText(80),
  scheduledDate: z.string().trim().min(1),
  startTime: optionalText(20),
  durationHours: z.coerce.number().min(0).max(12).default(1),
  gradeLevel: z.string().trim().min(1).max(80),
  section: z.string().trim().min(1).max(120),
  subject: optionalText(120),
  teacher: optionalText(160),
  activity: optionalText(120),
  title: optionalText(160),
  delivery: optionalText(120),
  remarks: optionalText(1000),
});

export const scheduleBulkSaveSchema = z.object({
  rowsJson: z.string().min(2),
  allowConflicts: z.enum(["true", "false"]).default("false"),
});

export type ScheduleDuplicateInput = z.infer<typeof scheduleDuplicateSchema>;
export type ScheduleBulkRowInput = z.infer<typeof scheduleBulkRowSchema>;
