import { requireActiveProfile } from "@/lib/auth";
import {
  assertCanAccessReportSchool,
  buildSchoolReportPreview,
  generateSchoolReportPdf,
  generateSchoolReportPptx,
  type ReportType,
} from "@/lib/services/school-report.service";
import { prisma } from "@/lib/prisma";
import { isMockDataMode } from "@/lib/runtime-mode";

const reportTypes = new Set(["dashboard", "mid-year", "year-end"]);

function safeReportType(value: string | null): ReportType {
  return reportTypes.has(value ?? "") ? (value as ReportType) : "year-end";
}

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").toLowerCase();
}

export async function GET(request: Request) {
  const profile = await requireActiveProfile();
  const url = new URL(request.url);
  const schoolId = url.searchParams.get("schoolId") ?? "";
  const schoolYear = url.searchParams.get("schoolYear") ?? "2025 - 2026";
  const reportType = safeReportType(url.searchParams.get("reportType"));
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "pptx";

  await assertCanAccessReportSchool(profile, schoolId);
  const preview = await buildSchoolReportPreview(schoolId, schoolYear, reportType);
  const filename = `${safeFilename(preview.school.name)}-${reportType}-${schoolYear.replaceAll(" ", "")}.${format}`;
  const history = isMockDataMode()
    ? { id: "mock-report-history" }
    : await prisma.reportHistory.create({
        data: {
          schoolId,
          schoolYear,
          reportType,
          generatedBy: profile.id,
          pptFileUrl: `/reports/official?schoolId=${schoolId}&schoolYear=${encodeURIComponent(schoolYear)}&reportType=${reportType}&format=pptx`,
          pdfFileUrl: `/reports/official?schoolId=${schoolId}&schoolYear=${encodeURIComponent(schoolYear)}&reportType=${reportType}&format=pdf`,
        },
      });

  if (format === "pdf") {
    const pdf = generateSchoolReportPdf(preview);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-ADTO-Report-History-Id": history.id,
      },
    });
  }

  const pptx = await generateSchoolReportPptx(preview);
  return new Response(new Uint8Array(pptx), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-ADTO-Report-History-Id": history.id,
    },
  });
}
