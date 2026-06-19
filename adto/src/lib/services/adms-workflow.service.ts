import type { InventoryCondition, ProjectStatus, SessionStatus, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type ActiveProfile = {
  id: string;
  fullName: string;
  role: UserRole;
};

export async function getAccessibleSchoolIds(profile: ActiveProfile) {
  if (profile.role === "ADMIN") {
    return null;
  }

  const assignments = await prisma.facilitatorAssignment.findMany({
    where: { facilitatorId: profile.id, status: "ACTIVE" },
    select: { schoolId: true },
  });

  return assignments.map((assignment) => assignment.schoolId);
}

async function assertCanAccessSchool(profile: ActiveProfile, schoolId: string) {
  if (profile.role === "ADMIN") {
    return;
  }

  const assignment = await prisma.facilitatorAssignment.findFirst({
    where: { facilitatorId: profile.id, schoolId, status: "ACTIVE" },
    select: { id: true },
  });

  if (!assignment) {
    throw new Error("You do not have access to update this school's ADMS records.");
  }
}

export async function updateSessionForProfile(
  profile: ActiveProfile,
  input: { sessionId: string; title: string; status: SessionStatus; actualDate?: string; remarks?: string },
) {
  if (profile.role === "ADMIN") {
    throw new Error("Admins can view coding sessions but cannot modify them. Session updates are handled by facilitators.");
  }

  const session = await prisma.aCESession.findUnique({
    where: { id: input.sessionId },
    select: { schoolId: true },
  });

  if (!session) {
    throw new Error("Session not found.");
  }

  await assertCanAccessSchool(profile, session.schoolId);

  return prisma.aCESession.update({
    where: { id: input.sessionId },
    data: {
      title: input.title,
      status: input.status,
      actualDate: input.actualDate ? new Date(input.actualDate) : null,
      remarks: input.remarks || null,
    },
  });
}

export async function upsertProjectForProfile(
  profile: ActiveProfile,
  input: {
    projectId?: string;
    schoolId: string;
    sessionId?: string;
    title: string;
    term?: string;
    gradeLevel?: string;
    section?: string;
    teacher?: string;
    projectType?: string;
    description?: string;
    projectUrl?: string;
    remarks?: string;
    status: ProjectStatus;
    submittedAt?: string;
  },
) {
  await assertCanAccessSchool(profile, input.schoolId);

  if (input.sessionId) {
    const session = await prisma.aCESession.findUnique({ where: { id: input.sessionId }, select: { schoolId: true } });
    if (!session || session.schoolId !== input.schoolId) {
      throw new Error("Selected session does not belong to the selected school.");
    }
  }

  const data = {
    schoolId: input.schoolId,
    sessionId: input.sessionId || null,
    title: input.title,
    term: input.term || null,
    gradeLevel: input.gradeLevel || null,
    section: input.section || null,
    teacher: input.teacher || null,
    projectType: input.projectType || null,
    description: input.description || null,
    projectUrl: input.projectUrl || null,
    remarks: input.remarks || null,
    status: input.status,
    submittedAt: input.submittedAt ? new Date(input.submittedAt) : null,
  };

  if (input.projectId) {
    const existing = await prisma.aCEProject.findUnique({ where: { id: input.projectId }, select: { schoolId: true } });
    if (!existing) {
      throw new Error("Project not found.");
    }
    await assertCanAccessSchool(profile, existing.schoolId);
    return prisma.aCEProject.update({ where: { id: input.projectId }, data });
  }

  const duplicate = await prisma.aCEProject.findFirst({
    where: {
      schoolId: input.schoolId,
      title: input.title,
      gradeLevel: input.gradeLevel || null,
      section: input.section || null,
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new Error("A matching project already exists for this school, grade, and section.");
  }

  return prisma.aCEProject.create({ data });
}

export async function verifyInventoryForProfile(
  profile: ActiveProfile,
  input: { itemId: string; condition: InventoryCondition; quantity: number; remarks?: string },
) {
  const item = await prisma.inventoryItem.findUnique({
    where: { id: input.itemId },
    select: { schoolId: true, remarks: true },
  });

  if (!item) {
    throw new Error("Inventory item not found.");
  }

  await assertCanAccessSchool(profile, item.schoolId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.inventoryItem.update({
      where: { id: input.itemId },
      data: {
        condition: input.condition,
        quantity: input.quantity,
        remarks: input.remarks || null,
        lastCheckedAt: new Date(),
        lastCheckedBy: profile.fullName,
      },
    });

    await tx.inventoryCheck.create({
      data: {
        itemId: input.itemId,
        checkedBy: profile.fullName,
        condition: input.condition,
        quantity: input.quantity,
        remarks: input.remarks || null,
      },
    });

    if ((item.remarks || "") !== (input.remarks || "")) {
      await tx.inventoryRemarkHistory.create({
        data: {
          itemId: input.itemId,
          updatedBy: profile.fullName,
          oldRemarks: item.remarks,
          newRemarks: input.remarks || null,
        },
      });
    }

    return updated;
  });
}
