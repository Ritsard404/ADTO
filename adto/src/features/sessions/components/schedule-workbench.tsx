"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, Save, TableProperties } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SchedulePreviewRow, ScheduleTemplateOption } from "@/features/sessions/services/schedule-workflow.service";

type SchoolOption = {
  id: string;
  name: string;
};

type FacilitatorOption = {
  id: string;
  fullName: string;
};

type PasteRow = {
  schoolId: string;
  facilitatorId?: string;
  scheduledDate: string;
  startTime?: string;
  durationHours?: number;
  gradeLevel: string;
  section: string;
  subject?: string;
  teacher?: string;
  activity?: string;
  title?: string;
  delivery?: string;
  remarks?: string;
};

type ActionResult =
  | { success: true; rows: readonly SchedulePreviewRow[] }
  | { success: false; error: string; rows: readonly SchedulePreviewRow[] };

type SaveResult =
  | { success: true; created: number; skipped: number }
  | { success: false; error: string };

type TemplateResult =
  | { success: true; template: ScheduleTemplateOption }
  | { success: false; error: string };

const headerMap: Record<string, keyof PasteRow | "day" | "ignore"> = {
  date: "scheduledDate",
  "scheduled date": "scheduledDate",
  day: "day",
  school: "schoolId",
  "school id": "schoolId",
  facilitator: "facilitatorId",
  "facilitator id": "facilitatorId",
  "start time": "startTime",
  time: "startTime",
  duration: "durationHours",
  "duration hours": "durationHours",
  "grade level": "gradeLevel",
  grade: "gradeLevel",
  section: "section",
  subject: "subject",
  teacher: "teacher",
  adviser: "teacher",
  venue: "delivery",
  modality: "delivery",
  delivery: "delivery",
  "activity type": "activity",
  activity: "activity",
  topic: "title",
  title: "title",
  remarks: "remarks",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeLookup(value: string) {
  return value.trim().toLowerCase();
}

function hasHeader(columns: string[]) {
  return columns.some((column) => headerMap[normalizeLookup(column)]);
}

function parsePaste(text: string, schools: SchoolOption[], facilitators: FacilitatorOption[]) {
  const schoolLookup = new Map(schools.map((school) => [normalizeLookup(school.name), school.id]));
  const facilitatorLookup = new Map(facilitators.map((facilitator) => [normalizeLookup(facilitator.fullName), facilitator.id]));
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    return [];
  }

  const splitRows = lines.map((line) => line.split("\t").map((value) => value.trim()));
  const first = splitRows[0] ?? [];
  const headers = hasHeader(first)
    ? first.map((header) => headerMap[normalizeLookup(header)] ?? "ignore")
    : ["scheduledDate", "day", "startTime", "ignore", "gradeLevel", "section", "subject", "teacher", "facilitatorId", "delivery", "activity", "title", "remarks"];
  const dataRows = hasHeader(first) ? splitRows.slice(1) : splitRows;

  return dataRows.map((columns) => {
    const row: Partial<PasteRow> = {};
    columns.forEach((value, index) => {
      const key = headers[index];
      if (!key || key === "ignore" || key === "day") {
        return;
      }
      if (key === "schoolId") {
        row.schoolId = schoolLookup.get(normalizeLookup(value)) ?? value;
      } else if (key === "facilitatorId") {
        row.facilitatorId = facilitatorLookup.get(normalizeLookup(value)) ?? value;
      } else if (key === "durationHours") {
        row.durationHours = Number(value) || 1;
      } else {
        row[key as Exclude<keyof PasteRow, "durationHours">] = value;
      }
    });

    return {
      schoolId: row.schoolId || schools[0]?.id || "",
      facilitatorId: row.facilitatorId,
      scheduledDate: row.scheduledDate || today(),
      startTime: row.startTime || "",
      durationHours: row.durationHours || 1,
      gradeLevel: row.gradeLevel || "",
      section: row.section || "",
      subject: row.subject || "",
      teacher: row.teacher || "",
      activity: row.activity || "Coding Session",
      title: row.title || row.activity || "ACE Session",
      delivery: row.delivery || "",
      remarks: row.remarks || "",
    };
  });
}

function statusVariant(status: SchedulePreviewRow["status"]) {
  return status === "ready" ? "default" : status === "missing" ? "destructive" : "secondary";
}

export function ScheduleWorkbench({
  schools,
  facilitators,
  templates,
  previewDuplicateAction,
  previewBulkAction,
  previewTemplateAction,
  saveBulkAction,
  createTemplateAction,
}: {
  schools: SchoolOption[];
  facilitators: FacilitatorOption[];
  templates: ScheduleTemplateOption[];
  previewDuplicateAction: (formData: FormData) => Promise<ActionResult>;
  previewBulkAction: (formData: FormData) => Promise<ActionResult>;
  previewTemplateAction: (formData: FormData) => Promise<ActionResult>;
  saveBulkAction: (formData: FormData) => Promise<SaveResult>;
  createTemplateAction: (formData: FormData) => Promise<TemplateResult>;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [previewRows, setPreviewRows] = useState<SchedulePreviewRow[]>([]);
  const [pasteValue, setPasteValue] = useState("");
  const [bulkRows, setBulkRows] = useState<PasteRow[]>([]);
  const [templateOptions, setTemplateOptions] = useState<ScheduleTemplateOption[]>([...templates]);
  const [duplicateForm, setDuplicateForm] = useState({
    schoolId: schools[0]?.id ?? "",
    sourceStartDate: today(),
    targetStartDate: today(),
    mode: "week",
    gradeLevel: "",
    section: "",
    facilitatorId: "",
    sourceDay: "",
    topicMode: "copy",
    allowConflicts: "false",
  });
  const [templateForm, setTemplateForm] = useState({
    schoolId: schools[0]?.id ?? "",
    name: "Weekly ACE Session",
    dayOfWeek: "2",
    startTime: "08:00",
    durationHours: "1",
    gradeLevel: "Grade 7",
    section: "",
    subject: "",
    teacher: "",
    facilitatorId: "",
    delivery: "Classroom",
    activity: "Coding Session",
    defaultTopic: "ACE Session",
    defaultRemarks: "",
  });
  const [templatePreviewForm, setTemplatePreviewForm] = useState({
    templateId: templates[0]?.id ?? "",
    startDate: today(),
    endDate: today(),
    excludedDates: "",
  });

  const readyCount = useMemo(() => previewRows.filter((row) => row.status === "ready").length, [previewRows]);

  function duplicateFormData() {
    const formData = new FormData();
    Object.entries(duplicateForm).forEach(([key, value]) => formData.set(key, value));
    return formData;
  }

  function previewDuplicate() {
    startTransition(async () => {
      setMessage("");
      const result = await previewDuplicateAction(duplicateFormData());
      setPreviewRows([...result.rows]);
      setMessage(result.success ? `${result.rows.length} copied session rows previewed.` : result.error);
    });
  }

  function saveDuplicate() {
    const formData = new FormData();
    formData.set("rowsJson", JSON.stringify(previewRows));
    formData.set("allowConflicts", duplicateForm.allowConflicts);
    startTransition(async () => {
      setMessage("");
      const result = await saveBulkAction(formData);
      setMessage(result.success ? `${result.created} sessions created. ${result.skipped} skipped.` : result.error);
      if (result.success) {
        setPreviewRows([]);
      }
    });
  }

  function updatePreviewRow(index: number, patch: Partial<SchedulePreviewRow>) {
    setPreviewRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function previewPaste() {
    const parsed = parsePaste(pasteValue, schools, facilitators);
    setBulkRows(parsed);
    const formData = new FormData();
    formData.set("rowsJson", JSON.stringify(parsed));
    formData.set("allowConflicts", duplicateForm.allowConflicts);
    startTransition(async () => {
      setMessage("");
      const result = await previewBulkAction(formData);
      setPreviewRows([...result.rows]);
      setMessage(result.success ? `${result.rows.length} pasted rows previewed.` : result.error);
    });
  }

  function savePaste() {
    const formData = new FormData();
    formData.set("rowsJson", JSON.stringify(previewRows));
    formData.set("allowConflicts", duplicateForm.allowConflicts);
    startTransition(async () => {
      setMessage("");
      const result = await saveBulkAction(formData);
      setMessage(result.success ? `${result.created} sessions created. ${result.skipped} skipped.` : result.error);
      if (result.success) {
        setPreviewRows([]);
        setBulkRows([]);
        setPasteValue("");
      }
    });
  }

  function createTemplate() {
    const formData = new FormData();
    Object.entries(templateForm).forEach(([key, value]) => formData.set(key, value));
    startTransition(async () => {
      setMessage("");
      const result = await createTemplateAction(formData);
      if (!result.success) {
        setMessage(result.error);
        return;
      }
      setTemplateOptions((current) => {
        const withoutExisting = current.filter((template) => template.id !== result.template.id);
        return [...withoutExisting, result.template].sort((a, b) => a.name.localeCompare(b.name));
      });
      setTemplatePreviewForm((current) => ({ ...current, templateId: result.template.id }));
      setMessage(`Template "${result.template.name}" is ready for generation.`);
    });
  }

  function previewTemplate() {
    const formData = new FormData();
    Object.entries(templatePreviewForm).forEach(([key, value]) => formData.set(key, value));
    formData.set("allowConflicts", duplicateForm.allowConflicts);
    startTransition(async () => {
      setMessage("");
      const result = await previewTemplateAction(formData);
      setPreviewRows([...result.rows]);
      setMessage(result.success ? `${result.rows.length} template rows previewed.` : result.error);
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="space-y-3 rounded-lg border p-3">
          <div>
            <p className="text-sm font-semibold">Duplicate Schedule</p>
            <p className="text-xs text-muted-foreground">Preview a previous week or day before saving new ACE session rows.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Label>
              School
              <select value={duplicateForm.schoolId} onChange={(event) => setDuplicateForm((current) => ({ ...current, schoolId: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
              </select>
            </Label>
            <Label>
              Copy mode
              <select value={duplicateForm.mode} onChange={(event) => setDuplicateForm((current) => ({ ...current, mode: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="week">Previous week to target week</option>
                <option value="day">Specific day to selected date</option>
              </select>
            </Label>
            <Label>
              Source date/week start
              <Input type="date" value={duplicateForm.sourceStartDate} onChange={(event) => setDuplicateForm((current) => ({ ...current, sourceStartDate: event.target.value }))} className="mt-1" />
            </Label>
            <Label>
              Target date/week start
              <Input type="date" value={duplicateForm.targetStartDate} onChange={(event) => setDuplicateForm((current) => ({ ...current, targetStartDate: event.target.value }))} className="mt-1" />
            </Label>
            <Label>
              Grade filter
              <Input value={duplicateForm.gradeLevel} onChange={(event) => setDuplicateForm((current) => ({ ...current, gradeLevel: event.target.value }))} className="mt-1" placeholder="Optional" />
            </Label>
            <Label>
              Section filter
              <Input value={duplicateForm.section} onChange={(event) => setDuplicateForm((current) => ({ ...current, section: event.target.value }))} className="mt-1" placeholder="Optional" />
            </Label>
            <Label>
              Facilitator filter
              <select value={duplicateForm.facilitatorId} onChange={(event) => setDuplicateForm((current) => ({ ...current, facilitatorId: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Any facilitator</option>
                {facilitators.map((facilitator) => <option key={facilitator.id} value={facilitator.id}>{facilitator.fullName}</option>)}
              </select>
            </Label>
            <Label>
              Day filter
              <select value={duplicateForm.sourceDay} onChange={(event) => setDuplicateForm((current) => ({ ...current, sourceDay: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">All days</option>
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => <option key={day} value={day}>{day}</option>)}
              </select>
            </Label>
            <Label>
              Topic handling
              <select value={duplicateForm.topicMode} onChange={(event) => setDuplicateForm((current) => ({ ...current, topicMode: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="copy">Copy exactly</option>
                <option value="clear">Clear for editing</option>
                <option value="increment">Auto-increment Session # text</option>
              </select>
            </Label>
            <Label>
              Conflict override
              <select value={duplicateForm.allowConflicts} onChange={(event) => setDuplicateForm((current) => ({ ...current, allowConflicts: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="false">Skip conflicts</option>
                <option value="true">Admin override</option>
              </select>
            </Label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={previewDuplicate} disabled={isPending}><Copy className="size-4" /> Preview duplicate</Button>
            <Button type="button" onClick={saveDuplicate} disabled={isPending || !previewRows.length}>Save duplicated rows</Button>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border p-3">
          <div>
            <p className="text-sm font-semibold">Bulk Excel Paste</p>
            <p className="text-xs text-muted-foreground">Accepts headers like Date, Day, Start Time, Grade Level, Section, Subject, Teacher, Facilitator, Venue, Activity Type, Topic, Remarks.</p>
          </div>
          <Textarea value={pasteValue} onChange={(event) => setPasteValue(event.target.value)} className="min-h-40 font-mono text-xs" placeholder={"Date\tDay\tStart Time\tEnd Time\tGrade Level\tSection\tSubject\tTeacher\tFacilitator\tVenue\tActivity Type\tTopic\tRemarks"} />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={previewPaste} disabled={isPending}><TableProperties className="size-4" /> Preview pasted rows</Button>
            <Button type="button" onClick={savePaste} disabled={isPending || !previewRows.length}><Save className="size-4" /> Save pasted rows</Button>
          </div>
          <p className="text-xs text-muted-foreground">{bulkRows.length ? `${bulkRows.length} parsed rows are staged for preview.` : "Paste rows from Excel to begin."}</p>
        </section>
      </div>

      <section className="space-y-3 rounded-lg border p-3">
        <div>
          <p className="text-sm font-semibold">Recurring Schedule Template</p>
          <p className="text-xs text-muted-foreground">Save a fixed weekly slot, then generate matching sessions for a date range with preview and conflict checks.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Label>
            School
            <select value={templateForm.schoolId} onChange={(event) => setTemplateForm((current) => ({ ...current, schoolId: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {schools.map((school) => <option key={school.id} value={school.id}>{school.name}</option>)}
            </select>
          </Label>
          <Label>
            Template name
            <Input value={templateForm.name} onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))} className="mt-1" />
          </Label>
          <Label>
            Weekly day
            <select value={templateForm.dayOfWeek} onChange={(event) => setTemplateForm((current) => ({ ...current, dayOfWeek: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
          </Label>
          <Label>
            Start / duration
            <div className="mt-1 grid grid-cols-[1fr_80px] gap-2">
              <Input type="time" value={templateForm.startTime} onChange={(event) => setTemplateForm((current) => ({ ...current, startTime: event.target.value }))} />
              <Input type="number" min="0.25" step="0.25" value={templateForm.durationHours} onChange={(event) => setTemplateForm((current) => ({ ...current, durationHours: event.target.value }))} />
            </div>
          </Label>
          <Label>
            Grade
            <Input value={templateForm.gradeLevel} onChange={(event) => setTemplateForm((current) => ({ ...current, gradeLevel: event.target.value }))} className="mt-1" />
          </Label>
          <Label>
            Section
            <Input value={templateForm.section} onChange={(event) => setTemplateForm((current) => ({ ...current, section: event.target.value }))} className="mt-1" />
          </Label>
          <Label>
            Subject
            <Input value={templateForm.subject} onChange={(event) => setTemplateForm((current) => ({ ...current, subject: event.target.value }))} className="mt-1" />
          </Label>
          <Label>
            Teacher
            <Input value={templateForm.teacher} onChange={(event) => setTemplateForm((current) => ({ ...current, teacher: event.target.value }))} className="mt-1" />
          </Label>
          <Label>
            Facilitator
            <select value={templateForm.facilitatorId} onChange={(event) => setTemplateForm((current) => ({ ...current, facilitatorId: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Use active facilitator</option>
              {facilitators.map((facilitator) => <option key={facilitator.id} value={facilitator.id}>{facilitator.fullName}</option>)}
            </select>
          </Label>
          <Label>
            Venue / modality
            <Input value={templateForm.delivery} onChange={(event) => setTemplateForm((current) => ({ ...current, delivery: event.target.value }))} className="mt-1" />
          </Label>
          <Label>
            Activity
            <Input value={templateForm.activity} onChange={(event) => setTemplateForm((current) => ({ ...current, activity: event.target.value }))} className="mt-1" />
          </Label>
          <Label>
            Topic
            <Input value={templateForm.defaultTopic} onChange={(event) => setTemplateForm((current) => ({ ...current, defaultTopic: event.target.value }))} className="mt-1" />
          </Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={createTemplate} disabled={isPending}>Save template</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px_minmax(0,1fr)_auto]">
          <Label>
            Template
            <select value={templatePreviewForm.templateId} onChange={(event) => setTemplatePreviewForm((current) => ({ ...current, templateId: event.target.value }))} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select a template</option>
              {templateOptions.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
          </Label>
          <Label>
            Start date
            <Input type="date" value={templatePreviewForm.startDate} onChange={(event) => setTemplatePreviewForm((current) => ({ ...current, startDate: event.target.value }))} className="mt-1" />
          </Label>
          <Label>
            End date
            <Input type="date" value={templatePreviewForm.endDate} onChange={(event) => setTemplatePreviewForm((current) => ({ ...current, endDate: event.target.value }))} className="mt-1" />
          </Label>
          <Label>
            Excluded dates
            <Input value={templatePreviewForm.excludedDates} onChange={(event) => setTemplatePreviewForm((current) => ({ ...current, excludedDates: event.target.value }))} className="mt-1" placeholder="2026-07-01, 2026-07-08" />
          </Label>
          <div className="flex items-end">
            <Button type="button" onClick={previewTemplate} disabled={isPending || !templatePreviewForm.templateId}>Preview template</Button>
          </div>
        </div>
      </section>

      {message ? <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{message}</p> : null}

      {previewRows.length ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Preview Before Save</p>
            <p className="text-xs text-muted-foreground">{readyCount} ready, {previewRows.length - readyCount} need review</p>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Grade/Section</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Activity / Topic</TableHead>
                  <TableHead>Validation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row, index) => (
                  <TableRow key={`${row.sourceSessionId ?? "paste"}-${index}`}>
                    <TableCell><Badge variant={statusVariant(row.status)}>{row.status}</Badge></TableCell>
                    <TableCell>
                      <Input type="date" value={row.scheduledDate} onChange={(event) => updatePreviewRow(index, { scheduledDate: event.target.value })} className="h-8 min-w-32" />
                    </TableCell>
                    <TableCell className="min-w-36">
                      <div className="grid grid-cols-[1fr_64px] gap-1">
                        <Input type="time" value={row.startTime} onChange={(event) => updatePreviewRow(index, { startTime: event.target.value })} className="h-8" />
                        <Input type="number" min="0" step="0.25" value={row.durationHours} onChange={(event) => updatePreviewRow(index, { durationHours: Number(event.target.value) || 1 })} className="h-8" />
                      </div>
                    </TableCell>
                    <TableCell className="min-w-44">
                      <Input value={row.gradeLevel} onChange={(event) => updatePreviewRow(index, { gradeLevel: event.target.value })} className="mb-1 h-8" />
                      <Input value={row.section} onChange={(event) => updatePreviewRow(index, { section: event.target.value })} className="h-8" />
                    </TableCell>
                    <TableCell><Input value={row.subject} onChange={(event) => updatePreviewRow(index, { subject: event.target.value })} className="h-8 min-w-32" /></TableCell>
                    <TableCell><Input value={row.teacher} onChange={(event) => updatePreviewRow(index, { teacher: event.target.value })} className="h-8 min-w-36" /></TableCell>
                    <TableCell><Input value={row.delivery} onChange={(event) => updatePreviewRow(index, { delivery: event.target.value })} className="h-8 min-w-32" /></TableCell>
                    <TableCell className="min-w-48">
                      <Input value={row.activity} onChange={(event) => updatePreviewRow(index, { activity: event.target.value })} className="mb-1 h-8" />
                      <Input value={row.title} onChange={(event) => updatePreviewRow(index, { title: event.target.value })} className="h-8" />
                    </TableCell>
                    <TableCell className="min-w-56 text-xs text-muted-foreground">{row.warnings.length ? row.warnings.join(" ") : "Ready to save"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
