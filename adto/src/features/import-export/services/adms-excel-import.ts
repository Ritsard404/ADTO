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
  validationErrors: string[];
  schoolId?: string;
  schoolName?: string;
  sourceWorkbookFile?: string;
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

export type AdmsWorkbookImportOptions = {
  sourceWorkbookFile?: string;
  sheets?: {
    schoolInfo?: boolean;
    sessions?: boolean;
    projects?: boolean;
    inventory?: boolean;
  };
};

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

function pushValidation(summary: ImportSummary, message: string) {
  if (!summary.validationErrors.includes(message) && summary.validationErrors.length < 20) {
    summary.validationErrors.push(message);
  }
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

async function upsertSchool(metadata: SchoolMetadata) {
  const school = await prisma.school.findFirst({
    where: {
      OR: [
        { id: metadata.id },
        ...(metadata.schoolCode ? [{ schoolCode: metadata.schoolCode }] : []),
        ...(metadata.deployedFormId ? [{ deployedFormId: metadata.deployedFormId }] : []),
      ],
    },
  });

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
    return prisma.school.update({ where: { id: school.id }, data });
  }

  return prisma.school.create({
    data: {
      id: metadata.id,
      ...data,
    },
  });
}

async function importSchoolInfo(workbook: XLSX.WorkBook, schoolId: string, schoolYear: string, summary: ImportSummary) {
  const schoolInfoSheet = worksheet(workbook, SCHOOL_INFO_SHEET, summary);
  if (!schoolInfoSheet) return;

  const rows = XLSX.utils.sheet_to_json<unknown[]>(schoolInfoSheet, { header: 1, defval: "", raw: false });

  for (const row of rows.slice(3, 8)) {
    const label = cleanText(row[1]);
    if (!label.toLowerCase().startsWith("term")) continue;

    summary.rowsRead += 1;
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
    summary.rowsImported += 1;
  }

  for (const row of rows.slice(9)) {
    const gradeLevel = cleanText(row[23]);
    const sectionName = cleanText(row[25]);
    const totalStudents = parseNumber(row[26]);

    if (!gradeLevel || !sectionName || sectionName === "-") {
      continue;
    }

    summary.rowsRead += 1;
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
    summary.rowsImported += 1;
  }
}

async function importAdmsWorkbookObject(workbook: XLSX.WorkBook, facilitatorEmail: string, options: AdmsWorkbookImportOptions) {
  const summary: ImportSummary = { rowsRead: 0, rowsImported: 0, rowsSkipped: 0, validationErrors: [] };
  const sourceWorkbookFile = options.sourceWorkbookFile || SOURCE_WORKBOOK_FILE;
  const selectedSheets = {
    schoolInfo: options.sheets?.schoolInfo ?? true,
    sessions: options.sheets?.sessions ?? true,
    projects: options.sheets?.projects ?? true,
    inventory: options.sheets?.inventory ?? true,
  };

  if (!selectedSheets.schoolInfo && !selectedSheets.sessions && !selectedSheets.projects && !selectedSheets.inventory) {
    throw new Error("Select at least one workbook area to import.");
  }

  const facilitator = await prisma.profile.findUnique({ where: { email: facilitatorEmail } });
  if (!facilitator) {
    throw new Error(`Facilitator profile not found: ${facilitatorEmail}`);
  }

  const metadata = extractMetadata(workbook, facilitator.fullName);
  const school = await upsertSchool(metadata);

  summary.schoolId = school.id;
  summary.schoolName = school.name;
  summary.sourceWorkbookFile = sourceWorkbookFile;

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
    await importSchoolInfo(workbook, school.id, school.schoolYear, summary);
  }

  if (selectedSheets.sessions) {
    const sessionSheet = worksheet(workbook, SESSION_SOURCE_SHEET, summary);
    if (sessionSheet) {
      const sessionRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sessionSheet, { defval: "", raw: false });
      for (const [index, row] of sessionRows.entries()) {
        summary.rowsRead += 1;
        const date = parseDate(row.Date);
        const gradeLevel = cleanText(row["Extracted Grade"]);
        const section = cleanText(row["Extracted Section"]);
        const topic = cleanText(row.Topic);
        const gradeAndSection = cleanText(row["Gr&Sec"]);
        const deployedForm = cleanText(row["Deployed Form"]) || metadata.deployedFormId;
        const sourceKey = [school.id, deployedForm, cleanText(row.Date), cleanText(row.Period), gradeLevel, section, topic].join("|");

        if (!date || !gradeAndSection || gradeAndSection === "N/A") {
          summary.rowsSkipped += 1;
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
        summary.rowsImported += 1;
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
          summary.rowsRead += 1;
          const rowLabel = cleanText(row[columns.rowLabel]).toLowerCase();
          const title = cleanText(row[columns.title]);

          if (!title || rowLabel === "e.g.") {
            summary.rowsSkipped += 1;
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
          summary.rowsImported += 1;
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
        summary.rowsRead += 1;

        const categoryLabel = cleanText(row[columns.category]);
        const itemName = cleanText(row[columns.itemName]);

        if (categoryLabel && !itemName) {
          category = categoryLabel;
          summary.rowsSkipped += 1;
          continue;
        }

        if (!itemName || isInventoryFooter(itemName)) {
          summary.rowsSkipped += 1;
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
        summary.rowsImported += 1;
      }
    }
  }

  return summary;
}
