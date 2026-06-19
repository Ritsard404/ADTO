import { z } from "zod";

const optionalText = (max = 500) => z.string().trim().max(max).optional().or(z.literal(""));

export const schoolUpdateSchema = z.object({
  schoolId: z.string().min(1),
  name: z.string().trim().min(1).max(180),
  address: z.string().trim().min(1).max(300),
  contactPerson: z.string().trim().min(1).max(160),
  contactEmail: optionalText(180),
  schoolYear: z.string().trim().min(1).max(40),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]),
});

export const assignmentUpsertSchema = z.object({
  assignmentId: z.string().optional().or(z.literal("")),
  schoolId: z.string().min(1),
  facilitatorId: z.string().uuid(),
  startDate: z.string().trim().min(1),
  endDate: optionalText(32),
  status: z.enum(["ACTIVE", "PAUSED", "ENDED"]),
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
});
