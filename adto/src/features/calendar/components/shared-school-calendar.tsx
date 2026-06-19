"use client";

import { useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventContentArg, EventHoveringArg, EventInput } from "@fullcalendar/core";
import { CalendarDays, FileText, ImageIcon, Pencil, RotateCcw } from "lucide-react";
import type { CalendarReadModel, CalendarSessionEvent } from "@/features/calendar/dto/calendar-session.dto";
import { calendarLegendItems } from "@/features/calendar/utils/session-status-colors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type CalendarProps = {
  readModel: CalendarReadModel;
  initialFilters: Record<string, string | undefined>;
};

function detailRows(event: CalendarSessionEvent) {
  const props = event.extendedProps;
  return [
    ["School", props.schoolName],
    ["Class", [props.gradeLevel, props.section].filter(Boolean).join(" - ")],
    ["Teacher", props.teacherName],
    ["Facilitator", props.facilitatorName],
    ["Subject", props.subject],
    ["Activity", props.activityType],
    ["Status", props.status.replaceAll("_", " ")],
    ["Modality", props.modality],
    ["Duration", props.durationMinutes ? `${props.durationMinutes} minutes` : undefined],
    ["Remarks", props.remarks],
  ].filter(([, value]) => Boolean(value));
}

function renderEventContent(info: EventContentArg) {
  return (
    <div className="min-w-0 px-1 py-0.5 leading-tight">
      <div className="truncate text-[11px] font-semibold">{info.event.title}</div>
      {info.timeText ? <div className="truncate text-[10px] opacity-90">{info.timeText}</div> : null}
    </div>
  );
}

export function SharedSchoolCalendar({ readModel, initialFilters }: CalendarProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarSessionEvent | null>(null);
  const [hoverEvent, setHoverEvent] = useState<CalendarSessionEvent | null>(null);
  const events = useMemo<EventInput[]>(() => readModel.events, [readModel.events]);
  const eventById = useMemo(() => new Map(readModel.events.map((event) => [event.id, event])), [readModel.events]);

  function handleEventClick(arg: EventClickArg) {
    const event = eventById.get(arg.event.id);
    if (event) setSelectedEvent(event);
  }

  function handleEventHover(arg: EventHoveringArg) {
    const event = eventById.get(arg.event.id);
    if (event) setHoverEvent(event);
  }

  return (
    <div className="space-y-4">
      <Card className="adto-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="size-5 text-ace-blue" />
            Shared School Calendar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
            <Label>
              School
              <select name="schoolId" defaultValue={initialFilters.schoolId ?? ""} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">All scoped schools</option>
                {readModel.filters.schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
              </select>
            </Label>
            <Label>
              Grade
              <select name="gradeLevel" defaultValue={initialFilters.gradeLevel ?? ""} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">All grades</option>
                {readModel.filters.gradeLevels.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
              </select>
            </Label>
            <Label>
              Section
              <select name="section" defaultValue={initialFilters.section ?? ""} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">All sections</option>
                {readModel.filters.sections.map((section) => <option key={section} value={section}>{section}</option>)}
              </select>
            </Label>
            <Label>
              Teacher
              <select name="teacher" defaultValue={initialFilters.teacher ?? ""} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">All teachers</option>
                {readModel.filters.teachers.map((teacher) => <option key={teacher} value={teacher}>{teacher}</option>)}
              </select>
            </Label>
            {readModel.role === "ADMIN" ? (
              <Label>
                Facilitator
                <select name="facilitatorId" defaultValue={initialFilters.facilitatorId ?? ""} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                  <option value="">All facilitators</option>
                  {readModel.filters.facilitators.map((facilitator) => <option key={facilitator.id} value={facilitator.id}>{facilitator.name}</option>)}
                </select>
              </Label>
            ) : null}
            <Label>
              Activity
              <select name="activityType" defaultValue={initialFilters.activityType ?? ""} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">All activities</option>
                {readModel.filters.activityTypes.map((activity) => <option key={activity} value={activity}>{activity}</option>)}
              </select>
            </Label>
            <Label>
              Status
              <select name="status" defaultValue={initialFilters.status ?? ""} className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                <option value="">All statuses</option>
                {readModel.filters.statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
              </select>
            </Label>
            <Label>
              From
              <Input name="startDate" type="date" defaultValue={initialFilters.startDate ?? ""} className="mt-1 h-9" />
            </Label>
            <Label>
              To
              <Input name="endDate" type="date" defaultValue={initialFilters.endDate ?? ""} className="mt-1 h-9" />
            </Label>
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm">Apply</Button>
              <Button asChild type="button" size="sm" variant="outline"><a href="/calendar">Reset</a></Button>
            </div>
          </form>
          <div className="flex flex-wrap gap-2">
            {calendarLegendItems.map((item) => (
              <Badge key={item.label} variant="outline" className="gap-1.5 bg-card">
                <span className="size-2 rounded-full" style={{ backgroundColor: item.backgroundColor }} />
                {item.label}
              </Badge>
            ))}
          </div>
          {hoverEvent ? (
            <div className="rounded-lg border bg-ace-sky/70 p-3 text-sm">
              <p className="font-semibold">{hoverEvent.title}</p>
              <p className="mt-1 text-muted-foreground">
                {hoverEvent.extendedProps.schoolName} • {hoverEvent.extendedProps.teacherName ?? "No teacher"} • {hoverEvent.extendedProps.status.replaceAll("_", " ")}
              </p>
              {hoverEvent.extendedProps.remarks ? <p className="mt-1 line-clamp-2 text-muted-foreground">{hoverEvent.extendedProps.remarks}</p> : null}
            </div>
          ) : null}
          {!events.length ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No sessions found for this date range. Adjust your filters or create a new session if you have permission.
            </div>
          ) : null}
          <div className="calendar-shell overflow-hidden rounded-lg border bg-card p-2">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek" }}
              views={{ listWeek: { buttonText: "List" }, dayGridMonth: { buttonText: "Month" }, timeGridWeek: { buttonText: "Week" }, timeGridDay: { buttonText: "Day" } }}
              events={events}
              dayMaxEvents={3}
              eventClick={handleEventClick}
              eventMouseEnter={handleEventHover}
              eventMouseLeave={() => setHoverEvent(null)}
              eventContent={renderEventContent}
              editable={false}
              height="auto"
              nowIndicator
            />
          </div>
        </CardContent>
      </Card>
      <Sheet open={Boolean(selectedEvent)} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg" side="right">
          {selectedEvent ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedEvent.title}</SheetTitle>
                <SheetDescription>{new Date(selectedEvent.start).toLocaleString("en-US")}</SheetDescription>
              </SheetHeader>
              <div className="grid gap-3 px-4 pb-4">
                {detailRows(selectedEvent).map(([label, value]) => (
                  <div key={label} className="rounded-lg border p-3">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                    <p className="mt-1 text-sm">{value}</p>
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3 text-sm"><ImageIcon className="mb-2 size-4 text-ace-blue" />Evidence: {selectedEvent.extendedProps.evidenceCount ?? 0}</div>
                  <div className="rounded-lg border p-3 text-sm"><FileText className="mb-2 size-4 text-ace-orange" />Projects: {selectedEvent.extendedProps.projectCount ?? 0}</div>
                </div>
                {selectedEvent.extendedProps.isReadOnly ? (
                  <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Historical or scoped read-only session. You can view details, evidence, and related reports.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm"><a href="/sessions"><Pencil className="size-4" />Edit Session</a></Button>
                    <Button asChild size="sm" variant="outline"><a href="/sessions"><RotateCcw className="size-4" />Reschedule</a></Button>
                    <Button asChild size="sm" variant="outline"><a href="/media">Add Evidence</a></Button>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
