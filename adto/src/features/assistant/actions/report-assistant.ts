"use server";

import { requireActiveProfile } from "@/lib/auth";
import { reportAssistantSchema } from "@/features/assistant/schemas/report-assistant";
import { answerReportAssistantQuestion } from "@/features/assistant/services/report-assistant.service";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function askReportAssistantAction(formData: FormData) {
  try {
    const profile = await requireActiveProfile();
    const input = reportAssistantSchema.parse(formDataToObject(formData));
    const result = await answerReportAssistantQuestion(profile, input);
    return { success: true, ...result } as const;
  } catch (error) {
    console.error(error);
    return { success: false, error: "The report assistant could not answer this request. Check the selected school and try again." } as const;
  }
}
