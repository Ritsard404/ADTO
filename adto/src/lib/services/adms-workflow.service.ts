import type { InventoryCondition, ProjectStatus, SessionStatus, UserRole } from "@/generated/prisma/enums";
import { mockAssignments } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { assertWritableDataMode, isMockDataMode } from "@/lib/runtime-mode";

export type ActiveProfile = {
  id: string;
  fullName: string;
  role: UserRole;
};

export async function getAccessibleSchoolIds(profile: ActiveProfile) {
  if (profile.role === "ADMIN") {
    return null;
  }

  if (isMockDataMode()) {
    if (profile.role === "SCHOOL_ADMIN") {
      return ["mock-cic-gorordo"];
    }
    return mockAssignments.filter((assignment) => assignment.facilitatorId === profile.id && assignment.status === "ACTIVE").map((assignment) => assignment.schoolId);
  }

  const assignments = await prisma.facilitatorAssignment.findMany({
    where: { facilitatorId: profile.id, status: "ACTIVE" },
    select: { schoolId: true },
  });

  return assignments.map((assignment) => assignment.schoolId);
}

export async function assertCanAccessSchool(profile: ActiveProfile, schoolId: string) {
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

export async function createSessionForFacilitator(
  profile: ActiveProfile,
  input: {
    schoolId: string;
    title: string;
    gradeLevel: string;
    section: string;
    sessionNumber: number;
    scheduledDate: string;
    startTime?: string;
    durationHours?: number;
    subject?: string;
    teacher?: string;
    activity?: string;
    delivery?: string;
    remarks?: string;
  },
) {
  assertWritableDataMode();
  await assertCanAccessSchool(profile, input.schoolId);

  return prisma.aCESession.create({
    data: {
      schoolId: input.schoolId,
      facilitatorId: profile.id,
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
      status: "NOT_STARTED",
    },
  });
}

export async function upsertSectionForFacilitator(
  profile: ActiveProfile,
  input: {
    sectionId?: string;
    schoolId: string;
    schoolYear: string;
    gradeLevel: string;
    sectionName: string;
    adviserName?: string;
    maleStudents: number;
    femaleStudents: number;
    isActive: "true" | "false";
  },
) {
  assertWritableDataMode();
  await assertCanAccessSchool(profile, input.schoolId);
  const data = {
    schoolId: input.schoolId,
    schoolYear: input.schoolYear,
    gradeLevel: input.gradeLevel,
    sectionName: input.sectionName,
    adviserName: input.adviserName || null,
    maleStudents: input.maleStudents,
    femaleStudents: input.femaleStudents,
    totalStudents: input.maleStudents + input.femaleStudents,
    isActive: input.isActive === "true",
  };

  if (input.sectionId) {
    return prisma.schoolSection.update({ where: { id: input.sectionId }, data });
  }

  return prisma.schoolSection.upsert({
    where: {
      schoolId_schoolYear_gradeLevel_sectionName: {
        schoolId: input.schoolId,
        schoolYear: input.schoolYear,
        gradeLevel: input.gradeLevel,
        sectionName: input.sectionName,
      },
    },
    update: data,
    create: data,
  });
}

export async function createTeacherForFacilitator(
  profile: ActiveProfile,
  input: {
    schoolId: string;
    fullName: string;
    department?: string;
    email?: string;
    contactNumber?: string;
    position?: string;
    employmentStatus?: string;
    gradeLevel?: string;
    sectionId?: string;
    schoolYear?: string;
    subject?: string;
  },
) {
  assertWritableDataMode();
  await assertCanAccessSchool(profile, input.schoolId);

  return prisma.$transaction(async (tx) => {
    const teacher = await tx.teacher.create({
      data: {
        fullName: input.fullName,
        department: input.department || null,
        email: input.email || null,
        contactNumber: input.contactNumber || null,
        position: input.position || null,
        employmentStatus: input.employmentStatus || null,
      },
    });

    if (input.gradeLevel && input.schoolYear && input.subject) {
      await tx.teacherAssignment.create({
        data: {
          teacherId: teacher.id,
          schoolId: input.schoolId,
          sectionId: input.sectionId || null,
          schoolYear: input.schoolYear,
          gradeLevel: input.gradeLevel,
          subject: input.subject,
        },
      });
    }

    return teacher;
  });
}

export async function createSchoolRemarkForProfile(
  profile: ActiveProfile,
  input: {
    schoolId: string;
    schoolYear: string;
    period: string;
    remarkType: string;
    title: string;
    details: string;
    actionItems?: string;
  },
) {
  assertWritableDataMode();
  await assertCanAccessSchool(profile, input.schoolId);

  return prisma.schoolRemark.create({
    data: {
      ...input,
      actionItems: input.actionItems || null,
      createdBy: profile.id,
    },
  });
}

export async function createMonthlyReportForFacilitator(
  profile: ActiveProfile,
  input: {
    schoolId: string;
    schoolYear: string;
    title: string;
    accomplishments: string;
    challenges?: string;
    recommendations?: string;
    schoolUpdates?: string;
  },
) {
  assertWritableDataMode();
  await assertCanAccessSchool(profile, input.schoolId);

  return prisma.report.create({
    data: {
      schoolId: input.schoolId,
      facilitatorId: profile.id,
      reportType: "Monthly Monitoring",
      title: input.title,
      summary: [
        `Accomplishments: ${input.accomplishments}`,
        input.challenges ? `Challenges: ${input.challenges}` : "",
        input.recommendations ? `Recommendations: ${input.recommendations}` : "",
        input.schoolUpdates ? `School Updates: ${input.schoolUpdates}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  });
}

export async function updateSessionForProfile(
  profile: ActiveProfile,
  input: { sessionId: string; title: string; status: SessionStatus; actualDate?: string; remarks?: string },
) {
  assertWritableDataMode();

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
  assertWritableDataMode();

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
  assertWritableDataMode();

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
