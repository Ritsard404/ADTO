import type { ActiveProfile } from "@/features/facilitator/services/adms-workflow.service";
import { buildSchoolReportPreview, getAccessibleReportSchools, type ReportType } from "@/features/reports/services/school-report.service";

type ReportAssistantInput = {
  schoolId: string;
  schoolYear: string;
  reportType: ReportType;
  question: string;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
  error?: { message?: string };
};

function extractOutputText(response: OpenAIResponse) {
  if (response.output_text) return response.output_text.trim();
  const text = response.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("")
    .trim();
  return text || "";
}

function compactRecord(value: Record<string, number>, limit = 8) {
  return Object.entries(value)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => `${label}: ${count}`)
    .join(", ");
}

function buildFallbackGuidance(context: Awaited<ReturnType<typeof buildAssistantContext>>, question: string) {
  const metrics = context.preview.metrics;
  const weakSignals = [
    metrics.totalSessions === 0 ? "No sessions are logged for the selected report scope." : "",
    metrics.teachers === 0 ? "Teacher participation is missing." : "",
    metrics.totalProjects === 0 ? "Project outputs are not yet attached." : "",
    metrics.totalInventory === 0 ? "Inventory records are not yet attached." : "",
  ].filter(Boolean);

  return [
    `Report guidance for ${context.schoolName}: ${metrics.totalSessions} sessions, ${metrics.codingHours} coding hours, ${metrics.teachers} participating teachers, and ${metrics.totalProjects} projects are currently in scope.`,
    `Use these report angles: highlight ${metrics.mostActiveGrade} as the most active grade, mention ${metrics.mostActiveTeacher} for teacher participation, and connect activities to ${metrics.projectTypes} project type(s).`,
    weakSignals.length ? `Fix before final report: ${weakSignals.join(" ")}` : "The report has enough core metrics for a first draft. Review narrative quality, evidence links, and inventory remarks before download.",
    `Question handled: ${question}`,
  ].join("\n\n");
}

async function buildAssistantContext(profile: ActiveProfile, input: ReportAssistantInput) {
  const schools = await getAccessibleReportSchools({ ...profile, email: profile.email ?? "" });
  const school = schools.find((item) => item.id === input.schoolId);
  if (!school) {
    throw new Error("This account cannot use report assistance for the selected school.");
  }

  const preview = await buildSchoolReportPreview(input.schoolId, input.schoolYear, input.reportType);
  return {
    schoolName: preview.school.name,
    schoolYear: input.schoolYear,
    reportType: input.reportType,
    preview,
    summary: {
      metrics: preview.metrics,
      topGrades: compactRecord(preview.gradeCounts),
      topTeachers: compactRecord(preview.teacherCounts),
      topActivities: compactRecord(preview.activityCounts),
      projectTypes: compactRecord(preview.projectTypeCounts),
    },
  };
}

export async function answerReportAssistantQuestion(profile: ActiveProfile, input: ReportAssistantInput) {
  const context = await buildAssistantContext(profile, input);
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      answer: buildFallbackGuidance(context, input.question),
      provider: "local",
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      store: false,
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
      instructions:
        "You are the ADTO ACE report assistant. Use only the provided report metrics and workbook-derived context. Give concise report-ready guidance, highlight missing data, and suggest the next fastest user action. Do not invent counts, schools, or evidence.",
      input: JSON.stringify({
        question: input.question,
        context: context.summary,
        schoolName: context.schoolName,
        schoolYear: context.schoolYear,
        reportType: context.reportType,
      }),
    }),
    signal: AbortSignal.timeout(18_000),
  });

  const data = (await response.json()) as OpenAIResponse;
  if (!response.ok || data.error) {
    return {
      answer: buildFallbackGuidance(context, `${input.question}\n\nProvider note: ${data.error?.message ?? "OpenAI request failed."}`),
      provider: "local",
    };
  }

  return {
    answer: extractOutputText(data) || buildFallbackGuidance(context, input.question),
    provider: "openai",
  };
}
