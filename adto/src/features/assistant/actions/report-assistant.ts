"use server";

import { requireActiveProfile } from "@/lib/auth";
import { reportAssistantSchema } from "@/features/assistant/schemas/report-assistant";
import { answerReportAssistantQuestion } from "@/features/assistant/services/report-assistant.service";
import { recordAuditLog } from "@/features/security/services/audit-log.service";
import { enforceRateLimit, isRateLimitError } from "@/lib/security/rate-limit";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function askReportAssistantAction(formData: FormData) {
  let actorId: string | null = null;
  let schoolId = "unknown";
  try {
    const profile = await requireActiveProfile();
    actorId = profile.id;
    enforceRateLimit({ key: `report-assistant:${profile.id}`, limit: 12, windowMs: 15 * 60_000 });
    const input = reportAssistantSchema.parse(formDataToObject(formData));
    schoolId = input.schoolId;
    const result = await answerReportAssistantQuestion(profile, input);
    await recordAuditLog({
      actorId: profile.id,
      entityType: "ReportAssistant",
      entityId: input.schoolId,
      action: "REPORT_ASSISTANT_ASKED",
      newValue: {
        reportType: input.reportType,
        schoolYear: input.schoolYear,
        provider: result.provider,
      },
    });
    return { success: true, ...result } as const;
  } catch (error) {
    console.error(error);
    if (actorId) {
      await recordAuditLog({
        actorId,
        entityType: "ReportAssistant",
        entityId: schoolId,
        action: "REPORT_ASSISTANT_FAILED",
        newValue: { reason: error instanceof Error ? error.message : "Assistant request failed" },
      });
    }
    if (isRateLimitError(error)) {
      return { success: false, error: "Too many assistant requests. Try again in a few minutes." } as const;
    }
    return { success: false, error: "The report assistant could not answer this request. Check the selected school and try again." } as const;
  }
}
