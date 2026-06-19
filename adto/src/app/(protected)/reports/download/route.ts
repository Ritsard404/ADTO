import { requireRole } from "@/lib/auth";
import { buildAdminCsvReport } from "@/lib/services/adms-report-export";

const allowedReports = new Set(["summary", "schools", "assignments", "projects", "inventory", "inventory-remarks"]);

export async function GET(request: Request) {
  await requireRole(["ADMIN"]);
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "summary";
  const reportType = allowedReports.has(type) ? type : "summary";
  const csv = await buildAdminCsvReport(reportType);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="adms-${reportType}-report.csv"`,
    },
  });
}
