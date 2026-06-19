"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  assignmentEndSchema,
  assignmentUpsertSchema,
  schoolUpdateSchema,
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/validations/admin";

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

export async function updateSchoolAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const input = schoolUpdateSchema.parse(formDataToObject(formData));

  await prisma.school.update({
    where: { id: input.schoolId },
    data: {
      name: input.name,
      address: input.address,
      contactPerson: input.contactPerson,
      contactEmail: input.contactEmail || null,
      schoolYear: input.schoolYear,
      status: input.status,
    },
  });

  revalidatePath("/schools");
  revalidatePath("/dashboard");
}

export async function upsertAssignmentAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const input = assignmentUpsertSchema.parse(formDataToObject(formData));

  if (input.status === "ACTIVE") {
    await prisma.facilitatorAssignment.updateMany({
      where: {
        schoolId: input.schoolId,
        status: "ACTIVE",
        id: input.assignmentId ? { not: input.assignmentId } : undefined,
      },
      data: { status: "ENDED", endDate: new Date() },
    });
  }

  const data = {
    schoolId: input.schoolId,
    facilitatorId: input.facilitatorId,
    startDate: new Date(input.startDate),
    endDate: input.endDate ? new Date(input.endDate) : null,
    status: input.status,
  };

  if (input.assignmentId) {
    await prisma.facilitatorAssignment.update({ where: { id: input.assignmentId }, data });
  } else {
    await prisma.facilitatorAssignment.create({ data });
  }

  revalidatePath("/facilitators");
  revalidatePath("/schools");
  revalidatePath("/dashboard");
}

export async function endAssignmentAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const input = assignmentEndSchema.parse(formDataToObject(formData));

  await prisma.facilitatorAssignment.update({
    where: { id: input.assignmentId },
    data: { status: "ENDED", endDate: new Date() },
  });

  revalidatePath("/facilitators");
  revalidatePath("/schools");
  revalidatePath("/dashboard");
}

export async function createUserAction(formData: FormData) {
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
