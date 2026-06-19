import type { SessionStatus } from "@/generated/prisma/enums";

type CalendarStatusKey = SessionStatus | "DRAFT" | "NO_REPORT";

export const sessionStatusColors: Record<CalendarStatusKey, { label: string; backgroundColor: string; borderColor: string; textColor: string }> = {
  NOT_STARTED: { label: "Scheduled", backgroundColor: "#f59e0b", borderColor: "#d97706", textColor: "#111827" },
  ONGOING: { label: "Ongoing", backgroundColor: "#1e88e5", borderColor: "#1565c0", textColor: "#ffffff" },
  COMPLETED: { label: "Completed", backgroundColor: "#22c55e", borderColor: "#16a34a", textColor: "#052e16" },
  CANCELLED: { label: "Cancelled", backgroundColor: "#ef4444", borderColor: "#dc2626", textColor: "#ffffff" },
  RESCHEDULED: { label: "Rescheduled", backgroundColor: "#8b5cf6", borderColor: "#7c3aed", textColor: "#ffffff" },
  MISSED: { label: "No Report", backgroundColor: "#374151", borderColor: "#1f2937", textColor: "#ffffff" },
  FOR_VERIFICATION: { label: "Draft", backgroundColor: "#94a3b8", borderColor: "#64748b", textColor: "#0f172a" },
  DRAFT: { label: "Draft", backgroundColor: "#94a3b8", borderColor: "#64748b", textColor: "#0f172a" },
  NO_REPORT: { label: "No Report", backgroundColor: "#374151", borderColor: "#1f2937", textColor: "#ffffff" },
};

export const calendarLegendItems = [
  sessionStatusColors.NOT_STARTED,
  sessionStatusColors.ONGOING,
  sessionStatusColors.COMPLETED,
  sessionStatusColors.CANCELLED,
  sessionStatusColors.RESCHEDULED,
  sessionStatusColors.DRAFT,
  sessionStatusColors.NO_REPORT,
];

export function getSessionStatusColors(status: SessionStatus) {
  return sessionStatusColors[status] ?? sessionStatusColors.DRAFT;
}
