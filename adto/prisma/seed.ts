import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const seed = {
  adminEmail: process.env.SEED_ADMIN_EMAIL ?? "admin@adto.local",
  adminFullName: process.env.SEED_ADMIN_FULL_NAME ?? "ADTO System Admin",
  facilitatorEmail: process.env.SEED_FACILITATOR_EMAIL ?? "facilitator@adto.local",
  facilitatorFullName: process.env.SEED_FACILITATOR_FULL_NAME ?? "Sample ACE Facilitator",
  schoolId: process.env.SEED_SCHOOL_ID ?? "sample-school-cic-gorordo",
  schoolName: process.env.SEED_SCHOOL_NAME ?? "Colegio de la Immaculada Concepcion - Gorordo",
  schoolAddress: process.env.SEED_SCHOOL_ADDRESS ?? "Gorordo Avenue, Cebu City",
  schoolContactPerson: process.env.SEED_SCHOOL_CONTACT_PERSON ?? "Sample School Coordinator",
  schoolContactEmail: process.env.SEED_SCHOOL_CONTACT_EMAIL ?? "school-admin@adto.local",
  schoolYear: process.env.SEED_SCHOOL_YEAR ?? "2025-2026",
  assignmentId: process.env.SEED_ASSIGNMENT_ID ?? "sample-assignment-cic-gorordo",
  sessionId: process.env.SEED_SESSION_ID ?? "sample-session-001",
  inventoryItemId: process.env.SEED_INVENTORY_ITEM_ID ?? "sample-kit-001",
};

async function main() {
  const admin = await prisma.profile.upsert({
    where: { email: seed.adminEmail },
    update: {},
    create: {
      email: seed.adminEmail,
      fullName: seed.adminFullName,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const facilitator = await prisma.profile.upsert({
    where: { email: seed.facilitatorEmail },
    update: {},
    create: {
      email: seed.facilitatorEmail,
      fullName: seed.facilitatorFullName,
      role: "FACILITATOR",
      status: "ACTIVE",
    },
  });

  const school = await prisma.school.upsert({
    where: { id: seed.schoolId },
    update: {},
    create: {
      id: seed.schoolId,
      name: seed.schoolName,
      address: seed.schoolAddress,
      contactPerson: seed.schoolContactPerson,
      contactEmail: seed.schoolContactEmail,
      schoolYear: seed.schoolYear,
      status: "ACTIVE",
    },
  });

  await prisma.facilitatorAssignment.upsert({
    where: { id: seed.assignmentId },
    update: {},
    create: {
      id: seed.assignmentId,
      facilitatorId: facilitator.id,
      schoolId: school.id,
      startDate: new Date("2025-06-01"),
      status: "ACTIVE",
      assignedBy: admin.id,
    },
  });

  await prisma.aCESession.upsert({
    where: { id: seed.sessionId },
    update: {},
    create: {
      id: seed.sessionId,
      schoolId: school.id,
      facilitatorId: facilitator.id,
      title: "ACE Session 1",
      gradeLevel: "Grade 7",
      section: "Section A",
      sessionNumber: 1,
      scheduledDate: new Date("2025-07-01"),
      status: "NOT_STARTED",
      remarks: "Initial seed session for dashboard verification.",
    },
  });

  await prisma.inventoryItem.upsert({
    where: { id: seed.inventoryItemId },
    update: {},
    create: {
      id: seed.inventoryItemId,
      schoolId: school.id,
      itemName: "ACE Learning Kit",
      category: "Kit",
      quantity: 25,
      condition: "GOOD",
      remarks: "Seed inventory item.",
    },
  });

  console.log({ admin: admin.email, facilitator: facilitator.email, school: school.name });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
