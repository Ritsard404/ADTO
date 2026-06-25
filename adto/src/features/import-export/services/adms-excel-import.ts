import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

const SESSION_SOURCE_SHEET = "CleanedData";
const PROJECT_SOURCE_SHEET = "Projects";
const INVENTORY_SHEETS = ["GS-i", "HS-i"];
const SOURCE_WORKBOOK_FILE = "Colegio de la Immaculada Concepcion - Gorordo - ACE Sessions 2025 -2026.xlsx";

type ImportSummary = {
  rowsRead: number;
  rowsImported: number;
  rowsSkipped: number;
  validationErrors: string[];
};

export type AdmsWorkbookImportOptions = {
  sourceWorkbookFile?: string;
  sheets?: {
    sessions?: boolean;
    projects?: boolean;
    inventory?: boolean;
  };
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function parseDate(value: unknown) {
  const raw = text(value);
  if (!raw || raw === "N/A") return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
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
    const worksheet = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "", blankrows: false, raw: false });
    const formulas = Object.entries(worksheet)
      .filter(([address, cell]) => !address.startsWith("!") && typeof cell === "object" && cell != null && "f" in cell)
      .slice(0, 10)
      .map(([address, cell]) => ({ address, formula: (cell as XLSX.CellObject).f }));

    return {
      name,
      hidden: workbook.Workbook?.Sheets?.[index]?.Hidden ?? 0,
      range: worksheet["!ref"] ?? "",
      mergedRanges: (worksheet["!merges"] ?? []).map((range) => XLSX.utils.encode_range(range)),
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

async function importAdmsWorkbookObject(workbook: XLSX.WorkBook, facilitatorEmail: string, options: AdmsWorkbookImportOptions) {
  const summary: ImportSummary = { rowsRead: 0, rowsImported: 0, rowsSkipped: 0, validationErrors: [] };
  const sourceWorkbookFile = options.sourceWorkbookFile || SOURCE_WORKBOOK_FILE;
  const selectedSheets = {
    sessions: options.sheets?.sessions ?? true,
    projects: options.sheets?.projects ?? true,
    inventory: options.sheets?.inventory ?? true,
  };

  const facilitator = await prisma.profile.findUnique({ where: { email: facilitatorEmail } });
  if (!facilitator) {
    throw new Error(`Facilitator profile not found: ${facilitatorEmail}`);
  }

  const adoptionRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.AdoptionDetails, { header: 1, defval: "", raw: false });
  const schoolName = text(adoptionRows[3]?.[4]) || "Unknown ADMS School";
  const schoolCode = text(adoptionRows[2]?.[10]) || "adms-school";
  const deployedForm = text(adoptionRows[3]?.[10]);
  const schoolYear = text(workbook.Sheets["06Jun"]?.G5?.v) || "2025 - 2026";

  const school = await prisma.school.upsert({
    where: { id: schoolCode.toLowerCase() },
    update: { name: schoolName, schoolYear },
    create: {
      id: schoolCode.toLowerCase(),
      name: schoolName,
      address: "From ADMS workbook",
      contactPerson: text(adoptionRows[7]?.[9]) || facilitator.fullName,
      schoolYear,
      status: "ACTIVE",
    },
  });

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

  if (selectedSheets.sessions) {
    const sessionRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[SESSION_SOURCE_SHEET], { defval: "", raw: false });
    for (const [index, row] of sessionRows.entries()) {
      summary.rowsRead += 1;
      const date = parseDate(row.Date);
      const gradeLevel = text(row["Extracted Grade"]);
      const section = text(row["Extracted Section"]);
      const topic = text(row.Topic);
      const sourceKey = [school.id, text(row["Deployed Form"]) || deployedForm, text(row.Date), text(row.Period), gradeLevel, section, topic].join("|");

      if (!date || text(row["Gr&Sec"]) === "N/A") {
        summary.rowsSkipped += 1;
        continue;
      }

      await prisma.aCESession.upsert({
        where: { sourceKey },
        update: {
          title: topic || text(row.Activity) || "ACE Session",
          gradeLevel,
          section,
          period: text(row.Period) || null,
          subject: text(row.Subject) || null,
          teacher: text(row.Teacher) || null,
          activity: text(row.Activity) || null,
          delivery: text(row.Delivery) || null,
          completion: text(row.Completion) || null,
          remarks: text(row.Remarks) || null,
          status: mapSessionStatus(text(row.Completion), text(row.Remarks)),
          sourceWorkbookFile,
          sourceRowRange: `${SESSION_SOURCE_SHEET}!${index + 2}:${index + 2}`,
          sourceDeployedFormId: text(row["Deployed Form"]) || deployedForm || null,
          importedAt: new Date(),
        },
        create: {
          schoolId: school.id,
          facilitatorId: facilitator.id,
          title: topic || text(row.Activity) || "ACE Session",
          gradeLevel,
          section,
          sessionNumber: summary.rowsRead,
          scheduledDate: date,
          status: mapSessionStatus(text(row.Completion), text(row.Remarks)),
          sourceKey,
          sourceSheet: SESSION_SOURCE_SHEET,
          period: text(row.Period) || null,
          subject: text(row.Subject) || null,
          teacher: text(row.Teacher) || null,
          activity: text(row.Activity) || null,
          delivery: text(row.Delivery) || null,
          completion: text(row.Completion) || null,
          remarks: text(row.Remarks) || null,
          sourceWorkbookFile,
          sourceRowRange: `${SESSION_SOURCE_SHEET}!${index + 2}:${index + 2}`,
          sourceDeployedFormId: text(row["Deployed Form"]) || deployedForm || null,
          importedAt: new Date(),
        },
      });
      summary.rowsImported += 1;
    }
  }

  if (selectedSheets.projects) {
    const projectRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[PROJECT_SOURCE_SHEET], { header: 1, defval: "", raw: false });
    for (const [offset, row] of projectRows.slice(4).entries()) {
      summary.rowsRead += 1;
      const title = text(row[7]);
      if (!title) {
        summary.rowsSkipped += 1;
        continue;
      }
      const section = text(row[4]);
      const sourceKey = `${school.id}|project|${text(row[1])}|${section}|${title}`;
      await prisma.aCEProject.upsert({
        where: { sourceKey },
        update: {
          remarks: text(row[10]) || null,
          submittedAt: parseDate(row[11]),
          sourceSheet: PROJECT_SOURCE_SHEET,
          sourceWorkbookFile,
          sourceRowRange: `${PROJECT_SOURCE_SHEET}!${offset + 5}:${offset + 5}`,
          sourceDeployedFormId: deployedForm || null,
          importedAt: new Date(),
        },
        create: {
          schoolId: school.id,
          title,
          term: text(row[1]) || null,
          gradeLevel: text(row[2]) || text(row[3]) || null,
          students: text(row[3]) || null,
          section: section || null,
          teacher: text(row[5]) || null,
          projectType: text(row[6]) || null,
          description: text(row[8]) || null,
          projectUrl: text(row[9]) || null,
          remarks: text(row[10]) || null,
          submittedAt: parseDate(row[11]),
          status: "SUBMITTED",
          sourceKey,
          sourceSheet: PROJECT_SOURCE_SHEET,
          sourceWorkbookFile,
          sourceRowRange: `${PROJECT_SOURCE_SHEET}!${offset + 5}:${offset + 5}`,
          sourceDeployedFormId: deployedForm || null,
          importedAt: new Date(),
        },
      });
      summary.rowsImported += 1;
    }
  }

  if (selectedSheets.inventory) {
    for (const sheetName of INVENTORY_SHEETS) {
      const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: false });
      let category = sheetName;
      for (const [offset, row] of rows.slice(7).entries()) {
        summary.rowsRead += 1;
        if (text(row[1]) && !text(row[2])) {
          category = text(row[1]);
          summary.rowsSkipped += 1;
          continue;
        }
        const itemName = text(row[2]);
        if (!itemName) {
          summary.rowsSkipped += 1;
          continue;
        }
        const sourceKey = `${school.id}|${sheetName}|${category}|${itemName}`;
        await prisma.inventoryItem.upsert({
          where: { sourceKey },
          update: {
            quantity: Number(text(row[5]) || text(row[4]) || 0),
            issuedQuantity: Number(text(row[4]) || 0),
            totalQuantity: Number(text(row[5]) || text(row[4]) || 0),
            unit: text(row[6]) || null,
            borrowedStatus: text(row[7]) || null,
            completenessStatus: text(row[10]).toLowerCase() === "true" ? "Complete" : text(row[11]).toLowerCase() === "true" ? "Incomplete" : null,
            facilitatorSignOff: text(row[13]) || null,
            condition: mapInventoryCondition(text(row[8]), text(row[9]), text(row[10]), text(row[11])),
            remarks: text(row[12]) || null,
            sourceSheet: sheetName,
            sourceWorkbookFile,
            sourceRowRange: `${sheetName}!${offset + 8}:${offset + 8}`,
            sourceDeployedFormId: deployedForm || null,
            importedAt: new Date(),
          },
          create: {
            schoolId: school.id,
            itemName,
            category,
            quantity: Number(text(row[5]) || text(row[4]) || 0),
            issuedQuantity: Number(text(row[4]) || 0),
            totalQuantity: Number(text(row[5]) || text(row[4]) || 0),
            unit: text(row[6]) || null,
            borrowedStatus: text(row[7]) || null,
            completenessStatus: text(row[10]).toLowerCase() === "true" ? "Complete" : text(row[11]).toLowerCase() === "true" ? "Incomplete" : null,
            facilitatorSignOff: text(row[13]) || null,
            condition: mapInventoryCondition(text(row[8]), text(row[9]), text(row[10]), text(row[11])),
            remarks: text(row[12]) || null,
            sourceKey,
            sourceSheet: sheetName,
            sourceWorkbookFile,
            sourceRowRange: `${sheetName}!${offset + 8}:${offset + 8}`,
            sourceDeployedFormId: deployedForm || null,
            importedAt: new Date(),
          },
        });
        summary.rowsImported += 1;
      }
    }
  }

  return summary;
}
