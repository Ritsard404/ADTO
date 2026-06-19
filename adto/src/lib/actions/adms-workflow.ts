"use server";

import { revalidatePath } from "next/cache";
import { requireActiveProfile } from "@/lib/auth";
import {
  createMonthlyReportForFacilitator,
  createSchoolRemarkForProfile,
  createSessionForFacilitator,
  createTeacherForFacilitator,
  updateSessionForProfile,
  upsertSectionForFacilitator,
  upsertProjectForProfile,
  verifyInventoryForProfile,
} from "@/lib/services/adms-workflow.service";
import {
  bulkSessionRowsSchema,
  facilitatorMonthlyReportSchema,
  facilitatorSchoolRemarkSchema,
  facilitatorSectionUpsertSchema,
  facilitatorSessionCreateSchema,
  facilitatorTeacherCreateSchema,
  inventoryVerificationSchema,
  projectUpsertSchema,
  sessionUpdateSchema,
} from "@/lib/validations/adms-workflow";

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

type BulkSessionRow = {
  schoolId: string;
  title: string;
  scheduledDate: string;
  gradeLevel: string;
  section: string;
  subject?: string;
  activity?: string;
  durationHours?: number;
  teacher?: string;
  status?: string;
  remarks?: string;
};

export async function bulkCreateSessionsAction(formData: FormData) {
  const profile = await requireActiveProfile();
  const input = bulkSessionRowsSchema.parse(formDataToObject(formData));
  const rows = JSON.parse(input.rowsJson) as BulkSessionRow[];

  for (const [index, row] of rows.entries()) {
    if (!row.schoolId || !row.scheduledDate || !row.gradeLevel || !row.section) {
      throw new Error(`Row ${index + 1} is missing school, date, grade, or section.`);
    }

    if (profile.role === "FACILITATOR") {
      await createSessionForFacilitator(profile, {
        schoolId: row.schoolId,
        title: row.title || row.activity || "ACE Session",
        gradeLevel: row.gradeLevel,
        section: row.section,
        sessionNumber: index + 1,
        scheduledDate: row.scheduledDate,
        durationHours: Number(row.durationHours || 1),
        subject: row.subject,
        teacher: row.teacher,
        activity: row.activity,
        delivery: "Classroom",
        remarks: row.remarks,
      });
    } else {
      const adminInput = new FormData();
      adminInput.set("schoolId", row.schoolId);
      adminInput.set("facilitatorId", profile.id);
      adminInput.set("title", row.title || row.activity || "ACE Session");
      adminInput.set("gradeLevel", row.gradeLevel);
      adminInput.set("section", row.section);
      adminInput.set("sessionNumber", String(index + 1));
      adminInput.set("scheduledDate", row.scheduledDate);
      adminInput.set("durationHours", String(row.durationHours || 1));
      adminInput.set("subject", row.subject || "");
      adminInput.set("teacher", row.teacher || "");
      adminInput.set("activity", row.activity || "");
      adminInput.set("delivery", "Classroom");
      adminInput.set("remarks", row.remarks || "");
      adminInput.set("status", row.status || "NOT_STARTED");
      const { upsertAdminSessionAction } = await import("@/lib/actions/admin");
      await upsertAdminSessionAction(adminInput);
    }
  }

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
