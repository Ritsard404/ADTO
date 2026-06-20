"use server";

import { z } from "zod";
import { requireActiveProfile } from "@/lib/auth";
import { searchGlobal } from "@/features/search/services/global-search.service";

const globalSearchSchema = z.object({
  query: z.string().trim().max(120).optional().default(""),
  category: z
    .enum(["Navigation", "Quick Actions", "Schools", "Facilitators", "Teachers", "Sessions", "Calendar", "Projects", "Inventory", "Reports", "Media", "Help"])
    .optional(),
  limit: z.number().int().min(1).max(40).optional().default(30),
});

export async function globalSearchAction(input: string | { query?: string; category?: string; limit?: number }) {
  const profile = await requireActiveProfile();
  try {
    const parsed = globalSearchSchema.parse(typeof input === "string" ? { query: input } : input);
    return { success: true, results: await searchGlobal(profile, parsed) } as const;
  } catch (error) {
    if (!(error instanceof z.ZodError)) {
      console.error(error);
    }
    return { success: false, error: "Search is unavailable right now.", results: [] } as const;
  }
}
