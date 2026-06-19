import { prisma } from "@/lib/prisma";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

export async function buildAdminCsvReport(type: string) {
  if (type === "schools") {
    const schools = await prisma.school.findMany({
      include: { assignments: { where: { status: "ACTIVE" }, include: { facilitator: true } } },
      orderBy: { name: "asc" },
    });
    return toCsv(
      ["School", "Address", "Contact", "Email", "School Year", "Status", "Active AF"],
      schools.map((school) => [
        school.name,
        school.address,
        school.contactPerson,
        school.contactEmail,
        school.schoolYear,
        school.status,
        school.assignments.map((assignment) => assignment.facilitator.fullName).join("; "),
      ]),
    );
  }

  if (type === "assignments") {
    const assignments = await prisma.facilitatorAssignment.findMany({
      include: { school: true, facilitator: true },
      orderBy: { startDate: "desc" },
    });
    return toCsv(
      ["School", "Facilitator", "Email", "Start Date", "End Date", "Status"],
      assignments.map((assignment) => [
        assignment.school.name,
        assignment.facilitator.fullName,
        assignment.facilitator.email,
        assignment.startDate.toISOString().slice(0, 10),
        assignment.endDate?.toISOString().slice(0, 10) ?? "",
        assignment.status,
      ]),
    );
  }

  if (type === "projects") {
    const projects = await prisma.aCEProject.findMany({
      include: { school: true, session: true },
      orderBy: { updatedAt: "desc" },
    });
    return toCsv(
      ["School", "Session", "Term", "Grade", "Section", "Teacher", "Type", "Title", "Status", "Submitted", "Remarks", "URL"],
      projects.map((project) => [
        project.school.name,
        project.session?.title ?? "",
        project.term,
        project.gradeLevel,
        project.section,
        project.teacher,
        project.projectType,
        project.title,
        project.status,
        project.submittedAt?.toISOString().slice(0, 10) ?? "",
        project.remarks,
        project.projectUrl,
      ]),
    );
  }

  if (type === "inventory" || type === "inventory-remarks") {
    const items = await prisma.inventoryItem.findMany({
      include: { school: true },
      orderBy: [{ school: { name: "asc" } }, { category: "asc" }, { itemName: "asc" }],
    });
    return toCsv(
      ["School", "Category", "Item", "Quantity", "Unit", "Condition", "Remarks", "Last Checked", "Checked By"],
      items.map((item) => [
        item.school.name,
        item.category,
        item.itemName,
        item.quantity,
        item.unit,
        item.condition,
        item.remarks,
        item.lastCheckedAt?.toISOString().slice(0, 10) ?? "",
        item.lastCheckedBy,
      ]),
    );
  }

  const [schools, facilitators, sessions, projects, inventoryReview] = await Promise.all([
    prisma.school.count(),
    prisma.profile.count({ where: { role: "FACILITATOR" } }),
    prisma.aCESession.count(),
    prisma.aCEProject.count(),
    prisma.inventoryItem.count({ where: { OR: [{ remarks: null }, { condition: { in: ["FAIR", "NEEDS_REPLACEMENT"] } }] } }),
  ]);

  return toCsv(
    ["Metric", "Value"],
    [
      ["Schools", schools],
      ["Facilitators", facilitators],
      ["Coding sessions", sessions],
      ["Projects", projects],
      ["Inventory requiring review", inventoryReview],
    ],
  );
}
