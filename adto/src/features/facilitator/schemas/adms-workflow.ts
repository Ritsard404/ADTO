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
  students: optionalText(500),
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
  issuedQuantity: z.coerce.number().int().min(0).optional(),
  totalQuantity: z.coerce.number().int().min(0).optional(),
  borrowedStatus: optionalText(120),
  completenessStatus: optionalText(120),
  facilitatorSignOff: optionalText(160),
  remarks: optionalText(1000),
});

export const facilitatorSessionCreateSchema = z.object({
  schoolId: z.string().min(1),
  title: z.string().trim().min(1).max(160),
  gradeLevel: z.string().trim().min(1).max(40),
  section: z.string().trim().min(1).max(120),
  sessionNumber: z.coerce.number().int().min(1),
  scheduledDate: z.string().trim().min(1),
  startTime: optionalText(20),
  durationHours: z.coerce.number().min(0).max(12).optional(),
  subject: optionalText(120),
  teacher: optionalText(160),
  activity: optionalText(120),
  delivery: optionalText(120),
  remarks: optionalText(1000),
});

export const facilitatorSectionUpsertSchema = z.object({
  sectionId: z.string().uuid().optional().or(z.literal("")),
  schoolId: z.string().min(1),
  schoolYear: z.string().trim().min(1).max(40),
  gradeLevel: z.string().trim().min(1).max(40),
  sectionName: z.string().trim().min(1).max(120),
  adviserName: optionalText(160),
  maleStudents: z.coerce.number().int().min(0),
  femaleStudents: z.coerce.number().int().min(0),
  isActive: z.enum(["true", "false"]).default("true"),
});

export const facilitatorTeacherCreateSchema = z.object({
  schoolId: z.string().min(1),
  fullName: z.string().trim().min(1).max(160),
  department: optionalText(120),
  email: optionalText(180),
  contactNumber: optionalText(80),
  position: optionalText(120),
  employmentStatus: optionalText(80),
  gradeLevel: optionalText(40),
  sectionId: optionalText(80),
  schoolYear: optionalText(40),
  subject: optionalText(120),
});

export const facilitatorMonthlyReportSchema = z.object({
  schoolId: z.string().min(1),
  schoolYear: z.string().trim().min(1).max(40),
  title: z.string().trim().min(1).max(160),
  accomplishments: z.string().trim().min(1).max(2000),
  challenges: optionalText(2000),
  recommendations: optionalText(2000),
  schoolUpdates: optionalText(2000),
  quickInsights: optionalText(2000),
});

export const facilitatorSchoolRemarkSchema = z.object({
  schoolId: z.string().min(1),
  schoolYear: z.string().trim().min(1).max(40),
  period: z.string().trim().min(1).max(80),
  remarkType: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  details: z.string().trim().min(1).max(2000),
  actionItems: optionalText(1500),
});

export const facilitatorEvidenceLinkSchema = z.object({
  schoolId: z.string().min(1),
  sessionId: z.string().uuid().optional().or(z.literal("")),
  projectId: z.string().uuid().optional().or(z.literal("")),
  fileName: z.string().trim().min(1).max(180),
  fileUrl: z.string().trim().url().max(700),
  fileType: z.string().trim().min(1).max(80),
  description: optionalText(1000),
});
