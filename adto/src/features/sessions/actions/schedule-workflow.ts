"use server";

import { revalidatePath } from "next/cache";
import { requireActiveProfile } from "@/lib/auth";
import {
  scheduleBulkRowSchema,
  scheduleBulkSaveSchema,
  scheduleDuplicateSchema,
  scheduleTemplatePreviewSchema,
  scheduleTemplateSchema,
} from "@/features/sessions/schemas/schedule-workflow";
import {
  buildBulkSchedulePreview,
  buildDuplicateSchedulePreview,
  buildTemplateSchedulePreview,
  createScheduleTemplate,
  saveScheduleRows,
  type SchedulePreviewRow,
} from "@/features/sessions/services/schedule-workflow.service";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function safeError(error: unknown) {
  console.error(error);
  return error instanceof Error && error.message.includes("Resolve")
    ? error.message
    : "The schedule request could not be completed. Please review the rows and try again.";
}

export async function previewDuplicateScheduleAction(formData: FormData) {
  try {
    const profile = await requireActiveProfile();
    const input = scheduleDuplicateSchema.parse(formDataToObject(formData));
    const rows = await buildDuplicateSchedulePreview(profile, input);
    return { success: true, rows } as const;
  } catch (error) {
    return { success: false, error: safeError(error), rows: [] } as const;
  }
}

export async function previewBulkSchedulePasteAction(formData: FormData) {
  try {
    const profile = await requireActiveProfile();
    const input = scheduleBulkSaveSchema.parse(formDataToObject(formData));
    const rawRows = JSON.parse(input.rowsJson) as unknown[];
    const rows = rawRows.map((row) => scheduleBulkRowSchema.parse(row));
    const previewRows = await buildBulkSchedulePreview(profile, rows);
    return { success: true, rows: previewRows } as const;
  } catch (error) {
    return { success: false, error: safeError(error), rows: [] } as const;
  }
}

export async function saveBulkScheduleRowsAction(formData: FormData) {
  try {
    const profile = await requireActiveProfile();
    const input = scheduleBulkSaveSchema.parse(formDataToObject(formData));
    const rows = JSON.parse(input.rowsJson) as SchedulePreviewRow[];
    const result = await saveScheduleRows(profile, rows, input.allowConflicts === "true");
    revalidatePath("/sessions");
    revalidatePath("/dashboard");
    return { success: true, ...result } as const;
  } catch (error) {
    return { success: false, error: safeError(error) } as const;
  }
}

export async function createScheduleTemplateAction(formData: FormData) {
  try {
    const profile = await requireActiveProfile();
    const input = scheduleTemplateSchema.parse(formDataToObject(formData));
    const template = await createScheduleTemplate(profile, input);
    revalidatePath("/sessions");
    return { success: true, template } as const;
  } catch (error) {
    return { success: false, error: safeError(error) } as const;
  }
}

export async function previewScheduleTemplateAction(formData: FormData) {
  try {
    const profile = await requireActiveProfile();
    const input = scheduleTemplatePreviewSchema.parse(formDataToObject(formData));
    const rows = await buildTemplateSchedulePreview(profile, input);
    return { success: true, rows } as const;
  } catch (error) {
    return { success: false, error: safeError(error), rows: [] } as const;
  }
}
