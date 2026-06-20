import { CalendarDays, Filter } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { getCompactDashboardReadModel, statusLabel } from "@/features/dashboard/services/compact-dashboard.service";
import { requireActiveProfile } from "@/lib/auth";

const weekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildMonthCells(month: string) {
  const start = new Date(`${month}-01T00:00:00`);
  const first = new Date(start);
  first.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return date;
  });
}

function statusClass(label: string) {
  if (label === "Completed") return "border-emerald-500 bg-emerald-100 text-emerald-900";
  if (label === "Cancelled") return "border-red-500 bg-red-100 text-red-900";
  if (label === "Scheduled") return "border-amber-500 bg-amber-100 text-amber-950";
  return "border-slate-300 bg-white text-slate-700";
}

function CompactCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-r border-emerald-900/30 px-2 py-1.5 last:border-r-0">
      <p className="text-[10px] uppercase tracking-wide text-emerald-50/75">{label}</p>
      <p className="truncate text-[13px] font-bold text-white">{value}</p>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ schoolId?: string; month?: string; grade?: string; teacher?: string; activity?: string; status?: string }>;
}) {
  const profile = await requireActiveProfile();
  const params = await searchParams;
  const dashboard = await getCompactDashboardReadModel(profile, params);
  const monthCells = buildMonthCells(dashboard.monthKey);
  const visibleMonth = new Date(`${dashboard.monthKey}-01T00:00:00`).getMonth();
  const remainingSessions = Math.max(dashboard.summary.scheduledSessions - dashboard.summary.completedSessions - dashboard.summary.cancelledSessions, 0);
  const projectActivity = dashboard.summary.projectsCreated;

  return (
    <div className="space-y-3 text-[12px]">
      <PageHeader
        title="ACE Calendar Dashboard"
        description="Compact workbook-style implementation view for school sessions, calendar progress, teacher participation, projects, and operational notes."
      />

      <form className="grid gap-2 border border-emerald-900/20 bg-[#f6fbf2] p-2 md:grid-cols-6">
        <select name="schoolId" defaultValue={dashboard.selectedSchool?.id ?? ""} className="h-8 border border-emerald-900/20 bg-white px-2 text-[12px]">
          {dashboard.schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
        </select>
        <input name="month" type="month" defaultValue={dashboard.monthKey} className="h-8 border border-emerald-900/20 bg-white px-2 text-[12px]" />
        <select name="grade" defaultValue={params.grade ?? ""} className="h-8 border border-emerald-900/20 bg-white px-2 text-[12px]">
          <option value="">All grades</option>
          {dashboard.filters.grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
        </select>
        <select name="teacher" defaultValue={params.teacher ?? ""} className="h-8 border border-emerald-900/20 bg-white px-2 text-[12px]">
          <option value="">All teachers</option>
          {dashboard.filters.teachers.map((teacher) => <option key={teacher} value={teacher}>{teacher}</option>)}
        </select>
        <select name="activity" defaultValue={params.activity ?? ""} className="h-8 border border-emerald-900/20 bg-white px-2 text-[12px]">
          <option value="">All activities</option>
          {dashboard.filters.activities.map((activity) => <option key={activity} value={activity}>{activity}</option>)}
        </select>
        <div className="flex gap-2">
          <select name="status" defaultValue={params.status ?? ""} className="h-8 min-w-0 flex-1 border border-emerald-900/20 bg-white px-2 text-[12px]">
            <option value="">All status</option>
            {dashboard.filters.statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
          </select>
          <Button type="submit" size="sm" className="h-8 rounded-none bg-[#14532d] px-2 text-[12px]">
            <Filter className="size-3" />
            Apply
          </Button>
        </div>
      </form>

      <section className="grid border border-emerald-950 bg-[#14532d] md:grid-cols-4 xl:grid-cols-12">
        <CompactCell label="School" value={dashboard.summary.schoolName} />
        <CompactCell label="School Year" value={dashboard.summary.schoolYear} />
        <CompactCell label="Facilitator" value={dashboard.summary.assignedFacilitator} />
        <CompactCell label="Month" value={dashboard.summary.currentMonth} />
        <CompactCell label="Term" value={dashboard.summary.currentTerm} />
        <CompactCell label="Scheduled" value={dashboard.summary.scheduledSessions} />
        <CompactCell label="Completed" value={dashboard.summary.completedSessions} />
        <CompactCell label="Cancelled" value={dashboard.summary.cancelledSessions} />
        <CompactCell label="Hours" value={dashboard.summary.codingHours} />
        <CompactCell label="Coders" value={dashboard.summary.activeCoders} />
        <CompactCell label="Projects" value={dashboard.summary.projectsCreated} />
        <CompactCell label="Teachers" value={dashboard.summary.activeTeachers} />
      </section>

      <div className="grid gap-3 xl:grid-cols-[210px_1fr_360px]">
        <aside className="space-y-2 border border-emerald-900/20 bg-[#f8fbf1] p-2 xl:sticky xl:top-20 xl:self-start">
          <div className="border-b border-emerald-900/20 pb-2">
            <p className="text-[10px] uppercase text-emerald-900/70">Today</p>
            <p className="text-lg font-bold text-[#14532d]">{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
            <p className="text-[11px] text-emerald-900/70">{dashboard.summary.currentMonth}</p>
          </div>
          <div className="grid grid-cols-7 border-l border-t border-emerald-900/20 text-center">
            {weekLabels.map((label) => <span key={label} className="border-b border-r border-emerald-900/20 bg-[#d9ead3] py-1 text-[10px] font-bold text-[#14532d]">{label[0]}</span>)}
            {monthCells.map((date) => {
              const count = dashboard.sessionsByDay[dayKey(date)]?.length ?? 0;
              return (
                <span key={date.toISOString()} className={`min-h-7 border-b border-r border-emerald-900/20 py-1 text-[10px] ${date.getMonth() === visibleMonth ? "bg-white" : "bg-slate-50 text-slate-400"}`}>
                  {date.getDate()}
                  {count ? <b className="ml-0.5 text-emerald-700">{count}</b> : null}
                </span>
              );
            })}
          </div>
          <div className="space-y-1 text-[11px] text-emerald-950">
            <p><b>Form:</b> {dashboard.summary.deployedFormId}</p>
            <p><b>Adoption:</b> {dashboard.summary.adoptionType}</p>
            <p><b>Project mix:</b> {dashboard.summary.projectMix || "No projects yet"}</p>
          </div>
        </aside>

        <main className="space-y-3">
          <section className="grid gap-3 lg:grid-cols-[1fr_260px]">
            <div className="border border-emerald-900/20">
              <div className="bg-[#14532d] px-2 py-1 text-[12px] font-bold text-white">Academic Calendar Overview</div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-[#fffdf3] text-left text-[11px]">
                  <thead className="bg-[#d9ead3] text-[#14532d]">
                    <tr>{["Term", "Start date", "End date", "Class days", "Holiday note", "Status"].map((head) => <th key={head} className="border border-emerald-900/20 px-2 py-1">{head}</th>)}</tr>
                  </thead>
                  <tbody>
                    {dashboard.terms.map((term) => (
                      <tr key={term.label}>
                        <td className="border border-emerald-900/20 px-2 py-1 font-semibold">{term.label}</td>
                        <td className="border border-emerald-900/20 px-2 py-1">{term.startDate?.toLocaleDateString("en-US") ?? "Not set"}</td>
                        <td className="border border-emerald-900/20 px-2 py-1">{term.endDate?.toLocaleDateString("en-US") ?? "Not set"}</td>
                        <td className="border border-emerald-900/20 px-2 py-1">{term.classDays}</td>
                        <td className="border border-emerald-900/20 px-2 py-1">{term.holidayNote}</td>
                        <td className="border border-emerald-900/20 px-2 py-1">{term.status}</td>
                      </tr>
                    ))}
                    {!dashboard.terms.length ? <tr><td colSpan={6} className="border border-emerald-900/20 px-2 py-2 text-slate-600">No academic terms encoded yet.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="border border-emerald-900/20 bg-[#f8fbf1]">
              <div className="bg-[#14532d] px-2 py-1 text-[12px] font-bold text-white">This Month Quick Insights</div>
              <ul className="space-y-1 p-2 text-[12px]">
                <li>Completed this month: <b>{dashboard.summary.completedSessions}</b></li>
                <li>Sessions remaining: <b>{remainingSessions}</b></li>
                <li>Most active grade: <b>{dashboard.summary.mostActiveGrade}</b></li>
                <li>Pending/cancelled: <b>{remainingSessions}/{dashboard.summary.cancelledSessions}</b></li>
                <li>Project activity: <b>{projectActivity}</b></li>
                <li>Teacher participation: <b>{dashboard.summary.activeTeachers}</b></li>
              </ul>
            </div>
          </section>

          <section className="border border-emerald-900/20">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#14532d] px-2 py-1 text-white">
              <div className="flex items-center gap-2 text-[12px] font-bold"><CalendarDays className="size-3" /> Monthly Calendar View</div>
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="border border-emerald-500 bg-emerald-100 px-1 text-emerald-900">Completed</span>
                <span className="border border-amber-500 bg-amber-100 px-1 text-amber-950">Scheduled</span>
                <span className="border border-red-500 bg-red-100 px-1 text-red-900">Cancelled</span>
                <span className="border border-slate-300 bg-white px-1 text-slate-700">No session</span>
              </div>
            </div>
            <div className="grid grid-cols-7 border-l border-t border-emerald-900/20 bg-white">
              {weekLabels.map((label) => <div key={label} className="border-b border-r border-emerald-900/20 bg-[#d9ead3] px-1 py-1 text-center text-[11px] font-bold text-[#14532d]">{label}</div>)}
              {monthCells.map((date) => {
                const sessions = dashboard.sessionsByDay[dayKey(date)] ?? [];
                const label = sessions[0] ? statusLabel(sessions[0].status, sessions[0].completion, sessions[0].remarks) : "No session";
                const title = sessions.map((session) => `${session.gradeLevel} ${session.section} | ${session.subject} | ${session.teacher} | ${session.activity} | ${session.topic} | ${session.delivery} | ${session.completion} | ${session.remarks}`).join("\n");
                return (
                  <div key={date.toISOString()} title={title} className={`min-h-20 border-b border-r border-emerald-900/20 p-1 ${date.getMonth() === visibleMonth ? "bg-[#fffdf3]" : "bg-slate-50 text-slate-400"}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold">{date.getDate()}</span>
                      {sessions.length ? <span className={`border px-1 text-[10px] ${statusClass(label)}`}>{sessions.length}</span> : null}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {sessions.slice(0, 3).map((session) => {
                        const sessionLabel = statusLabel(session.status, session.completion, session.remarks);
                        return <div key={session.id} className={`truncate border px-1 text-[10px] ${statusClass(sessionLabel)}`}>{session.gradeLevel} {session.section}</div>;
                      })}
                      {sessions.length > 3 ? <div className="text-[10px] text-emerald-900">+{sessions.length - 3} more</div> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </main>

        <aside className="border border-emerald-900/20 bg-[#f8fbf1]">
          <div className="bg-[#14532d] px-2 py-1 text-[12px] font-bold text-white">Session Detail Preview</div>
          <div className="max-h-[520px] space-y-1 overflow-y-auto p-2">
            {dashboard.sessions.slice(0, 18).map((session) => (
              <div key={session.id} className="border border-emerald-900/20 bg-white p-2 text-[11px]">
                <div className="flex justify-between gap-2">
                  <b>{session.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} {session.period}</b>
                  <span className={`border px-1 ${statusClass(statusLabel(session.status, session.completion, session.remarks))}`}>{statusLabel(session.status, session.completion, session.remarks)}</span>
                </div>
                <p>{session.gradeLevel} {session.section} - {session.subject}</p>
                <p className="text-slate-600">{session.teacher} | {session.activity}</p>
                <p className="truncate text-slate-600">{session.topic}</p>
              </div>
            ))}
            {!dashboard.sessions.length ? <p className="p-2 text-slate-600">No sessions match the selected filters.</p> : null}
          </div>
        </aside>
      </div>

      <section className="border border-emerald-900/20">
        <div className="bg-[#14532d] px-2 py-1 text-[12px] font-bold text-white">Session Table</div>
        <div className="max-h-[460px] overflow-auto">
          <table className="w-full min-w-[980px] border-collapse bg-white text-left text-[11px]">
            <thead className="sticky top-0 z-10 bg-[#d9ead3] text-[#14532d]">
              <tr>
                {["Date", "Period", "Grade & Section", "Subject", "Teacher", "Activity", "Topic", "Delivery", "Completion", "Remarks"].map((head) => (
                  <th key={head} className="border border-emerald-900/20 px-2 py-1">{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dashboard.sessions.map((session) => {
                const label = statusLabel(session.status, session.completion, session.remarks);
                return (
                  <tr key={session.id} className="odd:bg-[#fffdf3]">
                    <td className="border border-emerald-900/20 px-2 py-1">{session.date.toLocaleDateString("en-US")}</td>
                    <td className="border border-emerald-900/20 px-2 py-1">{session.period || "-"}</td>
                    <td className="border border-emerald-900/20 px-2 py-1">{session.gradeLevel} {session.section}</td>
                    <td className="border border-emerald-900/20 px-2 py-1">{session.subject || "-"}</td>
                    <td className="border border-emerald-900/20 px-2 py-1">{session.teacher || "-"}</td>
                    <td className="border border-emerald-900/20 px-2 py-1">{session.activity || "-"}</td>
                    <td className="border border-emerald-900/20 px-2 py-1">{session.topic}</td>
                    <td className="border border-emerald-900/20 px-2 py-1">{session.delivery || "-"}</td>
                    <td className="border border-emerald-900/20 px-2 py-1"><span className={`border px-1 ${statusClass(label)}`}>{label}</span></td>
                    <td className="border border-emerald-900/20 px-2 py-1">{session.remarks || "-"}</td>
                  </tr>
                );
              })}
              {!dashboard.sessions.length ? <tr><td colSpan={10} className="border border-emerald-900/20 px-2 py-3 text-slate-600">No session rows match the filters.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
