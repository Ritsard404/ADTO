import { randomUUID } from "node:crypto";
import { requireActiveProfile } from "@/lib/auth";
import {
  assertCanAccessReportSchool,
  buildSchoolReportPreview,
  generateSchoolReportPdf,
  generateSchoolReportPptx,
  type ReportType,
} from "@/features/reports/services/school-report.service";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";
import { recordAuditLog } from "@/features/security/services/audit-log.service";
import { enforceRateLimit, isRateLimitError } from "@/lib/security/rate-limit";
import { sanitizeStorageSegment, uploadPrivateObject } from "@/features/media/services/private-storage.service";

const reportTypes = new Set(["dashboard", "mid-year", "year-end"]);

function safeReportType(value: string | null): ReportType {
  return reportTypes.has(value ?? "") ? (value as ReportType) : "year-end";
}

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").toLowerCase();
}

function reportStoragePath(input: { schoolId: string; schoolYear: string; reportType: ReportType; historyId: string; format: "pptx" | "pdf" }) {
  return [
    "reports",
    sanitizeStorageSegment(input.schoolId),
    sanitizeStorageSegment(input.schoolYear),
    sanitizeStorageSegment(input.reportType),
    `${input.historyId}.${input.format}`,
  ].join("/");
}

export async function GET(request: Request) {
  const profile = await requireActiveProfile();
  try {
    enforceRateLimit({ key: `official-report:${profile.id}`, limit: 10, windowMs: 15 * 60_000 });
  } catch (error) {
    if (isRateLimitError(error)) {
      return new Response("Too many report generations. Try again in a few minutes.", { status: 429 });
    }
    throw error;
  }

  const url = new URL(request.url);
  const schoolId = url.searchParams.get("schoolId") ?? "";
  const schoolYear = url.searchParams.get("schoolYear") ?? "2025 - 2026";
  const reportType = safeReportType(url.searchParams.get("reportType"));
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "pptx";

  await assertCanAccessReportSchool(profile, schoolId);
  const preview = await buildSchoolReportPreview(schoolId, schoolYear, reportType);
  const filename = `${safeFilename(preview.school.name)}-${reportType}-${schoolYear.replaceAll(" ", "")}.${format}`;
  const historyId = randomUUID();
  const [pptx, pdf] = await Promise.all([
    generateSchoolReportPptx(preview),
    Promise.resolve(generateSchoolReportPdf(preview)),
  ]);
  const history = isMockDataMode()
    ? { id: "mock-report-history", pptFileUrl: "", pdfFileUrl: "" }
    : await (async () => {
        const [pptxObject, pdfObject] = await Promise.all([
          uploadPrivateObject({
            path: reportStoragePath({ schoolId, schoolYear, reportType, historyId, format: "pptx" }),
            body: pptx,
            contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          }),
          uploadPrivateObject({
            path: reportStoragePath({ schoolId, schoolYear, reportType, historyId, format: "pdf" }),
            body: pdf,
            contentType: "application/pdf",
          }),
        ]);

        return prisma.reportHistory.create({
          data: {
            id: historyId,
            schoolId,
            schoolYear,
            reportType,
            generatedBy: profile.id,
            pptFileUrl: pptxObject.ref,
            pdfFileUrl: pdfObject.ref,
          },
        });
      })();

  await recordAuditLog({
    actorId: profile.id,
    entityType: "ReportHistory",
    entityId: history.id,
    action: "OFFICIAL_REPORT_GENERATED",
    newValue: { schoolId, schoolYear, reportType, format, pptFileUrl: history.pptFileUrl, pdfFileUrl: history.pdfFileUrl },
  });

  if (format === "pdf") {
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-ADTO-Report-History-Id": history.id,
      },
    });
  }

  return new Response(new Uint8Array(pptx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-ADTO-Report-History-Id": history.id,
    },
  });
}
