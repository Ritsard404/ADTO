import { PageHeader } from "@/components/common/page-header";
import { SharedSchoolCalendar } from "@/features/calendar/components/shared-school-calendar";
import { getCalendarReadModel, normalizeCalendarQuery } from "@/features/calendar/services/calendar-read.service";
import type { SessionStatus } from "@/generated/prisma/enums";
import { requireActiveProfile } from "@/lib/auth";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const profile = await requireActiveProfile();
  const params = await searchParams;
  const calendarQuery = normalizeCalendarQuery({
    schoolId: params.schoolId || undefined,
    facilitatorId: params.facilitatorId || undefined,
    gradeLevel: params.gradeLevel || undefined,
    section: params.section || undefined,
    teacher: params.teacher || undefined,
    activityType: params.activityType || undefined,
    status: (params.status as SessionStatus | undefined) || undefined,
    startDate: params.startDate || undefined,
    endDate: params.endDate || undefined,
  });
  const readModel = await getCalendarReadModel(profile, calendarQuery);

  return (
    <div className="space-y-6">
      <PageHeader title="Shared School Calendar" description="View ACE schedules, session statuses, assigned facilitators, teacher schedules, evidence counts, and project links across your authorized school scope." />
      <SharedSchoolCalendar readModel={readModel} initialFilters={calendarQuery} />
    </div>
  );
}
