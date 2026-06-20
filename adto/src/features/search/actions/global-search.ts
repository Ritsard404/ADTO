"use server";

import { requireActiveProfile } from "@/lib/auth";
import { searchGlobal } from "@/features/search/services/global-search.service";

export async function globalSearchAction(query: string) {
  const profile = await requireActiveProfile();
  try {
    return { success: true, results: await searchGlobal(profile, query) } as const;
  } catch (error) {
    console.error(error);
    return { success: false, error: "Search is unavailable right now.", results: [] } as const;
  }
}
