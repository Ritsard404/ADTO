import type { InventoryCondition, ProjectStatus, SessionStatus, UserRole } from "@/generated/prisma/enums";
import { mockAssignments } from "@/lib/mock-adms-data";
import { prisma } from "@/lib/prisma";
import { assertWritableDataMode, isMockDataMode } from "@/lib/runtime-mode";

export type ActiveProfile = {
  id: string;
  email?: string;
  fullName: string;
  role: UserRole;
};

type DailyLogRowInput = {
  sessionId: string;
  title: string;
  status: SessionStatus;
  actualDate?: string;
  delivery?: string;
  completion?: string;
  remarks?: string;
  evidenceName?: string;
  evidenceUrl?: string;
  projectTitle?: string;
  projectUrl?: string;
};

type EvidenceLinkRowInput = {
  schoolId: string;
  sessionId?: string;
  projectId?: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  description?: string;
};

function parseOptionalDate(value?: string) {
  return value ? new Date(value) : null;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

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

  if (profile.role === "SCHOOL_ADMIN") {
    const memberships = await prisma.schoolMembership.findMany({
      where: { profileId: profile.id, status: "ACTIVE" },
      select: { schoolId: true },
    });

    if (memberships.length) {
      return memberships.map((membership) => membership.schoolId);
    }

    const fallbackSchools = await prisma.school.findMany({
      where: { contactEmail: { equals: profile.email ?? "", mode: "insensitive" } },
      select: { id: true },
    });

    return fallbackSchools.map((school) => school.id);
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
    quickInsights?: string;
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
        input.quickInsights ? `Quick Insights: ${input.quickInsights}` : "",
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

export async function bulkUpdateSessionDailyLogsForProfile(profile: ActiveProfile, rows: DailyLogRowInput[]) {
  assertWritableDataMode();

  if (profile.role === "ADMIN") {
    throw new Error("Admins can view coding sessions but cannot modify daily facilitator logs.");
  }

  if (!rows.length) {
    return { updated: 0, evidenceCreated: 0, projectsLinked: 0, warnings: ["No rows were submitted."] };
  }

  if (rows.length > 100) {
    throw new Error("Save daily logs in batches of 100 rows or fewer.");
  }

  const sessionIds = Array.from(new Set(rows.map((row) => row.sessionId)));
  const sessions = await prisma.aCESession.findMany({
    where: { id: { in: sessionIds } },
    select: {
      id: true,
      schoolId: true,
      scheduledDate: true,
      gradeLevel: true,
      section: true,
      subject: true,
      teacher: true,
      activity: true,
    },
  });
  const sessionsById = new Map(sessions.map((session) => [session.id, session]));

  if (sessions.length !== sessionIds.length) {
    throw new Error("Some daily log rows reference sessions that no longer exist.");
  }

  const schoolIds = Array.from(new Set(sessions.map((session) => session.schoolId)));
  for (const schoolId of schoolIds) {
    await assertCanAccessSchool(profile, schoolId);
  }

  let updated = 0;
  let evidenceCreated = 0;
  let projectsLinked = 0;
  const warnings: string[] = [];

  for (const batch of chunk(rows, 25)) {
    await prisma.$transaction(async (tx) => {
      for (const row of batch) {
        const session = sessionsById.get(row.sessionId);
        if (!session) continue;

        await tx.aCESession.update({
          where: { id: row.sessionId },
          data: {
            title: row.title,
            status: row.status,
            actualDate: parseOptionalDate(row.actualDate),
            delivery: row.delivery || null,
            completion: row.completion || null,
            remarks: row.remarks || null,
          },
        });
        updated += 1;

        if (row.evidenceUrl) {
          const duplicateEvidence = await tx.mediaUpload.findFirst({
            where: { schoolId: session.schoolId, sessionId: row.sessionId, fileUrl: row.evidenceUrl },
            select: { id: true },
          });
          if (!duplicateEvidence) {
            await tx.mediaUpload.create({
              data: {
                schoolId: session.schoolId,
                sessionId: row.sessionId,
                uploadedById: profile.id,
                fileName: row.evidenceName || `${row.title} evidence`,
                fileUrl: row.evidenceUrl,
                fileType: "Drive link",
                description: row.remarks || null,
              },
            });
            evidenceCreated += 1;
          }
        }

        if (row.projectUrl || row.projectTitle) {
          const title = row.projectTitle || `${session.gradeLevel} ${session.section} output ${session.scheduledDate.toISOString().slice(0, 10)}`;
          await tx.aCEProject.upsert({
            where: {
              schoolId_title_gradeLevel_section: {
                schoolId: session.schoolId,
                title,
                gradeLevel: session.gradeLevel,
                section: session.section,
              },
            },
            update: {
              sessionId: row.sessionId,
              projectUrl: row.projectUrl || undefined,
              remarks: row.remarks || undefined,
              status: "SUBMITTED",
            },
            create: {
              schoolId: session.schoolId,
              sessionId: row.sessionId,
              title,
              gradeLevel: session.gradeLevel,
              section: session.section,
              teacher: session.teacher,
              projectType: session.activity,
              projectUrl: row.projectUrl || null,
              remarks: row.remarks || null,
              status: "SUBMITTED",
              submittedAt: parseOptionalDate(row.actualDate) ?? new Date(),
            },
          });
          projectsLinked += 1;
        }

        if (!session.teacher || !session.subject || !row.completion) {
          warnings.push(`${session.gradeLevel} ${session.section} needs teacher, subject, or completion review.`);
        }
      }
    });
  }

  return {
    updated,
    evidenceCreated,
    projectsLinked,
    warnings: Array.from(new Set(warnings)).slice(0, 8),
  };
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
    students?: string;
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
    students: input.students || null,
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
  input: {
    itemId: string;
    condition: InventoryCondition;
    quantity: number;
    issuedQuantity?: number;
    totalQuantity?: number;
    borrowedStatus?: string;
    completenessStatus?: string;
    facilitatorSignOff?: string;
    remarks?: string;
  },
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
        issuedQuantity: input.issuedQuantity ?? null,
        totalQuantity: input.totalQuantity ?? input.quantity,
        borrowedStatus: input.borrowedStatus || null,
        completenessStatus: input.completenessStatus || null,
        facilitatorSignOff: input.facilitatorSignOff || profile.fullName,
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

export async function createEvidenceLinkForProfile(
  profile: ActiveProfile,
  input: {
    schoolId: string;
    sessionId?: string;
    projectId?: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    description?: string;
  },
) {
  return createEvidenceRecordForProfile(profile, input);
}

export async function assertCanCreateEvidenceForProfile(
  profile: ActiveProfile,
  input: {
    schoolId: string;
    sessionId?: string;
    projectId?: string;
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

  if (input.projectId) {
    const project = await prisma.aCEProject.findUnique({ where: { id: input.projectId }, select: { schoolId: true } });
    if (!project || project.schoolId !== input.schoolId) {
      throw new Error("Selected project does not belong to the selected school.");
    }
  }
}

export async function createEvidenceRecordForProfile(
  profile: ActiveProfile,
  input: {
    schoolId: string;
    sessionId?: string;
    projectId?: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    description?: string;
  },
) {
  await assertCanCreateEvidenceForProfile(profile, input);

  return prisma.mediaUpload.create({
    data: {
      schoolId: input.schoolId,
      sessionId: input.sessionId || null,
      projectId: input.projectId || null,
      uploadedById: profile.id,
      fileName: input.fileName,
      fileUrl: input.fileUrl,
      fileType: input.fileType,
      description: input.description || null,
    },
  });
}

export async function bulkCreateEvidenceLinksForProfile(profile: ActiveProfile, rows: EvidenceLinkRowInput[]) {
  assertWritableDataMode();

  if (!rows.length) {
    return { created: 0, skipped: 0 };
  }

  if (rows.length > 75) {
    throw new Error("Save evidence links in batches of 75 rows or fewer.");
  }

  const schoolIds = Array.from(new Set(rows.map((row) => row.schoolId)));
  for (const schoolId of schoolIds) {
    await assertCanAccessSchool(profile, schoolId);
  }

  const sessionIds = rows.map((row) => row.sessionId).filter(Boolean) as string[];
  const projectIds = rows.map((row) => row.projectId).filter(Boolean) as string[];
  const [sessions, projects] = await Promise.all([
    sessionIds.length
      ? prisma.aCESession.findMany({ where: { id: { in: sessionIds } }, select: { id: true, schoolId: true } })
      : Promise.resolve([]),
    projectIds.length
      ? prisma.aCEProject.findMany({ where: { id: { in: projectIds } }, select: { id: true, schoolId: true } })
      : Promise.resolve([]),
  ]);
  const sessionSchool = new Map(sessions.map((session) => [session.id, session.schoolId]));
  const projectSchool = new Map(projects.map((project) => [project.id, project.schoolId]));

  let created = 0;
  let skipped = 0;
  for (const batch of chunk(rows, 25)) {
    await prisma.$transaction(async (tx) => {
      for (const row of batch) {
        if (row.sessionId && sessionSchool.get(row.sessionId) !== row.schoolId) {
          skipped += 1;
          continue;
        }
        if (row.projectId && projectSchool.get(row.projectId) !== row.schoolId) {
          skipped += 1;
          continue;
        }

        const duplicate = await tx.mediaUpload.findFirst({
          where: {
            schoolId: row.schoolId,
            fileUrl: row.fileUrl,
            sessionId: row.sessionId || null,
            projectId: row.projectId || null,
          },
          select: { id: true },
        });
        if (duplicate) {
          skipped += 1;
          continue;
        }

        await tx.mediaUpload.create({
          data: {
            schoolId: row.schoolId,
            sessionId: row.sessionId || null,
            projectId: row.projectId || null,
            uploadedById: profile.id,
            fileName: row.fileName,
            fileUrl: row.fileUrl,
            fileType: row.fileType,
            description: row.description || null,
          },
        });
        created += 1;
      }
    });
  }

  return { created, skipped };
}
