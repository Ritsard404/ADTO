import { requireRole } from "@/lib/auth";
import { buildAdminCsvReport } from "@/features/reports/services/adms-report-export";
import { recordAuditLog } from "@/features/security/services/audit-log.service";
import { enforceRateLimit, isRateLimitError } from "@/lib/security/rate-limit";

const allowedReports = new Set(["summary", "schools", "assignments", "projects", "inventory", "inventory-remarks"]);

export async function GET(request: Request) {
  const profile = await requireRole(["ADMIN"]);
  try {
    enforceRateLimit({ key: `admin-report-download:${profile.id}`, limit: 20, windowMs: 15 * 60_000 });
  } catch (error) {
    if (isRateLimitError(error)) {
      return new Response("Too many report downloads. Try again in a few minutes.", { status: 429 });
    }
    throw error;
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "summary";
  const reportType = allowedReports.has(type) ? type : "summary";
  const csv = await buildAdminCsvReport(reportType);
  await recordAuditLog({
    actorId: profile.id,
    entityType: "AdminCsvReport",
    entityId: reportType,
    action: "ADMIN_CSV_REPORT_DOWNLOADED",
    newValue: { reportType },
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="adms-${reportType}-report.csv"`,
    },
  });
}
