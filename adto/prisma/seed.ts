import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const admin = await prisma.profile.upsert({
    where: { email: "admin@adto.local" },
    update: {},
    create: {
      email: "admin@adto.local",
      fullName: "ADTO System Admin",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const facilitator = await prisma.profile.upsert({
    where: { email: "facilitator@adto.local" },
    update: {},
    create: {
      email: "facilitator@adto.local",
      fullName: "Sample ACE Facilitator",
      role: "FACILITATOR",
      status: "ACTIVE",
    },
  });

  const school = await prisma.school.upsert({
    where: { id: "sample-school-cic-gorordo" },
    update: {},
    create: {
      id: "sample-school-cic-gorordo",
      name: "Colegio de la Immaculada Concepcion - Gorordo",
      address: "Gorordo Avenue, Cebu City",
      contactPerson: "Sample School Coordinator",
      contactEmail: "school-admin@adto.local",
      schoolYear: "2025-2026",
      status: "ACTIVE",
    },
  });

  await prisma.facilitatorAssignment.upsert({
    where: { id: "sample-assignment-cic-gorordo" },
    update: {},
    create: {
      id: "sample-assignment-cic-gorordo",
      facilitatorId: facilitator.id,
      schoolId: school.id,
      startDate: new Date("2025-06-01"),
      status: "ACTIVE",
    },
  });

  await prisma.aCESession.upsert({
    where: { id: "sample-session-001" },
    update: {},
    create: {
      id: "sample-session-001",
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
    where: { id: "sample-kit-001" },
    update: {},
    create: {
      id: "sample-kit-001",
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
