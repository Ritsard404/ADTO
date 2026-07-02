import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

const SESSION_SOURCE_SHEET = "CleanedData";
const PROJECT_SOURCE_SHEET = "Projects";
const SCHOOL_INFO_SHEET = "School_Info";
const ADOPTION_DETAILS_SHEET = "AdoptionDetails";
const INVENTORY_SHEETS = ["GS-i", "HS-i"];
const SOURCE_WORKBOOK_FILE = "Colegio de la Immaculada Concepcion - Gorordo - ACE Sessions 2025 -2026.xlsx";

type ImportSummary = {
  rowsRead: number;
  rowsImported: number;
  rowsSkipped: number;
  rowsCreated: number;
  rowsUpdated: number;
  validationErrors: string[];
  warnings: string[];
  detailCounts: {
    schools: number;
    schoolYears: number;
    sections: number;
    teachers: number;
    teacherAssignments: number;
    sessions: number;
    projects: number;
    inventoryItems: number;
  };
  sheetSummaries: Record<string, SheetImportSummary>;
  schoolId?: string;
  schoolName?: string;
  sourceWorkbookFile?: string;
};

type SheetImportSummary = {
  rowsRead: number;
  rowsImported: number;
  rowsSkipped: number;
  rowsCreated: number;
  rowsUpdated: number;
};

type ParsedTeacherAssignment = {
  subject: string;
  gradeLevel: string;
  sectionName: string | null;
};

type SchoolMetadata = {
  id: string;
  name: string;
  address: string;
  contactPerson: string;
  schoolYear: string;
  schoolCode: string | null;
  deployedFormId: string | null;
  team: string | null;
  unitHead: string | null;
  supervisor: string | null;
  edtechSpecialist: string | null;
  gradeLevelAdoption: string | null;
  adoptionYear: string | null;
  implementationYear: string | null;
  adoptionType: string | null;
  scheduleArrangement: string | null;
  hardwareAllocation: string | null;
};

type ImportOperation = "created" | "updated";

type SchoolInfoPlanningContext = {
  schoolId: string;
  schoolYear: string;
  sourceWorkbookFile: string;
  sourceDeployedFormId: string | null;
  sectionIdsByKey: Map<string, string>;
};

export type AdmsWorkbookImportOptions = {
  sourceWorkbookFile?: string;
  checksum?: string;
  sheets?: {
    schoolInfo?: boolean;
    sessions?: boolean;
    projects?: boolean;
    inventory?: boolean;
  };
};

function selectedSheetOptions(options: AdmsWorkbookImportOptions) {
  return {
    schoolInfo: options.sheets?.schoolInfo ?? true,
    sessions: options.sheets?.sessions ?? true,
    projects: options.sheets?.projects ?? true,
    inventory: options.sheets?.inventory ?? true,
  };
}

function assertAnySelectedSheet(selectedSheets: ReturnType<typeof selectedSheetOptions>) {
  if (!selectedSheets.schoolInfo && !selectedSheets.sessions && !selectedSheets.projects && !selectedSheets.inventory) {
    throw new Error("Select at least one workbook area to import.");
  }
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function cleanText(value: unknown) {
  const raw = text(value).replace(/\s+/g, " ").trim();
  return raw === "N/A" || raw === "-" ? "" : raw;
}

function stripLabel(value: unknown, label: string) {
  const raw = cleanText(value);
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return raw.replace(new RegExp(`^${escaped}\\s*:?\\s*`, "i"), "").trim();
}

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    return parsed ? new Date(parsed.y, parsed.m - 1, parsed.d) : null;
  }

  const raw = cleanText(value);
  if (!raw) return null;

  const serial = Number(raw.replace(/,/g, ""));
  if (Number.isFinite(serial) && serial > 30000 && serial < 60000) {
    const parsed = XLSX.SSF.parse_date_code(serial);
    return parsed ? new Date(parsed.y, parsed.m - 1, parsed.d) : null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseNumber(value: unknown) {
  const parsed = Number(cleanText(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function slugId(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "adms-school"
  );
}

function sourceKeyPart(value: string) {
  return (
    cleanText(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "unknown"
  );
}

function normalizeGradeLevel(value: string) {
  const grade = cleanText(value).match(/(?:grade|gr|g)?\s*(\d{1,2})/i)?.[1];
  return grade ? `Grade ${Number(grade)}` : cleanText(value) || "Mixed";
}

function gradeLookupKey(value: string) {
  return cleanText(value).match(/\d{1,2}/)?.[0] ?? cleanText(value).toLowerCase();
}

function sectionLookupKey(value: string) {
  return cleanText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
}

function parseSectionToken(value: string) {
  const raw = cleanText(value);
  const match = raw.match(/^(?:Grade\s*)?(?:Gr|G)?\s*(\d{1,2})\s+(.+)$/i);
  if (!match) return null;
  return {
    gradeLevel: `Grade ${Number(match[1])}`,
    sectionName: cleanText(match[2]).toUpperCase(),
  };
}

function parseTeacherSubjectAssignments(value: unknown): ParsedTeacherAssignment[] {
  const rows = text(value)
    .split(/\r?\n/)
    .map((line) => cleanText(line))
    .filter(Boolean);

  return rows.flatMap<ParsedTeacherAssignment>((line) => {
    const subject = cleanText(line.replace(/\([^)]*\)/g, " ")) || "ACE Participation";
    const groups = Array.from(line.matchAll(/\(([^()]+)\)/g)).map((match) => cleanText(match[1]));
    const sectionGroup = groups.reverse().find((group) => /\b(?:Grade\s*)?(?:Gr|G)?\s*\d{1,2}\s+[A-Za-z]/i.test(group));
    const gradeLevel = normalizeGradeLevel(subject);

    if (!sectionGroup) {
      return [{ subject, gradeLevel, sectionName: null }];
    }

    const sections = sectionGroup
      .split(",")
      .map(parseSectionToken)
      .filter((section): section is NonNullable<ReturnType<typeof parseSectionToken>> => Boolean(section));

    if (!sections.length) {
      return [{ subject, gradeLevel, sectionName: null }];
    }

    return sections.map((section) => ({
      subject,
      gradeLevel: section.gradeLevel,
      sectionName: section.sectionName,
    }));
  });
}

function pushValidation(summary: ImportSummary, message: string) {
  if (!summary.validationErrors.includes(message) && summary.validationErrors.length < 20) {
    summary.validationErrors.push(message);
  }
}

function pushWarning(summary: ImportSummary, message: string) {
  if (!summary.warnings.includes(message) && summary.warnings.length < 20) {
    summary.warnings.push(message);
  }
}

function createImportSummary(): ImportSummary {
  return {
    rowsRead: 0,
    rowsImported: 0,
    rowsSkipped: 0,
    rowsCreated: 0,
    rowsUpdated: 0,
    validationErrors: [],
    warnings: [],
    detailCounts: {
      schools: 0,
      schoolYears: 0,
      sections: 0,
      teachers: 0,
      teacherAssignments: 0,
      sessions: 0,
      projects: 0,
      inventoryItems: 0,
    },
    sheetSummaries: {},
  };
}

function sheetSummary(summary: ImportSummary, sheetName: string) {
  summary.sheetSummaries[sheetName] ??= { rowsRead: 0, rowsImported: 0, rowsSkipped: 0, rowsCreated: 0, rowsUpdated: 0 };
  return summary.sheetSummaries[sheetName];
}

function countRead(summary: ImportSummary, sheetName: string, amount = 1) {
  summary.rowsRead += amount;
  sheetSummary(summary, sheetName).rowsRead += amount;
}

function countImported(summary: ImportSummary, sheetName: string, amount = 1) {
  summary.rowsImported += amount;
  sheetSummary(summary, sheetName).rowsImported += amount;
}

function countMutation(summary: ImportSummary, sheetName: string, operation: ImportOperation, amount = 1) {
  countImported(summary, sheetName, amount);
  if (operation === "created") {
    summary.rowsCreated += amount;
    sheetSummary(summary, sheetName).rowsCreated += amount;
  } else {
    summary.rowsUpdated += amount;
    sheetSummary(summary, sheetName).rowsUpdated += amount;
  }
}

function countSkipped(summary: ImportSummary, sheetName: string, amount = 1) {
  summary.rowsSkipped += amount;
  sheetSummary(summary, sheetName).rowsSkipped += amount;
}

function worksheet(workbook: XLSX.WorkBook, sheetName: string, summary: ImportSummary, required = false) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    const message = `Missing sheet: ${sheetName}`;
    if (required) {
      throw new Error(message);
    }
    pushValidation(summary, message);
    return null;
  }
  return sheet;
}

function sheetRows(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
}

function firstDataRow(workbook: XLSX.WorkBook) {
  const sheet = workbook.Sheets[SESSION_SOURCE_SHEET];
  if (!sheet) return null;
  return (
    XLSX.utils
      .sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false })
      .find((row) => cleanText(row["School Code"]) || cleanText(row["Deployed Form"])) ?? null
  );
}

function extractSchoolYear(workbook: XLSX.WorkBook) {
  for (const sheetName of [PROJECT_SOURCE_SHEET, "Usage QuickView", ADOPTION_DETAILS_SHEET, SCHOOL_INFO_SHEET]) {
    for (const row of sheetRows(workbook, sheetName).slice(0, 30)) {
      for (const cell of row) {
        const match = cleanText(cell).match(/(?:S\.?\s*Y\.?|school year)\s*([0-9]{4}\s*[-–—]\s*[0-9]{4})/i);
        if (match?.[1]) {
          return match[1].replace(/\s*[-–—]\s*/, " - ");
        }
      }
    }
  }

  return "2025 - 2026";
}

function extractMetadata(workbook: XLSX.WorkBook, facilitatorName: string): SchoolMetadata {
  const adoptionRows = sheetRows(workbook, ADOPTION_DETAILS_SHEET);
  const usageRows = sheetRows(workbook, "Usage QuickView");
  const gsInventoryRows = sheetRows(workbook, "GS-i");
  const cleanData = firstDataRow(workbook);

  const schoolName =
    cleanText(adoptionRows[3]?.[3]) ||
    cleanText(adoptionRows[0]?.[8]) ||
    cleanText(usageRows[8]?.[6]) ||
    cleanText(gsInventoryRows[0]?.[2]);
  const schoolCode = stripLabel(adoptionRows[2]?.[9], "School ID") || cleanText(cleanData?.["School Code"]);
  const deployedFormId =
    stripLabel(adoptionRows[3]?.[9], "Deployed Form") ||
    cleanText(cleanData?.["Deployed Form"]) ||
    cleanText(adoptionRows[0]?.[9]);

  if (!schoolName) {
    throw new Error("Could not find the school name in AdoptionDetails or Usage QuickView.");
  }

  const id = slugId(schoolCode || deployedFormId || schoolName);

  return {
    id,
    name: schoolName,
    address: cleanText(gsInventoryRows[2]?.[3]) || "From ADMS workbook",
    contactPerson: cleanText(adoptionRows[7]?.[8]) || facilitatorName,
    schoolYear: extractSchoolYear(workbook),
    schoolCode: schoolCode || null,
    deployedFormId: deployedFormId || null,
    team: cleanText(adoptionRows[2]?.[8]) || null,
    unitHead: cleanText(adoptionRows[3]?.[8]) || null,
    supervisor: cleanText(adoptionRows[4]?.[8]) || null,
    edtechSpecialist: cleanText(adoptionRows[5]?.[8]) || null,
    gradeLevelAdoption: cleanText(adoptionRows[5]?.[3]) || null,
    adoptionYear: cleanText(adoptionRows[7]?.[3]) || null,
    implementationYear: cleanText(adoptionRows[9]?.[3]) || null,
    adoptionType: cleanText(adoptionRows[8]?.[3]) || null,
    scheduleArrangement: cleanText(adoptionRows[11]?.[3]) || null,
    hardwareAllocation: cleanText(adoptionRows[10]?.[3]) || null,
  };
}

function mapSessionStatus(completion: string, remarks: string) {
  const joined = `${completion} ${remarks}`.toLowerCase();
  if (joined.includes("cancel")) return "CANCELLED" as const;
  if (joined.includes("complete") || joined.includes("done")) return "COMPLETED" as const;
  return "NOT_STARTED" as const;
}

function mapInventoryCondition(working: string, notWorking: string, complete: string, incomplete: string) {
  if (notWorking.toLowerCase() === "true") return "NEEDS_REPLACEMENT" as const;
  if (incomplete.toLowerCase() === "true") return "FAIR" as const;
  if (working.toLowerCase() === "true" && complete.toLowerCase() === "true") return "GOOD" as const;
  return "FAIR" as const;
}

function extractProjectGrade(section: string, gradeLevel: string, students: string) {
  return gradeLevel || section.match(/Grade\s*\d+|G\d+/i)?.[0] || students.match(/Grade\s*\d+|G\d+/i)?.[0] || "";
}

function isInventoryFooter(itemName: string) {
  const normalized = itemName.toLowerCase();
  return normalized.includes("prepared by") || normalized.includes("received by") || normalized === "date:";
}

function findColumn(row: unknown[] | undefined, label: string) {
  return row?.findIndex((cell) => cleanText(cell).toLowerCase() === label.toLowerCase()) ?? -1;
}

function findHeaderRow(rows: unknown[][], labels: string[]) {
  return rows.findIndex((row) => labels.every((label) => findColumn(row, label) >= 0));
}

export function inspectAdmsWorkbook(workbookPath: string) {
  const workbook = XLSX.readFile(workbookPath, { cellFormula: true, cellDates: true, sheetStubs: true });
  return inspectWorkbook(workbook);
}

export function inspectAdmsWorkbookBuffer(workbookBuffer: ArrayBuffer) {
  const workbook = XLSX.read(workbookBuffer, { cellFormula: true, cellDates: true, sheetStubs: true });
  return inspectWorkbook(workbook);
}

function inspectWorkbook(workbook: XLSX.WorkBook) {
  return workbook.SheetNames.map((name, index) => {
    const worksheetForName = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheetForName, { header: 1, defval: "", blankrows: false, raw: false });
    const formulas = Object.entries(worksheetForName)
      .filter(([address, cell]) => !address.startsWith("!") && typeof cell === "object" && cell != null && "f" in cell)
      .slice(0, 10)
      .map(([address, cell]) => ({ address, formula: (cell as XLSX.CellObject).f }));

    return {
      name,
      hidden: workbook.Workbook?.Sheets?.[index]?.Hidden ?? 0,
      range: worksheetForName["!ref"] ?? "",
      mergedRanges: (worksheetForName["!merges"] ?? []).map((range) => XLSX.utils.encode_range(range)),
      sampleRows: rows.slice(0, 12),
      formulas,
    };
  });
}

export async function importAdmsWorkbook(workbookPath: string, facilitatorEmail: string) {
  const workbook = XLSX.readFile(workbookPath, { cellDates: true, raw: false });
  return importAdmsWorkbookObject(workbook, facilitatorEmail, { sourceWorkbookFile: SOURCE_WORKBOOK_FILE });
}

export async function importAdmsWorkbookBuffer(workbookBuffer: ArrayBuffer, facilitatorEmail: string, options: AdmsWorkbookImportOptions = {}) {
  const workbook = XLSX.read(workbookBuffer, { cellDates: true, raw: false });
  return importAdmsWorkbookObject(workbook, facilitatorEmail, options);
}

export async function previewAdmsWorkbookImportBuffer(
  workbookBuffer: ArrayBuffer,
  facilitatorEmail: string,
  options: AdmsWorkbookImportOptions = {},
) {
  const workbook = XLSX.read(workbookBuffer, { cellDates: true, raw: false });
  const summary = createImportSummary();
  const sourceWorkbookFile = options.sourceWorkbookFile || SOURCE_WORKBOOK_FILE;
  const selectedSheets = selectedSheetOptions(options);
  assertAnySelectedSheet(selectedSheets);

  const facilitator = await prisma.profile.findUnique({
    where: { email: facilitatorEmail },
    select: { id: true, fullName: true, email: true },
  });
  if (!facilitator) {
    pushWarning(summary, `Facilitator profile not found: ${facilitatorEmail || "not selected"}. Import will fail until a valid facilitator is selected.`);
  }

  if (options.checksum) {
    const previousCompletedBatch = await prisma.workbookImportBatch.findFirst({
      where: { checksum: options.checksum, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { fileName: true, schoolName: true, completedAt: true },
    });
    if (previousCompletedBatch) {
      pushWarning(
        summary,
        `This checksum matches a completed import${previousCompletedBatch.schoolName ? ` for ${previousCompletedBatch.schoolName}` : ""} (${previousCompletedBatch.fileName}).`,
      );
    }
  }

  const metadata = extractMetadata(workbook, facilitator?.fullName ?? "Selected facilitator");
  const existingSchools = await prisma.school.findMany({
    where: {
      OR: [
        { id: metadata.id },
        ...(metadata.schoolCode ? [{ schoolCode: metadata.schoolCode }] : []),
        ...(metadata.deployedFormId ? [{ deployedFormId: metadata.deployedFormId }] : []),
      ],
    },
    select: { id: true, name: true, schoolCode: true, deployedFormId: true, schoolYear: true },
  });
  if (existingSchools.length > 1) {
    pushWarning(summary, `Workbook identifiers match multiple schools: ${existingSchools.map((school) => school.name).join(", ")}.`);
  }

  const school = existingSchools[0] ?? null;
  const schoolId = school?.id ?? metadata.id;
  summary.schoolId = schoolId;
  summary.schoolName = school?.name ?? metadata.name;
  summary.sourceWorkbookFile = sourceWorkbookFile;
  countRead(summary, ADOPTION_DETAILS_SHEET);
  countMutation(summary, ADOPTION_DETAILS_SHEET, school ? "updated" : "created");
  summary.detailCounts.schools += 1;

  const context: SchoolInfoPlanningContext = {
    schoolId,
    schoolYear: school?.schoolYear ?? metadata.schoolYear,
    sourceWorkbookFile,
    sourceDeployedFormId: metadata.deployedFormId,
    sectionIdsByKey: new Map(),
  };

  if (selectedSheets.schoolInfo) {
    await previewSchoolInfo(workbook, summary, context);
  }
  if (selectedSheets.sessions) {
    await previewSessions(workbook, summary, schoolId, metadata);
  }
  if (selectedSheets.projects) {
    await previewProjects(workbook, summary, schoolId);
  }
  if (selectedSheets.inventory) {
    await previewInventory(workbook, summary, schoolId);
  }

  return summary;
}

async function findWorkbookSchool(metadata: SchoolMetadata) {
  return prisma.school.findFirst({
    where: {
      OR: [
        { id: metadata.id },
        ...(metadata.schoolCode ? [{ schoolCode: metadata.schoolCode }] : []),
        ...(metadata.deployedFormId ? [{ deployedFormId: metadata.deployedFormId }] : []),
      ],
    },
  });
}

async function upsertSchool(metadata: SchoolMetadata) {
  const school = await findWorkbookSchool(metadata);

  const data = {
    name: metadata.name,
    address: metadata.address,
    contactPerson: metadata.contactPerson,
    schoolYear: metadata.schoolYear,
    schoolCode: metadata.schoolCode,
    deployedFormId: metadata.deployedFormId,
    team: metadata.team,
    unitHead: metadata.unitHead,
    supervisor: metadata.supervisor,
    edtechSpecialist: metadata.edtechSpecialist,
    gradeLevelAdoption: metadata.gradeLevelAdoption,
    adoptionYear: metadata.adoptionYear,
    implementationYear: metadata.implementationYear,
    adoptionType: metadata.adoptionType,
    scheduleArrangement: metadata.scheduleArrangement,
    hardwareAllocation: metadata.hardwareAllocation,
    status: "ACTIVE" as const,
  };

  if (school) {
    return {
      school: await prisma.school.update({ where: { id: school.id }, data }),
      operation: "updated" as const,
    };
  }

  return {
    school: await prisma.school.create({
      data: {
        id: metadata.id,
        ...data,
      },
    }),
    operation: "created" as const,
  };
}

async function upsertWorkbookTeacher(input: {
  fullName: string;
  subjectSummary: string | null;
  sourceKey: string;
  sourceWorkbookFile: string;
  sourceRowRange: string;
}) {
  const existing = await prisma.teacher.findFirst({
    where: {
      OR: [
        { sourceKey: input.sourceKey },
        {
          sourceKey: null,
          fullName: { equals: input.fullName, mode: "insensitive" },
        },
      ],
    },
  });
  const data = {
    fullName: input.fullName,
    department: input.subjectSummary,
    position: "Teacher",
    sourceKey: input.sourceKey,
    sourceSheet: SCHOOL_INFO_SHEET,
    sourceWorkbookFile: input.sourceWorkbookFile,
    sourceRowRange: input.sourceRowRange,
    importedAt: new Date(),
  };

  if (existing) {
    return {
      teacher: await prisma.teacher.update({ where: { id: existing.id }, data }),
      operation: "updated" as const,
    };
  }

  return {
    teacher: await prisma.teacher.create({ data }),
    operation: "created" as const,
  };
}

async function upsertWorkbookTeacherAssignment(input: {
  teacherId: string;
  schoolId: string;
  sectionId: string | null;
  schoolYear: string;
  gradeLevel: string;
  subject: string;
  sessionsParticipated: number;
  hoursSupported: number;
  sourceKey: string;
  sourceWorkbookFile: string;
  sourceRowRange: string;
  sourceDeployedFormId: string | null;
}) {
  const existing = await prisma.teacherAssignment.findFirst({
    where: { sourceKey: input.sourceKey },
  });
  const data = {
    teacherId: input.teacherId,
    schoolId: input.schoolId,
    sectionId: input.sectionId,
    schoolYear: input.schoolYear,
    gradeLevel: input.gradeLevel,
    subject: input.subject,
    sessionsParticipated: input.sessionsParticipated,
    hoursSupported: input.hoursSupported,
    sourceKey: input.sourceKey,
    sourceSheet: SCHOOL_INFO_SHEET,
    sourceWorkbookFile: input.sourceWorkbookFile,
    sourceRowRange: input.sourceRowRange,
    sourceDeployedFormId: input.sourceDeployedFormId,
    importedAt: new Date(),
  };

  if (existing) {
    return {
      assignment: await prisma.teacherAssignment.update({ where: { id: existing.id }, data }),
      operation: "updated" as const,
    };
  }

  return {
    assignment: await prisma.teacherAssignment.create({ data }),
    operation: "created" as const,
  };
}

async function previewSchoolInfo(workbook: XLSX.WorkBook, summary: ImportSummary, context: SchoolInfoPlanningContext) {
  const schoolInfoSheet = worksheet(workbook, SCHOOL_INFO_SHEET, summary);
  if (!schoolInfoSheet) return;

  const rows = XLSX.utils.sheet_to_json<unknown[]>(schoolInfoSheet, { header: 1, defval: "", raw: false });

  for (const row of rows.slice(3, 8)) {
    const label = cleanText(row[1]);
    if (!label.toLowerCase().startsWith("term")) continue;

    countRead(summary, SCHOOL_INFO_SHEET);
    const existingYear = await prisma.schoolYear.findUnique({
      where: { schoolId_label: { schoolId: context.schoolId, label } },
      select: { id: true },
    });
    countMutation(summary, SCHOOL_INFO_SHEET, existingYear ? "updated" : "created");
    summary.detailCounts.schoolYears += 1;
  }

  const plannedSections = new Map<string, { gradeLevel: string; sectionName: string }>();
  for (const row of rows.slice(9)) {
    const gradeLevel = cleanText(row[23]);
    const sectionName = cleanText(row[25]);

    if (!gradeLevel || !sectionName || sectionName === "-") {
      continue;
    }

    countRead(summary, SCHOOL_INFO_SHEET);
    const existingSection = await prisma.schoolSection.findUnique({
      where: {
        schoolId_schoolYear_gradeLevel_sectionName: {
          schoolId: context.schoolId,
          schoolYear: context.schoolYear,
          gradeLevel,
          sectionName,
        },
      },
      select: { id: true },
    });
    const key = `${gradeLookupKey(gradeLevel)}|${sectionLookupKey(sectionName)}`;
    if (existingSection) {
      context.sectionIdsByKey.set(key, existingSection.id);
    }
    plannedSections.set(key, { gradeLevel, sectionName });
    countMutation(summary, SCHOOL_INFO_SHEET, existingSection ? "updated" : "created");
    summary.detailCounts.sections += 1;
  }

  const existingSections = await prisma.schoolSection.findMany({
    where: { schoolId: context.schoolId, schoolYear: context.schoolYear },
    select: { id: true, gradeLevel: true, sectionName: true },
  });
  for (const section of existingSections) {
    context.sectionIdsByKey.set(`${gradeLookupKey(section.gradeLevel)}|${sectionLookupKey(section.sectionName)}`, section.id);
  }

  for (const [offset, row] of rows.slice(9).entries()) {
    const lastName = cleanText(row[1]);
    const firstName = cleanText(row[2]);
    const teacherNumber = parseNumber(row[0]);
    if (!lastName && !firstName) continue;

    countRead(summary, SCHOOL_INFO_SHEET);
    const excelRow = offset + 10;
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || lastName || firstName;
    const teacherSourceKey = `${context.schoolId}|${SCHOOL_INFO_SHEET}|teacher|${sourceKeyPart(fullName)}`;
    const existingTeacher = await prisma.teacher.findFirst({
      where: {
        OR: [
          { sourceKey: teacherSourceKey },
          {
            sourceKey: null,
            fullName: { equals: fullName, mode: "insensitive" },
          },
        ],
      },
      select: { id: true },
    });
    countMutation(summary, SCHOOL_INFO_SHEET, existingTeacher ? "updated" : "created");
    summary.detailCounts.teachers += 1;

    const totalSessions = parseNumber(row[18]);
    const parsedAssignments = parseTeacherSubjectAssignments(row[3]);
    const assignments =
      parsedAssignments.length > 0
        ? parsedAssignments
        : totalSessions > 0
          ? [{ subject: "ACE Participation", gradeLevel: "Mixed", sectionName: null }]
          : [];

    for (const assignment of assignments) {
      const sectionKey = assignment.sectionName
        ? `${gradeLookupKey(assignment.gradeLevel)}|${sectionLookupKey(assignment.sectionName)}`
        : "";
      if (sectionKey && !context.sectionIdsByKey.has(sectionKey) && !plannedSections.has(sectionKey)) {
        pushWarning(summary, `No matching School_Info section found for ${assignment.gradeLevel} ${assignment.sectionName} (${fullName}).`);
      }
      const assignmentSourceKey = [
        context.schoolId,
        SCHOOL_INFO_SHEET,
        "teacher-assignment",
        teacherNumber || excelRow,
        sourceKeyPart(fullName),
        sourceKeyPart(assignment.subject),
        sourceKeyPart(assignment.gradeLevel),
        sourceKeyPart(assignment.sectionName ?? "summary"),
      ].join("|");
      const existingAssignment = await prisma.teacherAssignment.findFirst({
        where: { sourceKey: assignmentSourceKey },
        select: { id: true },
      });
      countMutation(summary, SCHOOL_INFO_SHEET, existingAssignment ? "updated" : "created");
      summary.detailCounts.teacherAssignments += 1;
    }
  }
}

async function previewSessions(workbook: XLSX.WorkBook, summary: ImportSummary, schoolId: string, metadata: SchoolMetadata) {
  const sessionSheet = worksheet(workbook, SESSION_SOURCE_SHEET, summary);
  if (!sessionSheet) return;

  const sessionRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sessionSheet, { defval: "", raw: false });
  const sourceKeys: string[] = [];
  for (const row of sessionRows) {
    countRead(summary, SESSION_SOURCE_SHEET);
    const date = parseDate(row.Date);
    const gradeLevel = cleanText(row["Extracted Grade"]);
    const section = cleanText(row["Extracted Section"]);
    const topic = cleanText(row.Topic);
    const gradeAndSection = cleanText(row["Gr&Sec"]);
    const deployedForm = cleanText(row["Deployed Form"]) || metadata.deployedFormId;
    const sourceKey = [schoolId, deployedForm, cleanText(row.Date), cleanText(row.Period), gradeLevel, section, topic].join("|");

    if (!date || !gradeAndSection || gradeAndSection === "N/A") {
      countSkipped(summary, SESSION_SOURCE_SHEET);
      continue;
    }

    sourceKeys.push(sourceKey);
  }

  const existingKeys = new Set(
    (
      await prisma.aCESession.findMany({
        where: { sourceKey: { in: sourceKeys } },
        select: { sourceKey: true },
      })
    ).map((session) => session.sourceKey).filter((sourceKey): sourceKey is string => Boolean(sourceKey)),
  );
  for (const sourceKey of sourceKeys) {
    countMutation(summary, SESSION_SOURCE_SHEET, existingKeys.has(sourceKey) ? "updated" : "created");
    summary.detailCounts.sessions += 1;
  }
}

async function previewProjects(workbook: XLSX.WorkBook, summary: ImportSummary, schoolId: string) {
  const projectSheet = worksheet(workbook, PROJECT_SOURCE_SHEET, summary);
  if (!projectSheet) return;

  const projectRows = XLSX.utils.sheet_to_json<unknown[]>(projectSheet, { header: 1, defval: "", raw: false });
  const headerIndex = findHeaderRow(projectRows, ["Term", "Project Title"]);
  if (headerIndex < 0) {
    pushValidation(summary, "Projects sheet is missing the expected Project Title header.");
    return;
  }

  const header = projectRows[headerIndex];
  const columns = {
    rowLabel: Math.max(findColumn(header, "Term") - 1, 0),
    term: findColumn(header, "Term"),
    section: findColumn(header, "Grade & Section"),
    title: findColumn(header, "Project Title"),
  };

  const sourceKeys: string[] = [];
  for (const row of projectRows.slice(headerIndex + 1)) {
    countRead(summary, PROJECT_SOURCE_SHEET);
    const rowLabel = cleanText(row[columns.rowLabel]).toLowerCase();
    const title = cleanText(row[columns.title]);

    if (!title || rowLabel === "e.g.") {
      countSkipped(summary, PROJECT_SOURCE_SHEET);
      continue;
    }

    const term = cleanText(row[columns.term]);
    const section = cleanText(row[columns.section]);
    const sourceKey = `${schoolId}|project|${term}|${section}|${title}`;
    sourceKeys.push(sourceKey);
  }

  const existingKeys = new Set(
    (
      await prisma.aCEProject.findMany({
        where: { sourceKey: { in: sourceKeys } },
        select: { sourceKey: true },
      })
    ).map((project) => project.sourceKey).filter((sourceKey): sourceKey is string => Boolean(sourceKey)),
  );
  for (const sourceKey of sourceKeys) {
    countMutation(summary, PROJECT_SOURCE_SHEET, existingKeys.has(sourceKey) ? "updated" : "created");
    summary.detailCounts.projects += 1;
  }
}

async function previewInventory(workbook: XLSX.WorkBook, summary: ImportSummary, schoolId: string) {
  for (const sheetName of INVENTORY_SHEETS) {
    const inventorySheet = worksheet(workbook, sheetName, summary);
    if (!inventorySheet) continue;

    const rows = XLSX.utils.sheet_to_json<unknown[]>(inventorySheet, { header: 1, defval: "", raw: false });
    const headerIndex = findHeaderRow(rows, ["Item Name", "Description", "Remarks"]);
    const detailHeader = rows[headerIndex + 1];
    if (headerIndex < 0 || !detailHeader) {
      pushValidation(summary, `${sheetName} sheet is missing the expected inventory headers.`);
      continue;
    }
    const itemNameColumn = findColumn(rows[headerIndex], "Item Name");
    const columns = {
      category: Math.max(itemNameColumn - 1, 0),
      itemName: itemNameColumn,
    };

    let category = sheetName;
    const sourceKeys: string[] = [];
    for (const row of rows.slice(headerIndex + 2)) {
      countRead(summary, sheetName);
      const categoryLabel = cleanText(row[columns.category]);
      const itemName = cleanText(row[columns.itemName]);

      if (categoryLabel && !itemName) {
        category = categoryLabel;
        countSkipped(summary, sheetName);
        continue;
      }

      if (!itemName || isInventoryFooter(itemName)) {
        countSkipped(summary, sheetName);
        continue;
      }

      const sourceKey = `${schoolId}|${sheetName}|${category}|${itemName}`;
      sourceKeys.push(sourceKey);
    }

    const existingKeys = new Set(
      (
        await prisma.inventoryItem.findMany({
          where: { sourceKey: { in: sourceKeys } },
          select: { sourceKey: true },
        })
      ).map((item) => item.sourceKey).filter((sourceKey): sourceKey is string => Boolean(sourceKey)),
    );
    for (const sourceKey of sourceKeys) {
      countMutation(summary, sheetName, existingKeys.has(sourceKey) ? "updated" : "created");
      summary.detailCounts.inventoryItems += 1;
    }
  }
}

async function importSchoolInfo(
  workbook: XLSX.WorkBook,
  schoolId: string,
  schoolYear: string,
  summary: ImportSummary,
  sourceWorkbookFile: string,
  sourceDeployedFormId: string | null,
) {
  const schoolInfoSheet = worksheet(workbook, SCHOOL_INFO_SHEET, summary);
  if (!schoolInfoSheet) return;

  const rows = XLSX.utils.sheet_to_json<unknown[]>(schoolInfoSheet, { header: 1, defval: "", raw: false });

  for (const row of rows.slice(3, 8)) {
    const label = cleanText(row[1]);
    if (!label.toLowerCase().startsWith("term")) continue;

    countRead(summary, SCHOOL_INFO_SHEET);
    const existingYear = await prisma.schoolYear.findUnique({
      where: { schoolId_label: { schoolId, label } },
      select: { id: true },
    });
    await prisma.schoolYear.upsert({
      where: { schoolId_label: { schoolId, label } },
      update: {
        startDate: parseDate(row[2]),
        endDate: parseDate(row[3]),
        status: "OPEN",
      },
      create: {
        schoolId,
        label,
        startDate: parseDate(row[2]),
        endDate: parseDate(row[3]),
        status: "OPEN",
      },
    });
    countMutation(summary, SCHOOL_INFO_SHEET, existingYear ? "updated" : "created");
    summary.detailCounts.schoolYears += 1;
  }

  for (const row of rows.slice(9)) {
    const gradeLevel = cleanText(row[23]);
    const sectionName = cleanText(row[25]);
    const totalStudents = parseNumber(row[26]);

    if (!gradeLevel || !sectionName || sectionName === "-") {
      continue;
    }

    countRead(summary, SCHOOL_INFO_SHEET);
    const existingSection = await prisma.schoolSection.findUnique({
      where: {
        schoolId_schoolYear_gradeLevel_sectionName: {
          schoolId,
          schoolYear,
          gradeLevel,
          sectionName,
        },
      },
      select: { id: true },
    });
    await prisma.schoolSection.upsert({
      where: {
        schoolId_schoolYear_gradeLevel_sectionName: {
          schoolId,
          schoolYear,
          gradeLevel,
          sectionName,
        },
      },
      update: {
        totalStudents,
        isActive: true,
      },
      create: {
        schoolId,
        schoolYear,
        gradeLevel,
        sectionName,
        totalStudents,
      },
    });
    countMutation(summary, SCHOOL_INFO_SHEET, existingSection ? "updated" : "created");
    summary.detailCounts.sections += 1;
  }

  const gradeDurations = new Map<string, number>();
  for (const row of rows.slice(9)) {
    const gradeLabel = cleanText(row[20]);
    const duration = parseNumber(row[21]);
    if (gradeLabel && duration) {
      gradeDurations.set(gradeLookupKey(normalizeGradeLevel(gradeLabel)), duration);
    }
  }

  const sections = await prisma.schoolSection.findMany({
    where: { schoolId, schoolYear },
    select: { id: true, gradeLevel: true, sectionName: true },
  });
  const sectionsByKey = new Map(
    sections.map((section) => [`${gradeLookupKey(section.gradeLevel)}|${sectionLookupKey(section.sectionName)}`, section]),
  );

  for (const [offset, row] of rows.slice(9).entries()) {
    const lastName = cleanText(row[1]);
    const firstName = cleanText(row[2]);
    const teacherNumber = parseNumber(row[0]);
    if (!lastName && !firstName) continue;

    countRead(summary, SCHOOL_INFO_SHEET);
    const excelRow = offset + 10;
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || lastName || firstName;
    const subjectSummary = text(row[3]).trim() || null;
    const teacherSourceKey = `${schoolId}|${SCHOOL_INFO_SHEET}|teacher|${sourceKeyPart(fullName)}`;
    const teacherResult = await upsertWorkbookTeacher({
      fullName,
      subjectSummary,
      sourceKey: teacherSourceKey,
      sourceWorkbookFile,
      sourceRowRange: `${SCHOOL_INFO_SHEET}!${excelRow}:${excelRow}`,
    });
    countMutation(summary, SCHOOL_INFO_SHEET, teacherResult.operation);
    summary.detailCounts.teachers += 1;

    const totalSessions = parseNumber(row[18]);
    const parsedAssignments = parseTeacherSubjectAssignments(row[3]);
    const assignments =
      parsedAssignments.length > 0
        ? parsedAssignments
        : totalSessions > 0
          ? [{ subject: "ACE Participation", gradeLevel: "Mixed", sectionName: null }]
          : [];

    for (const [assignmentIndex, assignment] of assignments.entries()) {
      const key = assignment.sectionName
        ? `${gradeLookupKey(assignment.gradeLevel)}|${sectionLookupKey(assignment.sectionName)}`
        : "";
      const section = key ? sectionsByKey.get(key) : null;
      const assignmentCount = assignments.length;
      const sessionsParticipated =
        totalSessions > 0 && assignmentCount > 0
          ? Math.floor(totalSessions / assignmentCount) + (assignmentIndex < totalSessions % assignmentCount ? 1 : 0)
          : 0;
      const durationMinutes = gradeDurations.get(gradeLookupKey(assignment.gradeLevel)) ?? 50;
      const hoursSupported = Math.round(((sessionsParticipated * durationMinutes) / 60) * 100) / 100;
      const assignmentSourceKey = [
        schoolId,
        SCHOOL_INFO_SHEET,
        "teacher-assignment",
        teacherNumber || excelRow,
        sourceKeyPart(fullName),
        sourceKeyPart(assignment.subject),
        sourceKeyPart(assignment.gradeLevel),
        sourceKeyPart(assignment.sectionName ?? "summary"),
      ].join("|");

      const assignmentResult = await upsertWorkbookTeacherAssignment({
        teacherId: teacherResult.teacher.id,
        schoolId,
        sectionId: section?.id ?? null,
        schoolYear,
        gradeLevel: section?.gradeLevel ?? assignment.gradeLevel,
        subject: assignment.subject,
        sessionsParticipated,
        hoursSupported,
        sourceKey: assignmentSourceKey,
        sourceWorkbookFile,
        sourceRowRange: `${SCHOOL_INFO_SHEET}!${excelRow}:${excelRow}`,
        sourceDeployedFormId,
      });
      countMutation(summary, SCHOOL_INFO_SHEET, assignmentResult.operation);
      summary.detailCounts.teacherAssignments += 1;
    }
  }
}

async function importAdmsWorkbookObject(workbook: XLSX.WorkBook, facilitatorEmail: string, options: AdmsWorkbookImportOptions) {
  const summary = createImportSummary();
  const sourceWorkbookFile = options.sourceWorkbookFile || SOURCE_WORKBOOK_FILE;
  const selectedSheets = selectedSheetOptions(options);
  assertAnySelectedSheet(selectedSheets);

  const facilitator = await prisma.profile.findUnique({ where: { email: facilitatorEmail } });
  if (!facilitator) {
    throw new Error(`Facilitator profile not found: ${facilitatorEmail}`);
  }

  const metadata = extractMetadata(workbook, facilitator.fullName);
  const schoolResult = await upsertSchool(metadata);
  const school = schoolResult.school;

  summary.schoolId = school.id;
  summary.schoolName = school.name;
  summary.sourceWorkbookFile = sourceWorkbookFile;
  countRead(summary, ADOPTION_DETAILS_SHEET);
  countMutation(summary, ADOPTION_DETAILS_SHEET, schoolResult.operation);
  summary.detailCounts.schools += 1;

  await prisma.facilitatorAssignment.upsert({
    where: { id: `${school.id}-${facilitator.id}` },
    update: { status: "ACTIVE" },
    create: {
      id: `${school.id}-${facilitator.id}`,
      facilitatorId: facilitator.id,
      schoolId: school.id,
      startDate: new Date("2025-06-01"),
      status: "ACTIVE",
    },
  });

  if (selectedSheets.schoolInfo) {
    await importSchoolInfo(workbook, school.id, school.schoolYear, summary, sourceWorkbookFile, metadata.deployedFormId);
  }

  if (selectedSheets.sessions) {
    const sessionSheet = worksheet(workbook, SESSION_SOURCE_SHEET, summary);
    if (sessionSheet) {
      const sessionRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sessionSheet, { defval: "", raw: false });
      for (const [index, row] of sessionRows.entries()) {
        countRead(summary, SESSION_SOURCE_SHEET);
        const date = parseDate(row.Date);
        const gradeLevel = cleanText(row["Extracted Grade"]);
        const section = cleanText(row["Extracted Section"]);
        const topic = cleanText(row.Topic);
        const gradeAndSection = cleanText(row["Gr&Sec"]);
        const deployedForm = cleanText(row["Deployed Form"]) || metadata.deployedFormId;
        const sourceKey = [school.id, deployedForm, cleanText(row.Date), cleanText(row.Period), gradeLevel, section, topic].join("|");

        if (!date || !gradeAndSection || gradeAndSection === "N/A") {
          countSkipped(summary, SESSION_SOURCE_SHEET);
          continue;
        }

        const sessionData = {
          title: topic || cleanText(row.Activity) || "ACE Session",
          gradeLevel,
          section,
          period: cleanText(row.Period) || null,
          durationHours: parseNumber(row["Coding Hours"]) || null,
          subject: cleanText(row["Extracted Subject"]) || cleanText(row.Subject) || null,
          teacher: cleanText(row["Teachers FullName"]) || cleanText(row.Teacher) || null,
          activity: cleanText(row.Activity) || null,
          delivery: cleanText(row.Delivery) || null,
          completion: cleanText(row.Completion) || null,
          remarks: cleanText(row.Remarks) || null,
          status: mapSessionStatus(cleanText(row.Completion), cleanText(row.Remarks)),
          sourceWorkbookFile,
          sourceRowRange: `${SESSION_SOURCE_SHEET}!${index + 2}:${index + 2}`,
          sourceDeployedFormId: deployedForm || null,
          importedAt: new Date(),
        };

        const existingSession = await prisma.aCESession.findUnique({
          where: { sourceKey },
          select: { id: true },
        });
        await prisma.aCESession.upsert({
          where: { sourceKey },
          update: sessionData,
          create: {
            schoolId: school.id,
            facilitatorId: facilitator.id,
            sessionNumber: index + 1,
            scheduledDate: date,
            sourceKey,
            sourceSheet: SESSION_SOURCE_SHEET,
            ...sessionData,
          },
        });
        countMutation(summary, SESSION_SOURCE_SHEET, existingSession ? "updated" : "created");
        summary.detailCounts.sessions += 1;
      }
    }
  }

  if (selectedSheets.projects) {
    const projectSheet = worksheet(workbook, PROJECT_SOURCE_SHEET, summary);
    if (projectSheet) {
      const projectRows = XLSX.utils.sheet_to_json<unknown[]>(projectSheet, { header: 1, defval: "", raw: false });
      const headerIndex = findHeaderRow(projectRows, ["Term", "Project Title"]);
      if (headerIndex < 0) {
        pushValidation(summary, "Projects sheet is missing the expected Project Title header.");
      } else {
        const header = projectRows[headerIndex];
        const columns = {
          rowLabel: Math.max(findColumn(header, "Term") - 1, 0),
          term: findColumn(header, "Term"),
          gradeLevel: findColumn(header, "Grade Level"),
          students: findColumn(header, "Student/s Involved Press Ctrl+Enter to add a name on a new line within a cell."),
          section: findColumn(header, "Grade & Section"),
          teacher: findColumn(header, "Teacher/s Involved"),
          projectType: findColumn(header, "Project Type"),
          title: findColumn(header, "Project Title"),
          description: findColumn(header, "Project Description"),
          url: findColumn(header, "Link to Project Files/Drive/ Documentation"),
          remarks: findColumn(header, "Remarks"),
          submittedAt: findColumn(header, "Date Submitted"),
        };

        for (const [offset, row] of projectRows.slice(headerIndex + 1).entries()) {
          countRead(summary, PROJECT_SOURCE_SHEET);
          const rowLabel = cleanText(row[columns.rowLabel]).toLowerCase();
          const title = cleanText(row[columns.title]);

          if (!title || rowLabel === "e.g.") {
            countSkipped(summary, PROJECT_SOURCE_SHEET);
            continue;
          }

          const term = cleanText(row[columns.term]);
          const students = cleanText(row[columns.students]);
          const section = cleanText(row[columns.section]);
          const gradeLevel = extractProjectGrade(section, cleanText(row[columns.gradeLevel]), students);
          const sourceKey = `${school.id}|project|${term}|${section}|${title}`;
          const excelRow = headerIndex + offset + 2;
          const projectData = {
            term: term || null,
            gradeLevel: gradeLevel || null,
            students: students || null,
            section: section || null,
            teacher: cleanText(row[columns.teacher]) || null,
            projectType: cleanText(row[columns.projectType]) || null,
            description: text(row[columns.description]) || null,
            projectUrl: cleanText(row[columns.url]) || null,
            remarks: cleanText(row[columns.remarks]) || null,
            submittedAt: parseDate(row[columns.submittedAt]),
            sourceSheet: PROJECT_SOURCE_SHEET,
            sourceWorkbookFile,
            sourceRowRange: `${PROJECT_SOURCE_SHEET}!${excelRow}:${excelRow}`,
            sourceDeployedFormId: metadata.deployedFormId,
            importedAt: new Date(),
          };

          const existingProject = await prisma.aCEProject.findUnique({
            where: { sourceKey },
            select: { id: true },
          });
          await prisma.aCEProject.upsert({
            where: { sourceKey },
            update: projectData,
            create: {
              schoolId: school.id,
              title,
              status: "SUBMITTED",
              sourceKey,
              ...projectData,
            },
          });
          countMutation(summary, PROJECT_SOURCE_SHEET, existingProject ? "updated" : "created");
          summary.detailCounts.projects += 1;
        }
      }
    }
  }

  if (selectedSheets.inventory) {
    for (const sheetName of INVENTORY_SHEETS) {
      const inventorySheet = worksheet(workbook, sheetName, summary);
      if (!inventorySheet) continue;

      const rows = XLSX.utils.sheet_to_json<unknown[]>(inventorySheet, { header: 1, defval: "", raw: false });
      const headerIndex = findHeaderRow(rows, ["Item Name", "Description", "Remarks"]);
      const detailHeader = rows[headerIndex + 1];
      if (headerIndex < 0 || !detailHeader) {
        pushValidation(summary, `${sheetName} sheet is missing the expected inventory headers.`);
        continue;
      }
      const itemNameColumn = findColumn(rows[headerIndex], "Item Name");
      const columns = {
        category: Math.max(itemNameColumn - 1, 0),
        itemName: itemNameColumn,
        issuedQuantity: findColumn(detailHeader, "No. of Issued"),
        totalQuantity: findColumn(detailHeader, "Total"),
        unit: findColumn(detailHeader, "Unit"),
        borrowed: findColumn(rows[headerIndex], "Borrowed"),
        working: findColumn(detailHeader, "Working"),
        notWorking: findColumn(detailHeader, "Not Working"),
        complete: findColumn(detailHeader, "Complete"),
        incomplete: findColumn(detailHeader, "Incomplete"),
        remarks: findColumn(rows[headerIndex], "Remarks"),
      };

      let category = sheetName;
      for (const [offset, row] of rows.slice(headerIndex + 2).entries()) {
        countRead(summary, sheetName);

        const categoryLabel = cleanText(row[columns.category]);
        const itemName = cleanText(row[columns.itemName]);

        if (categoryLabel && !itemName) {
          category = categoryLabel;
          countSkipped(summary, sheetName);
          continue;
        }

        if (!itemName || isInventoryFooter(itemName)) {
          countSkipped(summary, sheetName);
          continue;
        }

        const issuedQuantity = parseNumber(row[columns.issuedQuantity]);
        const totalQuantity = parseNumber(row[columns.totalQuantity]) || issuedQuantity;
        const sourceKey = `${school.id}|${sheetName}|${category}|${itemName}`;
        const excelRow = headerIndex + offset + 3;
        const inventoryData = {
          quantity: totalQuantity,
          issuedQuantity,
          totalQuantity,
          unit: cleanText(row[columns.unit]) || null,
          borrowedStatus: cleanText(row[columns.borrowed]) || null,
          completenessStatus: cleanText(row[columns.complete]).toLowerCase() === "true" ? "Complete" : cleanText(row[columns.incomplete]).toLowerCase() === "true" ? "Incomplete" : null,
          facilitatorSignOff: null,
          condition: mapInventoryCondition(cleanText(row[columns.working]), cleanText(row[columns.notWorking]), cleanText(row[columns.complete]), cleanText(row[columns.incomplete])),
          remarks: cleanText(row[columns.remarks]) || null,
          sourceSheet: sheetName,
          sourceWorkbookFile,
          sourceRowRange: `${sheetName}!${excelRow}:${excelRow}`,
          sourceDeployedFormId: metadata.deployedFormId,
          importedAt: new Date(),
        };

        const existingInventoryItem = await prisma.inventoryItem.findUnique({
          where: { sourceKey },
          select: { id: true },
        });
        await prisma.inventoryItem.upsert({
          where: { sourceKey },
          update: inventoryData,
          create: {
            schoolId: school.id,
            itemName,
            category,
            sourceKey,
            ...inventoryData,
          },
        });
        countMutation(summary, sheetName, existingInventoryItem ? "updated" : "created");
        summary.detailCounts.inventoryItems += 1;
      }
    }
  }

  return summary;
}
