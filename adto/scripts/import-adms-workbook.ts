import "dotenv/config";
import { inspectAdmsWorkbook, importAdmsWorkbook } from "../src/features/import-export/services/adms-excel-import";

const workbookPath =
  process.argv[2] ?? "legacy/Colegio de la Immaculada Concepcion - Gorordo - ACE Sessions 2025 -2026.xlsx";
const facilitatorEmail = process.argv[3] ?? process.env.SEED_FACILITATOR_EMAIL ?? "facilitator@adto.local";
const mode = process.argv[4] ?? "import";

async function main() {
  if (mode === "inspect") {
    console.log(JSON.stringify(inspectAdmsWorkbook(workbookPath), null, 2));
    return;
  }

  const summary = await importAdmsWorkbook(workbookPath, facilitatorEmail);
  console.log(summary);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
