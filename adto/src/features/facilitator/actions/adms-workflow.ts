"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireActiveProfile } from "@/lib/auth";
import { sanitizeStorageSegment, uploadPrivateObject } from "@/features/media/services/private-storage.service";
import { recordAuditLog } from "@/features/security/services/audit-log.service";
import { enforceRateLimit, isRateLimitError } from "@/lib/security/rate-limit";
import {
  assertCanCreateEvidenceForProfile,
  bulkCreateEvidenceLinksForProfile,
  bulkUpdateSessionDailyLogsForProfile,
  createMonthlyReportForFacilitator,
  createEvidenceRecordForProfile,
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
  bulkEvidenceLinkRowSchema,
  bulkEvidenceLinkSchema,
  bulkSessionDailyLogRowSchema,
  bulkSessionDailyLogSchema,
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

const MAX_EVIDENCE_FILE_BYTES = 25 * 1024 * 1024;
const allowedEvidenceExtensions = /\.(jpe?g|png|webp|pdf|docx|pptx|xlsx|txt)$/i;
const allowedEvidenceMimeTypes = new Set([
  "",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function evidenceFileFromFormData(formData: FormData) {
  const file = formData.get("file");
  if (!(file instanceof File) || !file.name) {
    throw new Error("Choose an evidence file to upload.");
  }
  if (file.size > MAX_EVIDENCE_FILE_BYTES) {
    throw new Error("Evidence files must be 25 MB or smaller.");
  }
  if (!allowedEvidenceExtensions.test(file.name) || !allowedEvidenceMimeTypes.has(file.type)) {
    throw new Error("Evidence upload must be an image, PDF, Office document, or text file.");
  }
  return file;
}

function evidenceStoragePath(input: { schoolId: string; uploadedById: string; fileName: string }) {
  const extension = input.fileName.match(/\.[a-z0-9]+$/i)?.[0]?.toLowerCase() ?? "";
  return [
    "evidence",
    sanitizeStorageSegment(input.schoolId),
    sanitizeStorageSegment(input.uploadedById),
    `${new Date().toISOString().slice(0, 10)}-${randomUUID()}${extension}`,
  ].join("/");
}

export async function updateSessionAction(formData: FormData) {
  const profile = await requireActiveProfile();
  const input = sessionUpdateSchema.parse(formDataToObject(formData));

  await updateSessionForProfile(profile, input);
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
}

export async function bulkUpdateSessionDailyLogsAction(formData: FormData) {
  let actorId: string | null = null;
  try {
    const profile = await requireActiveProfile();
    actorId = profile.id;
    enforceRateLimit({ key: `daily-log-bulk:${profile.id}`, limit: 12, windowMs: 15 * 60_000 });
    const input = bulkSessionDailyLogSchema.parse(formDataToObject(formData));
    const rawRows = JSON.parse(input.rowsJson) as unknown[];
    const rows = rawRows.map((row) => bulkSessionDailyLogRowSchema.parse(row));
    const result = await bulkUpdateSessionDailyLogsForProfile(profile, rows);
    revalidatePath("/sessions");
    revalidatePath("/dashboard");
    revalidatePath("/reports");
    revalidatePath("/media");
    await recordAuditLog({
      actorId: profile.id,
      entityType: "ACESession",
      entityId: "bulk-daily-log",
      action: "DAILY_LOGS_BULK_UPDATED",
      newValue: {
        rows: rows.length,
        updated: result.updated,
        evidenceCreated: result.evidenceCreated,
        projectsLinked: result.projectsLinked,
      },
    });
    return { success: true, ...result } as const;
  } catch (error) {
    console.error(error);
    if (actorId) {
      await recordAuditLog({
        actorId,
        entityType: "ACESession",
        entityId: "bulk-daily-log",
        action: "DAILY_LOGS_BULK_UPDATE_FAILED",
        newValue: { reason: error instanceof Error ? error.message : "Daily log update failed" },
      });
    }
    if (isRateLimitError(error)) {
      return { success: false, error: "Too many daily log saves. Try again in a few minutes." } as const;
    }
    return { success: false, error: "Daily logs could not be saved. Review the edited rows and try again." } as const;
  }
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
  enforceRateLimit({ key: `evidence-link:${profile.id}`, limit: 30, windowMs: 15 * 60_000 });
  const input = facilitatorEvidenceLinkSchema.parse(formDataToObject(formData));

  const evidence = await createEvidenceLinkForProfile(profile, {
    ...input,
    sessionId: input.sessionId || undefined,
    projectId: input.projectId || undefined,
  });
  await recordAuditLog({
    actorId: profile.id,
    entityType: "MediaUpload",
    entityId: evidence.id,
    action: "EVIDENCE_LINK_CREATED",
    newValue: {
      schoolId: input.schoolId,
      sessionId: input.sessionId || null,
      projectId: input.projectId || null,
      fileType: input.fileType,
    },
  });
  revalidatePath("/facilitator/evidence");
  revalidatePath("/media");
  revalidatePath("/dashboard");
}

export async function uploadEvidenceFileAction(formData: FormData) {
  let actorId: string | null = null;
  let fileName = "unknown";
  try {
    const profile = await requireActiveProfile();
    actorId = profile.id;
    enforceRateLimit({ key: `evidence-file-upload:${profile.id}`, limit: 10, windowMs: 15 * 60_000 });
    const input = facilitatorEvidenceLinkSchema
      .omit({ fileUrl: true })
      .extend({ fileName: facilitatorEvidenceLinkSchema.shape.fileName.optional().or(z.literal("")) })
      .parse(formDataToObject(formData));
    const file = evidenceFileFromFormData(formData);
    fileName = file.name;
    await assertCanCreateEvidenceForProfile(profile, {
      schoolId: input.schoolId,
      sessionId: input.sessionId || undefined,
      projectId: input.projectId || undefined,
    });

    const object = await uploadPrivateObject({
      path: evidenceStoragePath({ schoolId: input.schoolId, uploadedById: profile.id, fileName: file.name }),
      body: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || "application/octet-stream",
    });
    const evidence = await createEvidenceRecordForProfile(profile, {
      schoolId: input.schoolId,
      sessionId: input.sessionId || undefined,
      projectId: input.projectId || undefined,
      fileName: input.fileName || file.name,
      fileUrl: object.ref,
      fileType: input.fileType,
      description: input.description || undefined,
    });
    await recordAuditLog({
      actorId: profile.id,
      entityType: "MediaUpload",
      entityId: evidence.id,
      action: "EVIDENCE_FILE_UPLOADED",
      newValue: {
        schoolId: input.schoolId,
        sessionId: input.sessionId || null,
        projectId: input.projectId || null,
        fileType: input.fileType,
        fileSize: file.size,
        storagePath: object.path,
      },
    });
    revalidatePath("/facilitator/evidence");
    revalidatePath("/media");
    revalidatePath("/dashboard");
  } catch (error) {
    console.error(error);
    if (actorId) {
      await recordAuditLog({
        actorId,
        entityType: "MediaUpload",
        entityId: fileName,
        action: "EVIDENCE_FILE_UPLOAD_FAILED",
        newValue: { reason: error instanceof Error ? error.message : "Evidence file upload failed" },
      });
    }
    return;
  }
}

export async function bulkCreateEvidenceLinksAction(formData: FormData) {
  let actorId: string | null = null;
  try {
    const profile = await requireActiveProfile();
    actorId = profile.id;
    enforceRateLimit({ key: `evidence-link-bulk:${profile.id}`, limit: 10, windowMs: 15 * 60_000 });
    const input = bulkEvidenceLinkSchema.parse(formDataToObject(formData));
    const rawRows = JSON.parse(input.rowsJson) as unknown[];
    const rows = rawRows.map((row) => bulkEvidenceLinkRowSchema.parse(row));
    const result = await bulkCreateEvidenceLinksForProfile(profile, rows);
    revalidatePath("/facilitator/evidence");
    revalidatePath("/media");
    revalidatePath("/reports");
    revalidatePath("/dashboard");
    await recordAuditLog({
      actorId: profile.id,
      entityType: "MediaUpload",
      entityId: "bulk-evidence-links",
      action: "EVIDENCE_LINKS_BULK_CREATED",
      newValue: {
        rows: rows.length,
        created: result.created,
        skipped: result.skipped,
      },
    });
    return { success: true, ...result } as const;
  } catch (error) {
    console.error(error);
    if (actorId) {
      await recordAuditLog({
        actorId,
        entityType: "MediaUpload",
        entityId: "bulk-evidence-links",
        action: "EVIDENCE_LINKS_BULK_CREATE_FAILED",
        newValue: { reason: error instanceof Error ? error.message : "Evidence link save failed" },
      });
    }
    if (isRateLimitError(error)) {
      return { success: false, error: "Too many evidence link saves. Try again in a few minutes." } as const;
    }
    return { success: false, error: "Evidence links could not be saved. Check URLs, school access, and duplicate rows." } as const;
  }
}
