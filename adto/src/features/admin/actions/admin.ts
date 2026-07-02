"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { recordAuditLog } from "@/features/security/services/audit-log.service";
import { prisma } from "@/lib/prisma";
import { assertWritableDataMode } from "@/lib/runtime-mode";
import { enforceRateLimit, isRateLimitError } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { importAdmsWorkbookBuffer, inspectAdmsWorkbookBuffer, previewAdmsWorkbookImportBuffer } from "@/features/import-export/services/adms-excel-import";
import {
  assignmentEndSchema,
  assignmentUpsertSchema,
  activityCategoryCreateSchema,
  adminSessionCreateSchema,
  schoolRemarkCreateSchema,
  schoolYearCreateSchema,
  sectionBulkCreateSchema,
  schoolMembershipUpsertSchema,
  schoolUpdateSchema,
  teacherAssignmentCreateSchema,
  teacherCreateSchema,
  userCreateSchema,
  userPasswordUpdateSchema,
  userUpdateSchema,
} from "@/features/admin/schemas/admin";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function checksumArrayBuffer(buffer: ArrayBuffer) {
  return createHash("sha256").update(Buffer.from(buffer)).digest("hex");
}

async function workbookFileFromFormData(formData: FormData) {
  const file = formData.get("workbook");
  if (!(file instanceof File) || !file.name) {
    throw new Error("Upload an ADMS workbook file.");
  }
  if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) {
    throw new Error("Upload an Excel workbook with .xlsx, .xlsm, or .xls.");
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Workbook is too large. Keep imports under 20 MB per batch.");
  }
  return file;
}

export async function updateSchoolAction(formData: FormData) {
  assertWritableDataMode();
  await requireRole(["ADMIN"]);
  const input = schoolUpdateSchema.parse(formDataToObject(formData));

  const duplicateChecks = [
    ["schoolCode", input.schoolCode],
    ["deployedFormId", input.deployedFormId],
    ["sourceSchoolId", input.sourceSchoolId],
  ] as const;
  for (const [field, value] of duplicateChecks) {
    if (!value) continue;
    const duplicate = await prisma.school.findFirst({
      where: { [field]: value, id: { not: input.schoolId } },
      select: { name: true },
    });
    if (duplicate) {
      throw new Error(`This ${field} is already used by ${duplicate.name}.`);
    }
  }

  await prisma.school.update({
    where: { id: input.schoolId },
    data: {
      name: input.name,
      address: input.address,
      contactPerson: input.contactPerson,
      contactEmail: input.contactEmail || null,
      contactNumber: input.contactNumber || null,
      schoolCode: input.schoolCode || null,
      schoolType: input.schoolType || null,
      region: input.region || null,
      division: input.division || null,
      schoolYear: input.schoolYear,
      adoptionYear: input.adoptionYear || null,
      implementationYear: input.implementationYear || null,
      adoptionType: input.adoptionType || null,
      deployedFormId: input.deployedFormId || null,
      formNumber: input.formNumber || null,
      sourceSchoolId: input.sourceSchoolId || null,
      schoolLogoFileId: input.schoolLogoFileId || null,
      team: input.team || null,
      unitHead: input.unitHead || null,
      supervisor: input.supervisor || null,
      supervisorEmail: input.supervisorEmail || null,
      edtechSpecialist: input.edtechSpecialist || null,
      edtechEmail: input.edtechEmail || null,
      gradeLevelAdoption: input.gradeLevelAdoption || null,
      adoptionRemarks: input.adoptionRemarks || null,
      addressLine1: input.addressLine1 || null,
      addressLine2: input.addressLine2 || null,
      scheduleArrangement: input.scheduleArrangement || null,
      codingModality: input.codingModality || null,
      hardwareAllocation: input.hardwareAllocation || null,
      softwareAllocation: input.softwareAllocation || null,
      status: input.status,
    },
  });

  revalidatePath("/schools");
  revalidatePath("/dashboard");
}

export async function createSchoolYearAction(formData: FormData) {
  assertWritableDataMode();
  await requireRole(["ADMIN"]);
  const input = schoolYearCreateSchema.parse(formDataToObject(formData));

  await prisma.schoolYear.upsert({
    where: { schoolId_label: { schoolId: input.schoolId, label: input.label } },
    update: {
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      status: input.status,
    },
    create: {
      schoolId: input.schoolId,
      label: input.label,
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
      status: input.status,
    },
  });
  revalidatePath("/schools");
}

export async function bulkCreateSectionsAction(formData: FormData) {
  assertWritableDataMode();
  await requireRole(["ADMIN"]);
  const input = sectionBulkCreateSchema.parse(formDataToObject(formData));
  const rows = input.sections
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of rows) {
    const [sectionName, adviserName = "", male = "0", female = "0"] = line.split(",").map((part) => part.trim());
    const maleStudents = Math.max(Number(male) || 0, 0);
    const femaleStudents = Math.max(Number(female) || 0, 0);
    await prisma.schoolSection.upsert({
      where: {
        schoolId_schoolYear_gradeLevel_sectionName: {
          schoolId: input.schoolId,
          schoolYear: input.schoolYear,
          gradeLevel: input.gradeLevel,
          sectionName,
        },
      },
      update: { adviserName, maleStudents, femaleStudents, totalStudents: maleStudents + femaleStudents, isActive: true },
      create: {
        schoolId: input.schoolId,
        schoolYear: input.schoolYear,
        gradeLevel: input.gradeLevel,
        sectionName,
        adviserName,
        maleStudents,
        femaleStudents,
        totalStudents: maleStudents + femaleStudents,
      },
    });
  }
  revalidatePath("/schools");
}

export async function createTeacherAction(formData: FormData) {
  assertWritableDataMode();
  await requireRole(["ADMIN"]);
  const input = teacherCreateSchema.parse(formDataToObject(formData));
  await prisma.teacher.create({ data: input });
  revalidatePath("/schools");
}

export async function createTeacherAssignmentAction(formData: FormData) {
  assertWritableDataMode();
  await requireRole(["ADMIN"]);
  const input = teacherAssignmentCreateSchema.parse(formDataToObject(formData));
  await prisma.teacherAssignment.create({ data: { ...input, sectionId: input.sectionId || null } });
  revalidatePath("/schools");
}

export async function createActivityCategoryAction(formData: FormData) {
  assertWritableDataMode();
  await requireRole(["ADMIN"]);
  const input = activityCategoryCreateSchema.parse(formDataToObject(formData));
  await prisma.activityCategory.upsert({ where: { name: input.name }, update: { description: input.description || null, isActive: true }, create: input });
  revalidatePath("/sessions");
}

export async function createSchoolRemarkAction(formData: FormData) {
  assertWritableDataMode();
  const profile = await requireRole(["ADMIN"]);
  const input = schoolRemarkCreateSchema.parse(formDataToObject(formData));
  await prisma.schoolRemark.create({ data: { ...input, actionItems: input.actionItems || null, createdBy: profile.id } });
  revalidatePath("/schools");
}

export async function upsertAdminSessionAction(formData: FormData) {
  assertWritableDataMode();
  await requireRole(["ADMIN"]);
  const input = adminSessionCreateSchema.parse(formDataToObject(formData));
  const data = {
    schoolId: input.schoolId,
    facilitatorId: input.facilitatorId,
    title: input.title,
    gradeLevel: input.gradeLevel,
    section: input.section,
    sessionNumber: input.sessionNumber,
    scheduledDate: new Date(input.scheduledDate),
    startTime: input.startTime || null,
    durationHours: input.durationHours ?? null,
    subject: input.subject || null,
    teacher: input.teacher || null,
    activity: input.activity || null,
    delivery: input.delivery || null,
    remarks: input.remarks || null,
    status: input.status,
  };

  if (input.sessionId) {
    await prisma.aCESession.update({ where: { id: input.sessionId }, data });
  } else {
    await prisma.aCESession.create({ data });
  }
  revalidatePath("/sessions");
  revalidatePath("/dashboard");
}

export async function upsertAssignmentAction(formData: FormData) {
  assertWritableDataMode();
  const profile = await requireRole(["ADMIN"]);
  const input = assignmentUpsertSchema.parse(formDataToObject(formData));

  const data = {
    schoolId: input.schoolId,
    facilitatorId: input.facilitatorId,
    startDate: new Date(input.startDate),
    endDate: input.endDate ? new Date(input.endDate) : null,
    status: input.status,
    assignedBy: profile.id,
  };

  await prisma.$transaction(async (tx) => {
    if (input.status === "ACTIVE") {
      await tx.facilitatorAssignment.updateMany({
        where: {
          facilitatorId: input.facilitatorId,
          status: "ACTIVE",
          id: input.assignmentId ? { not: input.assignmentId } : undefined,
        },
        data: { status: "TRANSFERRED", endDate: new Date() },
      });
    }

    if (input.assignmentId) {
      await tx.facilitatorAssignment.update({ where: { id: input.assignmentId }, data });
    } else {
      await tx.facilitatorAssignment.create({ data });
    }
  });

  revalidatePath("/facilitators");
  revalidatePath("/schools");
  revalidatePath("/dashboard");
  revalidatePath("/facilitator/dashboard");
}

export async function endAssignmentAction(formData: FormData) {
  assertWritableDataMode();
  await requireRole(["ADMIN"]);
  const input = assignmentEndSchema.parse(formDataToObject(formData));

  await prisma.facilitatorAssignment.update({
    where: { id: input.assignmentId },
    data: { status: "COMPLETED", endDate: new Date() },
  });

  revalidatePath("/facilitators");
  revalidatePath("/schools");
  revalidatePath("/dashboard");
  revalidatePath("/facilitator/dashboard");
}

export async function createUserAction(formData: FormData) {
  assertWritableDataMode();
  const adminProfile = await requireRole(["ADMIN"]);
  enforceRateLimit({ key: `admin-create-user:${adminProfile.id}`, limit: 15, windowMs: 15 * 60_000 });
  const input = userCreateSchema.parse(formDataToObject(formData));

  const email = input.email.toLowerCase();
  const supabase = createAdminClient();
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    throw new Error("Supabase Auth admin access is not configured. Check SUPABASE_SERVICE_ROLE_KEY.");
  }

  const existingAuthUser = users.users.find((user) => user.email?.toLowerCase() === email);
  const authPayload = {
    password: input.password,
    user_metadata: {
      full_name: input.fullName,
    },
    app_metadata: {
      role: input.role,
    },
  };

  if (existingAuthUser) {
    const { error } = await supabase.auth.admin.updateUserById(existingAuthUser.id, authPayload);
    if (error) {
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      ...authPayload,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  await prisma.profile.upsert({
    where: { email },
    update: {
      fullName: input.fullName,
      role: input.role,
      status: input.status,
    },
    create: {
      email,
      fullName: input.fullName,
      role: input.role,
      status: input.status,
    },
  });

  await recordAuditLog({
    actorId: adminProfile.id,
    entityType: "Profile",
    entityId: email,
    action: existingAuthUser ? "USER_AUTH_UPDATED" : "USER_CREATED",
    newValue: { email, role: input.role, status: input.status },
  });

  revalidatePath("/settings");
  revalidatePath("/facilitators");
  revalidatePath("/dashboard");
}

export async function updateUserAction(formData: FormData) {
  assertWritableDataMode();
  await requireRole(["ADMIN"]);
  const input = userUpdateSchema.parse(formDataToObject(formData));

  await prisma.profile.update({
    where: { id: input.profileId },
    data: {
      fullName: input.fullName,
      role: input.role,
      status: input.status,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/facilitators");
  revalidatePath("/dashboard");
}

export async function updateUserPasswordAction(formData: FormData) {
  assertWritableDataMode();
  const adminProfile = await requireRole(["ADMIN"]);
  try {
    enforceRateLimit({ key: `admin-password-reset:${adminProfile.id}`, limit: 10, windowMs: 15 * 60_000 });
  } catch (error) {
    if (isRateLimitError(error)) {
      return { success: false, error: "Too many password reset attempts. Try again in a few minutes." } as const;
    }
    throw error;
  }
  const parsed = userPasswordUpdateSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Review the password fields and try again." } as const;
  }

  const profile = await prisma.profile.findUnique({
    where: { id: parsed.data.profileId },
    select: { email: true },
  });

  if (!profile) {
    await recordAuditLog({
      actorId: adminProfile.id,
      entityType: "Profile",
      entityId: parsed.data.profileId,
      action: "ADMIN_PASSWORD_RESET_FAILED",
      newValue: { reason: "Profile not found" },
    });
    return { success: false, error: "User account was not found." } as const;
  }

  try {
    const supabase = createAdminClient();
    const { data, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      throw listError;
    }

    const authUser = data.users.find((user) => user.email?.toLowerCase() === profile.email.toLowerCase());
    if (!authUser) {
      await recordAuditLog({
        actorId: adminProfile.id,
        entityType: "Profile",
        entityId: parsed.data.profileId,
        action: "ADMIN_PASSWORD_RESET_FAILED",
        newValue: { reason: "Missing Supabase Auth user" },
      });
      return { success: false, error: "This profile does not have a matching Supabase Auth user yet." } as const;
    }

    const { error } = await supabase.auth.admin.updateUserById(authUser.id, { password: parsed.data.password });
    if (error) {
      throw error;
    }

    revalidatePath("/settings");
    await recordAuditLog({
      actorId: adminProfile.id,
      entityType: "Profile",
      entityId: parsed.data.profileId,
      action: "ADMIN_PASSWORD_RESET",
      newValue: { email: profile.email },
    });
    return { success: true } as const;
  } catch (error) {
    console.error(error);
    await recordAuditLog({
      actorId: adminProfile.id,
      entityType: "Profile",
      entityId: parsed.data.profileId,
      action: "ADMIN_PASSWORD_RESET_FAILED",
      newValue: { reason: "Supabase admin update failed" },
    });
    return { success: false, error: "Password could not be updated. Check Supabase admin configuration and try again." } as const;
  }
}

export async function upsertSchoolMembershipAction(formData: FormData) {
  assertWritableDataMode();
  const profile = await requireRole(["ADMIN"]);
  const input = schoolMembershipUpsertSchema.parse(formDataToObject(formData));

  await prisma.schoolMembership.upsert({
    where: { schoolId_profileId: { schoolId: input.schoolId, profileId: input.profileId } },
    update: {
      roleLabel: input.roleLabel,
      status: input.status,
      invitationStatus: input.invitationStatus || "ACCEPTED",
      startDate: input.startDate ? new Date(input.startDate) : new Date(),
      endDate: input.endDate ? new Date(input.endDate) : null,
      notes: input.notes || null,
      createdBy: profile.id,
    },
    create: {
      schoolId: input.schoolId,
      profileId: input.profileId,
      roleLabel: input.roleLabel,
      status: input.status,
      invitationStatus: input.invitationStatus || "ACCEPTED",
      startDate: input.startDate ? new Date(input.startDate) : new Date(),
      endDate: input.endDate ? new Date(input.endDate) : null,
      notes: input.notes || null,
      createdBy: profile.id,
    },
  });

  revalidatePath("/schools");
  revalidatePath("/dashboard");
  revalidatePath("/sessions");
  revalidatePath("/calendar");
  revalidatePath("/reports");
  revalidatePath("/inventory");
  revalidatePath("/media");
}

export async function previewWorkbookImportAction(formData: FormData) {
  let actorId: string | null = null;
  let fileName = "unknown";
  try {
    const profile = await requireRole(["ADMIN"]);
    actorId = profile.id;
    enforceRateLimit({ key: `workbook-preview:${profile.id}`, limit: 8, windowMs: 15 * 60_000 });
    const file = await workbookFileFromFormData(formData);
    fileName = file.name;
    const workbookBuffer = await file.arrayBuffer();
    const checksum = checksumArrayBuffer(workbookBuffer);
    const facilitatorEmail = String(formData.get("facilitatorEmail") ?? "").trim().toLowerCase();
    const selectedSheets = {
      schoolInfo: formData.get("schoolInfo") === "on",
      sessions: formData.get("sessions") === "on",
      projects: formData.get("projects") === "on",
      inventory: formData.get("inventory") === "on",
    };
    const sheets = inspectAdmsWorkbookBuffer(workbookBuffer).map((sheet) => ({
      name: sheet.name,
      hidden: sheet.hidden,
      range: sheet.range,
      sampleRows: sheet.sampleRows.length,
      formulas: sheet.formulas.length,
      firstRow: sheet.sampleRows[0]?.slice(0, 8).map((cell) => String(cell ?? "")) ?? [],
    }));
    const dryRun = await previewAdmsWorkbookImportBuffer(workbookBuffer, facilitatorEmail, {
      sourceWorkbookFile: file.name,
      checksum,
      sheets: selectedSheets,
    });
    await recordAuditLog({
      actorId: profile.id,
      entityType: "WorkbookImport",
      entityId: file.name,
      action: "WORKBOOK_PREVIEWED",
      newValue: { fileName: file.name, size: file.size, checksum, sheetCount: sheets.length, dryRun },
    });
    return { success: true, fileName: file.name, checksum, sheets, dryRun } as const;
  } catch (error) {
    console.error(error);
    if (actorId) {
      await recordAuditLog({
        actorId,
        entityType: "WorkbookImport",
        entityId: fileName,
        action: "WORKBOOK_PREVIEW_FAILED",
        newValue: { reason: error instanceof Error ? error.message : "Workbook preview failed" },
      });
    }
    if (isRateLimitError(error)) {
      return { success: false, error: "Too many workbook preview attempts. Try again in a few minutes." } as const;
    }
    return { success: false, error: error instanceof Error ? error.message : "Workbook preview failed. Confirm the file is a valid ADMS Excel workbook." } as const;
  }
}

export async function runWorkbookImportAction(formData: FormData) {
  let actorId: string | null = null;
  let fileName = "unknown";
  let batchId: string | null = null;
  try {
    assertWritableDataMode();
    const profile = await requireRole(["ADMIN"]);
    actorId = profile.id;
    enforceRateLimit({ key: `workbook-import:${profile.id}`, limit: 4, windowMs: 30 * 60_000 });
    const file = await workbookFileFromFormData(formData);
    fileName = file.name;
    const facilitatorEmail = String(formData.get("facilitatorEmail") ?? "").trim().toLowerCase();
    if (!facilitatorEmail) {
      throw new Error("Choose the facilitator email that owns imported session rows.");
    }
    const selectedSheets = {
      schoolInfo: formData.get("schoolInfo") === "on",
      sessions: formData.get("sessions") === "on",
      projects: formData.get("projects") === "on",
      inventory: formData.get("inventory") === "on",
    };
    const workbookBuffer = await file.arrayBuffer();
    const checksum = checksumArrayBuffer(workbookBuffer);
    const previousCompletedBatch = await prisma.workbookImportBatch.findFirst({
      where: { checksum, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { id: true, fileName: true, schoolName: true },
    });
    if (previousCompletedBatch) {
      await recordAuditLog({
        actorId: profile.id,
        entityType: "WorkbookImportBatch",
        entityId: previousCompletedBatch.id,
        action: "WORKBOOK_IMPORT_DUPLICATE_BLOCKED",
        newValue: { fileName: file.name, checksum, previousFileName: previousCompletedBatch.fileName },
      });
      return {
        success: false,
        error: `This workbook matches a completed import${previousCompletedBatch.schoolName ? ` for ${previousCompletedBatch.schoolName}` : ""}. Use a different workbook or verify the existing batch first.`,
      } as const;
    }

    const batch = await prisma.workbookImportBatch.create({
      data: {
        id: randomUUID(),
        fileName: file.name,
        checksum,
        importedById: profile.id,
        facilitatorEmail,
        selectedSheets: JSON.stringify(selectedSheets),
        status: "RUNNING",
      },
    });
    batchId = batch.id;

    const summary = await importAdmsWorkbookBuffer(workbookBuffer, facilitatorEmail, {
      sourceWorkbookFile: file.name,
      sheets: selectedSheets,
    });
    await prisma.workbookImportBatch.update({
      where: { id: batch.id },
      data: {
        status: "COMPLETED",
        rowsRead: summary.rowsRead,
        rowsImported: summary.rowsImported,
        rowsSkipped: summary.rowsSkipped,
        sheetSummary: JSON.stringify(summary.sheetSummaries),
        validationErrors: summary.validationErrors.length ? JSON.stringify(summary.validationErrors) : null,
        schoolId: summary.schoolId ?? null,
        schoolName: summary.schoolName ?? null,
        completedAt: new Date(),
      },
    });
    revalidatePath("/dashboard");
    revalidatePath("/imports");
    revalidatePath("/sessions");
    revalidatePath("/reports");
    revalidatePath("/inventory");
    revalidatePath("/media");
    await recordAuditLog({
      actorId: profile.id,
      entityType: "WorkbookImportBatch",
      entityId: batch.id,
      action: "WORKBOOK_IMPORTED",
      newValue: {
        fileName: file.name,
        size: file.size,
        checksum,
        facilitatorEmail,
        rowsRead: summary.rowsRead,
        rowsImported: summary.rowsImported,
        rowsSkipped: summary.rowsSkipped,
        rowsCreated: summary.rowsCreated,
        rowsUpdated: summary.rowsUpdated,
        validationErrors: summary.validationErrors.length,
        warnings: summary.warnings.length,
        detailCounts: summary.detailCounts,
        sheetSummaries: summary.sheetSummaries,
        schoolId: summary.schoolId,
      },
    });
    return { success: true, importBatchId: batch.id, checksum, ...summary } as const;
  } catch (error) {
    console.error(error);
    if (batchId) {
      await prisma.workbookImportBatch.update({
        where: { id: batchId },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message.slice(0, 1000) : "Workbook import failed",
          failedAt: new Date(),
        },
      });
    }
    if (actorId) {
      await recordAuditLog({
        actorId,
        entityType: batchId ? "WorkbookImportBatch" : "WorkbookImport",
        entityId: batchId ?? fileName,
        action: "WORKBOOK_IMPORT_FAILED",
        newValue: { reason: error instanceof Error ? error.message : "Workbook import failed" },
      });
    }
    if (isRateLimitError(error)) {
      return { success: false, error: "Too many workbook import attempts. Try again in a few minutes." } as const;
    }
    return { success: false, error: error instanceof Error ? error.message : "Workbook import failed. Check facilitator email, selected sheets, and workbook structure." } as const;
  }
}
