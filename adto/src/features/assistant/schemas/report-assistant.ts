import { z } from "zod";

export const reportAssistantSchema = z.object({
  schoolId: z.string().min(1),
  schoolYear: z.string().trim().min(1).max(40),
  reportType: z.enum(["dashboard", "mid-year", "year-end"]),
  question: z.string().trim().min(1).max(1200),
});
