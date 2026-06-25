"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckSquare, Link, Save, Square, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type DailySessionLogRow = {
  sessionId: string;
  schoolName: string;
  scheduledDate: string;
  period: string;
  gradeSection: string;
  subject: string;
  teacher: string;
  activity: string;
  title: string;
  status: "NOT_STARTED" | "ONGOING" | "COMPLETED" | "MISSED" | "RESCHEDULED" | "CANCELLED" | "FOR_VERIFICATION";
  actualDate: string;
  delivery: string;
  completion: string;
  remarks: string;
  evidenceName: string;
  evidenceUrl: string;
  projectTitle: string;
  projectUrl: string;
};

type SaveResult =
  | { success: true; updated: number; evidenceCreated: number; projectsLinked: number; warnings: string[] }
  | { success: false; error: string };

const statuses: DailySessionLogRow["status"][] = ["NOT_STARTED", "ONGOING", "COMPLETED", "MISSED", "RESCHEDULED", "CANCELLED", "FOR_VERIFICATION"];

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function DailySessionLogGrid({
  sessions,
  saveAction,
}: {
  sessions: DailySessionLogRow[];
  saveAction: (formData: FormData) => Promise<SaveResult>;
}) {
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<DailySessionLogRow[]>(sessions);
  const [selected, setSelected] = useState<Set<string>>(new Set(sessions.map((session) => session.sessionId)));
  const [message, setMessage] = useState("");
  const selectedRows = useMemo(() => rows.filter((row) => selected.has(row.sessionId)), [rows, selected]);
  const allSelected = rows.length > 0 && selected.size === rows.length;

  function patchRow(sessionId: string, patch: Partial<DailySessionLogRow>) {
    setRows((current) => current.map((row) => (row.sessionId === sessionId ? { ...row, ...patch } : row)));
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((row) => row.sessionId)));
  }

  function toggleRow(sessionId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }

  function applyStatus(status: DailySessionLogRow["status"]) {
    const actualDate = status === "COMPLETED" ? new Date().toISOString().slice(0, 10) : undefined;
    setRows((current) =>
      current.map((row) =>
        selected.has(row.sessionId)
          ? {
              ...row,
              status,
              actualDate: actualDate ?? row.actualDate,
              completion: status === "COMPLETED" ? "Completed" : status === "CANCELLED" ? "Cancelled" : row.completion,
            }
          : row,
      ),
    );
  }

  function saveRows() {
    const payload = (selectedRows.length ? selectedRows : rows).slice(0, 100);
    const formData = new FormData();
    formData.set("rowsJson", JSON.stringify(payload));
    startTransition(async () => {
      setMessage("");
      const result = await saveAction(formData);
      if (result.success) {
        const warningText = result.warnings.length ? ` ${result.warnings.length} rows still need review.` : "";
        setMessage(`${result.updated} sessions saved. ${result.evidenceCreated} evidence links and ${result.projectsLinked} project links added.${warningText}`);
      } else {
        setMessage(result.error);
      }
    });
  }

  if (!rows.length) {
    return <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">No sessions in this month window.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={toggleAll}>
          {allSelected ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
          {selected.size}/{rows.length}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => applyStatus("COMPLETED")}>Complete</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => applyStatus("CANCELLED")}>
          <XCircle className="size-4" />
          Cancel
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => applyStatus("RESCHEDULED")}>Reschedule</Button>
        <Button type="button" size="sm" onClick={saveRows} disabled={isPending}>
          <Save className="size-4" />
          Save selected
        </Button>
        {message ? <span className="text-sm text-muted-foreground">{message}</span> : null}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-300 border-collapse text-left text-xs">
          <thead className="bg-muted/60">
            <tr>
              {["", "Date", "Class", "Teacher / Subject", "Status", "Actual", "Delivery", "Completion", "Remarks", "Evidence", "Project"].map((head) => (
                <th key={head} className="border-b px-2 py-2 font-semibold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const needsReview = !row.teacher || !row.subject || !row.completion;
              return (
                <tr key={row.sessionId} className={needsReview ? "bg-amber-50/60" : "odd:bg-muted/20"}>
                  <td className="w-9 border-b px-2 py-2 align-top">
                    <button type="button" onClick={() => toggleRow(row.sessionId)} aria-label={`Select ${row.gradeSection}`} className="rounded border p-1">
                      {selected.has(row.sessionId) ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                    </button>
                  </td>
                  <td className="min-w-34 border-b px-2 py-2 align-top">
                    <p className="font-medium">{row.scheduledDate}</p>
                    <p className="text-muted-foreground">{row.period || row.schoolName}</p>
                  </td>
                  <td className="min-w-56 border-b px-2 py-2 align-top">
                    <p className="font-medium">{row.gradeSection}</p>
                    <Input value={row.title} onChange={(event) => patchRow(row.sessionId, { title: event.target.value })} className="mt-1 h-8" />
                  </td>
                  <td className="min-w-48 border-b px-2 py-2 align-top">
                    <p>{row.teacher || "No teacher"}</p>
                    <p className="text-muted-foreground">{row.subject || "No subject"} / {row.activity || "No activity"}</p>
                  </td>
                  <td className="min-w-40 border-b px-2 py-2 align-top">
                    <select value={row.status} onChange={(event) => patchRow(row.sessionId, { status: event.target.value as DailySessionLogRow["status"] })} className="h-8 w-full rounded-md border bg-background px-2">
                      {statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
                    </select>
                  </td>
                  <td className="min-w-34 border-b px-2 py-2 align-top">
                    <Input type="date" value={row.actualDate} onChange={(event) => patchRow(row.sessionId, { actualDate: event.target.value })} className="h-8" />
                  </td>
                  <td className="min-w-40 border-b px-2 py-2 align-top">
                    <Input value={row.delivery} onChange={(event) => patchRow(row.sessionId, { delivery: event.target.value })} className="h-8" />
                  </td>
                  <td className="min-w-40 border-b px-2 py-2 align-top">
                    <Input value={row.completion} onChange={(event) => patchRow(row.sessionId, { completion: event.target.value })} className="h-8" placeholder="Completed / Cancelled" />
                  </td>
                  <td className="min-w-64 border-b px-2 py-2 align-top">
                    <Textarea value={row.remarks} onChange={(event) => patchRow(row.sessionId, { remarks: event.target.value })} className="min-h-16 text-xs" />
                  </td>
                  <td className="min-w-64 border-b px-2 py-2 align-top">
                    <Input value={row.evidenceName} onChange={(event) => patchRow(row.sessionId, { evidenceName: event.target.value })} className="mb-1 h-8" placeholder="Evidence name" />
                    <div className="flex items-center gap-1">
                      <Link className="size-3 text-muted-foreground" />
                      <Input value={row.evidenceUrl} onChange={(event) => patchRow(row.sessionId, { evidenceUrl: event.target.value })} className="h-8" placeholder="https://drive.google.com/..." />
                    </div>
                  </td>
                  <td className="min-w-64 border-b px-2 py-2 align-top">
                    <Input value={row.projectTitle} onChange={(event) => patchRow(row.sessionId, { projectTitle: event.target.value })} className="mb-1 h-8" placeholder="Project title" />
                    <Input value={row.projectUrl} onChange={(event) => patchRow(row.sessionId, { projectUrl: event.target.value })} className="h-8" placeholder="Project link" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
