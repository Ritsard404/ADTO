import { z } from "zod";

const optionalText = (max = 500) => z.string().trim().max(max).optional().or(z.literal(""));

export const schoolUpdateSchema = z.object({
  schoolId: z.string().min(1),
  name: z.string().trim().min(1).max(180),
  address: z.string().trim().min(1).max(300),
  contactPerson: z.string().trim().min(1).max(160),
  contactEmail: optionalText(180),
  contactNumber: optionalText(80),
  schoolCode: optionalText(80),
  schoolType: optionalText(80),
  region: optionalText(120),
  division: optionalText(120),
  schoolYear: z.string().trim().min(1).max(40),
  adoptionYear: optionalText(40),
  implementationYear: optionalText(40),
  adoptionType: optionalText(120),
  deployedFormId: optionalText(120),
  formNumber: optionalText(80),
  sourceSchoolId: optionalText(120),
  schoolLogoFileId: optionalText(180),
  team: optionalText(120),
  unitHead: optionalText(160),
  supervisor: optionalText(160),
  supervisorEmail: optionalText(180),
  edtechSpecialist: optionalText(160),
  edtechEmail: optionalText(180),
  gradeLevelAdoption: optionalText(300),
  adoptionRemarks: optionalText(1000),
  addressLine1: optionalText(220),
  addressLine2: optionalText(220),
  scheduleArrangement: optionalText(120),
  codingModality: optionalText(120),
  hardwareAllocation: optionalText(1000),
  softwareAllocation: optionalText(1000),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});

export const schoolYearCreateSchema = z.object({
  schoolId: z.string().min(1),
  label: z.string().trim().min(1).max(40),
  startDate: optionalText(32),
  endDate: optionalText(32),
  status: z.enum(["OPEN", "CLOSED", "ARCHIVED"]),
});

export const sectionBulkCreateSchema = z.object({
  schoolId: z.string().min(1),
  schoolYear: z.string().trim().min(1).max(40),
  gradeLevel: z.string().trim().min(1).max(40),
  sections: z.string().trim().min(1).max(3000),
});

export const teacherCreateSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  department: optionalText(120),
  email: optionalText(180),
  contactNumber: optionalText(80),
  position: optionalText(120),
  employmentStatus: optionalText(80),
});

export const teacherAssignmentCreateSchema = z.object({
  teacherId: z.string().uuid(),
  schoolId: z.string().min(1),
  sectionId: optionalText(80),
  schoolYear: z.string().trim().min(1).max(40),
  gradeLevel: z.string().trim().min(1).max(40),
  subject: z.string().trim().min(1).max(120),
});

export const activityCategoryCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: optionalText(500),
});

export const schoolRemarkCreateSchema = z.object({
  schoolId: z.string().min(1),
  schoolYear: z.string().trim().min(1).max(40),
  period: z.string().trim().min(1).max(80),
  remarkType: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  details: z.string().trim().min(1).max(2000),
  actionItems: optionalText(1500),
});

export const adminSessionCreateSchema = z.object({
  sessionId: z.string().uuid().optional().or(z.literal("")),
  schoolId: z.string().min(1),
  facilitatorId: z.string().uuid(),
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
  status: z.enum(["NOT_STARTED", "ONGOING", "COMPLETED", "MISSED", "RESCHEDULED", "CANCELLED", "FOR_VERIFICATION"]),
});

export const assignmentUpsertSchema = z.object({
  assignmentId: z.string().optional().or(z.literal("")),
  schoolId: z.string().min(1),
  facilitatorId: z.string().uuid(),
  startDate: z.string().trim().min(1),
  endDate: optionalText(32),
  status: z.enum(["ACTIVE", "COMPLETED", "TRANSFERRED"]),
});

export const assignmentEndSchema = z.object({
  assignmentId: z.string().uuid(),
});

export const userUpdateSchema = z.object({
  profileId: z.string().uuid(),
  fullName: z.string().trim().min(1).max(160),
  role: z.enum(["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"]),
  status: z.enum(["PENDING", "ACTIVE", "DISABLED"]),
});

export const userCreateSchema = z.object({
  email: z.string().trim().email().max(180),
  fullName: z.string().trim().min(1).max(160),
  role: z.enum(["ADMIN", "FACILITATOR", "SCHOOL_ADMIN"]),
  status: z.enum(["PENDING", "ACTIVE", "DISABLED"]),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
  confirmPassword: z.string().min(8),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Password and confirmation must match.",
  path: ["confirmPassword"],
});

export const userPasswordUpdateSchema = z.object({
  profileId: z.string().uuid(),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128),
  confirmPassword: z.string().min(8),
}).refine((value) => value.password === value.confirmPassword, {
  message: "Password and confirmation must match.",
  path: ["confirmPassword"],
});

export const schoolMembershipUpsertSchema = z.object({
  schoolId: z.string().min(1),
  profileId: z.string().uuid(),
  roleLabel: z.enum(["PRINCIPAL", "SCHOOL_ADMIN", "DEPARTMENT_HEAD", "FACULTY_LEAD", "COORDINATOR", "VIEWER"]),
  status: z.enum(["INVITED", "ACTIVE", "DISABLED", "ENDED"]),
  invitationStatus: optionalText(80),
  startDate: optionalText(32),
  endDate: optionalText(32),
  notes: optionalText(1000),
});
