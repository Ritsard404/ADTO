"use client";

import { useMemo, useState } from "react";
import { Copy, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SchoolOption = {
  id: string;
  name: string;
};

type SessionRow = {
  schoolId: string;
  scheduledDate: string;
  gradeLevel: string;
  section: string;
  subject: string;
  activity: string;
  durationHours: number;
  teacher: string;
  status: string;
  remarks: string;
  title: string;
};

const emptyRow = (schoolId: string): SessionRow => ({
  schoolId,
  scheduledDate: new Date().toISOString().slice(0, 10),
  gradeLevel: "",
  section: "",
  subject: "",
  activity: "Coding Session",
  durationHours: 1,
  teacher: "",
  status: "NOT_STARTED",
  remarks: "",
  title: "Coding Session",
});

function parsePaste(text: string, fallbackSchoolId: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const columns = line.includes("\t") ? line.split("\t") : line.split(",");
      const [scheduledDate, schoolIdOrName, gradeLevel, section, subject, activity, durationHours, teacher, status, remarks] = columns.map((value) => value.trim());
      return {
        schoolId: schoolIdOrName || fallbackSchoolId,
        scheduledDate,
        gradeLevel,
        section,
        subject,
        activity: activity || "Coding Session",
        durationHours: Number(durationHours) || 1,
        teacher,
        status: status || "NOT_STARTED",
        remarks,
        title: activity || "ACE Session",
      } satisfies SessionRow;
    });
}

export function BulkSessionEncoder({
  schools,
  action,
}: {
  schools: SchoolOption[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [pasteValue, setPasteValue] = useState("");
  const [rows, setRows] = useState<SessionRow[]>([emptyRow(schools[0]?.id ?? "")]);
  const schoolLookup = useMemo(() => new Map(schools.map((school) => [school.name.toLowerCase(), school.id])), [schools]);

  function normalizeRows(inputRows: SessionRow[]) {
    return inputRows.map((row) => ({
      ...row,
      schoolId: schoolLookup.get(row.schoolId.toLowerCase()) ?? row.schoolId,
    }));
  }

  function applyPaste() {
    const parsed = normalizeRows(parsePaste(pasteValue, schools[0]?.id ?? ""));
    setRows(parsed.length ? parsed : [emptyRow(schools[0]?.id ?? "")]);
  }

  function updateRow(index: number, patch: Partial<SessionRow>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold">Paste From Excel</p>
        <p className="text-xs text-muted-foreground">Columns: Date, School, Grade, Section, Subject, Activity, Duration, Teacher, Status, Remarks</p>
      </div>
      <Textarea
        value={pasteValue}
        onChange={(event) => setPasteValue(event.target.value)}
        className="min-h-24 font-mono text-xs"
        placeholder={"2026-01-12\tColegio de la Immaculada Concepcion - Gorordo\tGrade 7\tSt. Francis\tScience\tCoding Session\t1\tAbejaron J\tNOT_STARTED\t"}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={applyPaste}>
          Preview pasted rows
        </Button>
        <Button type="button" variant="outline" onClick={() => setRows((current) => [...current, emptyRow(current.at(-1)?.schoolId ?? schools[0]?.id ?? "")])}>
          <Plus className="size-4" />
          Add row
        </Button>
        <Button type="button" variant="outline" onClick={() => setRows((current) => [...current, { ...(current.at(-1) ?? emptyRow(schools[0]?.id ?? "")) }])}>
          <Copy className="size-4" />
          Duplicate last
        </Button>
      </div>

      <div className="grid gap-2">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-2 rounded-lg border p-2 lg:grid-cols-[130px_1.2fr_100px_120px_120px_150px_90px_130px_130px]">
            <Input type="date" value={row.scheduledDate} onChange={(event) => updateRow(index, { scheduledDate: event.target.value })} />
            <select value={row.schoolId} onChange={(event) => updateRow(index, { schoolId: event.target.value })} className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
            <Input value={row.gradeLevel} onChange={(event) => updateRow(index, { gradeLevel: event.target.value })} placeholder="Grade" />
            <Input value={row.section} onChange={(event) => updateRow(index, { section: event.target.value })} placeholder="Section" />
            <Input value={row.subject} onChange={(event) => updateRow(index, { subject: event.target.value })} placeholder="Subject" />
            <Input value={row.activity} onChange={(event) => updateRow(index, { activity: event.target.value, title: event.target.value })} placeholder="Activity" />
            <Input type="number" inputMode="decimal" value={row.durationHours} onChange={(event) => updateRow(index, { durationHours: Number(event.target.value) })} />
            <Input value={row.teacher} onChange={(event) => updateRow(index, { teacher: event.target.value })} placeholder="Teacher" />
            <select value={row.status} onChange={(event) => updateRow(index, { status: event.target.value })} className="h-8 rounded-lg border border-input bg-background px-2 text-sm">
              {["NOT_STARTED", "COMPLETED", "MISSED", "CANCELLED", "RESCHEDULED"].map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <form action={action} className="adto-sticky-save flex items-center justify-between gap-3">
        <input type="hidden" name="rowsJson" value={JSON.stringify(rows)} />
        <p className="text-sm text-muted-foreground">{rows.length} rows ready for validation and save.</p>
        <Button type="submit">
          <Save className="size-4" />
          Bulk save
        </Button>
      </form>
    </div>
  );
}
