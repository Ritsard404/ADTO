"use server";

import { revalidatePath } from "next/cache";
import { requireActiveProfile } from "@/lib/auth";
import {
  updateSessionForProfile,
  upsertProjectForProfile,
  verifyInventoryForProfile,
} from "@/lib/services/adms-workflow.service";
import { inventoryVerificationSchema, projectUpsertSchema, sessionUpdateSchema } from "@/lib/validations/adms-workflow";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function updateSessionAction(formData: FormData) {
  const profile = await requireActiveProfile();
  const input = sessionUpdateSchema.parse(formDataToObject(formData));

  await updateSessionForProfile(profile, input);
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
}

export async function upsertProjectAction(formData: FormData) {
  const profile = await requireActiveProfile();
  const input = projectUpsertSchema.parse(formDataToObject(formData));

  await upsertProjectForProfile(profile, {
    ...input,
    projectId: input.projectId || undefined,
    sessionId: input.sessionId || undefined,
  });
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
}

export async function verifyInventoryAction(formData: FormData) {
  const profile = await requireActiveProfile();
  const input = inventoryVerificationSchema.parse(formDataToObject(formData));

  await verifyInventoryForProfile(profile, input);
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}
