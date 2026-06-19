"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertWritableDataMode } from "@/lib/runtime-mode";
import {
  assignmentEndSchema,
  assignmentUpsertSchema,
  activityCategoryCreateSchema,
  adminSessionCreateSchema,
  schoolRemarkCreateSchema,
  schoolYearCreateSchema,
  sectionBulkCreateSchema,
  schoolUpdateSchema,
  teacherAssignmentCreateSchema,
  teacherCreateSchema,
  userCreateSchema,
  userUpdateSchema,
} from "@/features/admin/schemas/admin";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function updateSchoolAction(formData: FormData) {
  assertWritableDataMode();
  await requireRole(["ADMIN"]);
  const input = schoolUpdateSchema.parse(formDataToObject(formData));

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

  await prisma.profile.upsert({
    where: { email: input.email },
    update: {
      fullName: input.fullName,
      role: input.role,
      status: input.status,
    },
    create: input,
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
