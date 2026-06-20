"use server";

import { revalidatePath } from "next/cache";
import { requireActiveProfile } from "@/lib/auth";
import {
  createMonthlyReportForFacilitator,
  createEvidenceLinkForProfile,
  createSchoolRemarkForProfile,
  createSessionForFacilitator,
  createTeacherForFacilitator,
  updateSessionForProfile,
  upsertSectionForFacilitator,
  upsertProjectForProfile,
  verifyInventoryForProfile,
} from "@/features/facilitator/services/adms-workflow.service";
import {
  facilitatorMonthlyReportSchema,
  facilitatorEvidenceLinkSchema,
  facilitatorSchoolRemarkSchema,
  facilitatorSectionUpsertSchema,
  facilitatorSessionCreateSchema,
  facilitatorTeacherCreateSchema,
  inventoryVerificationSchema,
  projectUpsertSchema,
  sessionUpdateSchema,
} from "@/features/facilitator/schemas/adms-workflow";

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

export async function createFacilitatorSessionAction(formData: FormData) {
  const profile = await requireActiveProfile();
  const input = facilitatorSessionCreateSchema.parse(formDataToObject(formData));

  await createSessionForFacilitator(profile, input);
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
}

export async function upsertFacilitatorSectionAction(formData: FormData) {
  const profile = await requireActiveProfile();
  const input = facilitatorSectionUpsertSchema.parse(formDataToObject(formData));

  await upsertSectionForFacilitator(profile, {
    ...input,
    sectionId: input.sectionId || undefined,
  });
  revalidatePath("/schools");
  revalidatePath("/dashboard");
}

export async function createFacilitatorTeacherAction(formData: FormData) {
  const profile = await requireActiveProfile();
  const input = facilitatorTeacherCreateSchema.parse(formDataToObject(formData));

  await createTeacherForFacilitator(profile, {
    ...input,
    sectionId: input.sectionId || undefined,
    gradeLevel: input.gradeLevel || undefined,
    schoolYear: input.schoolYear || undefined,
    subject: input.subject || undefined,
  });
  revalidatePath("/schools");
}

export async function createFacilitatorSchoolRemarkAction(formData: FormData) {
  const profile = await requireActiveProfile();
  const input = facilitatorSchoolRemarkSchema.parse(formDataToObject(formData));

  await createSchoolRemarkForProfile(profile, input);
  revalidatePath("/schools");
}

export async function createFacilitatorMonthlyReportAction(formData: FormData) {
  const profile = await requireActiveProfile();
  const input = facilitatorMonthlyReportSchema.parse(formDataToObject(formData));

  await createMonthlyReportForFacilitator(profile, input);
  revalidatePath("/reports");
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

export async function createEvidenceLinkAction(formData: FormData) {
  const profile = await requireActiveProfile();
  const input = facilitatorEvidenceLinkSchema.parse(formDataToObject(formData));

  await createEvidenceLinkForProfile(profile, {
    ...input,
    sessionId: input.sessionId || undefined,
    projectId: input.projectId || undefined,
  });
  revalidatePath("/facilitator/evidence");
  revalidatePath("/media");
  revalidatePath("/dashboard");
}
