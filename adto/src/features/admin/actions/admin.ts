"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertWritableDataMode } from "@/lib/runtime-mode";
import { createAdminClient } from "@/lib/supabase/admin";
import { importAdmsWorkbookBuffer, inspectAdmsWorkbookBuffer } from "@/features/import-export/services/adms-excel-import";
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
  await requireRole(["ADMIN"]);
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
  await requireRole(["ADMIN"]);
  const parsed = userPasswordUpdateSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Review the password fields and try again." } as const;
  }

  const profile = await prisma.profile.findUnique({
    where: { id: parsed.data.profileId },
    select: { email: true },
  });

  if (!profile) {
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
      return { success: false, error: "This profile does not have a matching Supabase Auth user yet." } as const;
    }

    const { error } = await supabase.auth.admin.updateUserById(authUser.id, { password: parsed.data.password });
    if (error) {
      throw error;
    }

    revalidatePath("/settings");
    return { success: true } as const;
  } catch (error) {
    console.error(error);
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
  try {
    await requireRole(["ADMIN"]);
    const file = await workbookFileFromFormData(formData);
    const sheets = inspectAdmsWorkbookBuffer(await file.arrayBuffer()).map((sheet) => ({
      name: sheet.name,
      hidden: sheet.hidden,
      range: sheet.range,
      sampleRows: sheet.sampleRows.length,
      formulas: sheet.formulas.length,
      firstRow: sheet.sampleRows[0]?.slice(0, 8).map((cell) => String(cell ?? "")) ?? [],
    }));
    return { success: true, fileName: file.name, sheets } as const;
  } catch (error) {
    console.error(error);
    return { success: false, error: error instanceof Error ? error.message : "Workbook preview failed. Confirm the file is a valid ADMS Excel workbook." } as const;
  }
}

export async function runWorkbookImportAction(formData: FormData) {
  try {
    assertWritableDataMode();
    await requireRole(["ADMIN"]);
    const file = await workbookFileFromFormData(formData);
    const facilitatorEmail = String(formData.get("facilitatorEmail") ?? "").trim().toLowerCase();
    if (!facilitatorEmail) {
      throw new Error("Choose the facilitator email that owns imported session rows.");
    }
    const summary = await importAdmsWorkbookBuffer(await file.arrayBuffer(), facilitatorEmail, {
      sourceWorkbookFile: file.name,
      sheets: {
        schoolInfo: formData.get("schoolInfo") === "on",
        sessions: formData.get("sessions") === "on",
        projects: formData.get("projects") === "on",
        inventory: formData.get("inventory") === "on",
      },
    });
    revalidatePath("/dashboard");
    revalidatePath("/imports");
    revalidatePath("/sessions");
    revalidatePath("/reports");
    revalidatePath("/inventory");
    revalidatePath("/media");
    return { success: true, ...summary } as const;
  } catch (error) {
    console.error(error);
    return { success: false, error: error instanceof Error ? error.message : "Workbook import failed. Check facilitator email, selected sheets, and workbook structure." } as const;
  }
}
