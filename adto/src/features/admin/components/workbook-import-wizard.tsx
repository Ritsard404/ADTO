"use client";

import { useRef, useState, useTransition } from "react";
import { FileSpreadsheet, Play, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FacilitatorOption = {
  email: string;
  fullName: string;
};

type PreviewResult =
  | {
      success: true;
      fileName: string;
      checksum: string;
      sheets: Array<{ name: string; hidden: number; range: string; sampleRows: number; formulas: number; firstRow: string[] }>;
      dryRun: WorkbookDryRun;
    }
  | { success: false; error: string };

type WorkbookDryRun = {
  rowsRead: number;
  rowsImported: number;
  rowsSkipped: number;
  rowsCreated: number;
  rowsUpdated: number;
  validationErrors: string[];
  warnings: string[];
  detailCounts: Record<string, number>;
  sheetSummaries: Record<string, { rowsRead: number; rowsImported: number; rowsSkipped: number; rowsCreated: number; rowsUpdated: number }>;
  schoolId?: string;
  schoolName?: string;
  sourceWorkbookFile?: string;
};

type ImportResult =
  | {
      success: true;
      rowsRead: number;
      rowsImported: number;
      rowsSkipped: number;
      rowsCreated: number;
      rowsUpdated: number;
      validationErrors: string[];
      warnings: string[];
      detailCounts: {
        schools: number;
        schoolYears: number;
        sections: number;
        teachers: number;
        teacherAssignments: number;
        sessions: number;
        projects: number;
        inventoryItems: number;
      };
      sheetSummaries: Record<string, { rowsRead: number; rowsImported: number; rowsSkipped: number; rowsCreated: number; rowsUpdated: number }>;
      schoolId?: string;
      schoolName?: string;
      sourceWorkbookFile?: string;
      importBatchId?: string;
      checksum?: string;
    }
  | { success: false; error: string };

export function WorkbookImportWizard({
  facilitators,
  previewAction,
  importAction,
}: {
  facilitators: FacilitatorOption[];
  previewAction: (formData: FormData) => Promise<PreviewResult>;
  importAction: (formData: FormData) => Promise<ImportResult>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  function submitPreview() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    startTransition(async () => {
      setResult(null);
      setPreview(await previewAction(formData));
    });
  }

  function submitImport() {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    startTransition(async () => {
      setResult(await importAction(formData));
    });
  }

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="size-5 text-ace-green" />
        <h3 className="font-semibold">Workbook Import Wizard</h3>
      </div>
      <form ref={formRef} className="grid gap-3 lg:grid-cols-[1fr_260px]">
        <Input name="workbook" type="file" accept=".xlsx,.xlsm,.xls" />
        <select name="facilitatorEmail" className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          {facilitators.map((facilitator) => (
            <option key={facilitator.email} value={facilitator.email}>{facilitator.fullName} ({facilitator.email})</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-4 text-sm lg:col-span-2">
          <label className="flex items-center gap-2"><input name="schoolInfo" type="checkbox" defaultChecked /> School setup</label>
          <label className="flex items-center gap-2"><input name="sessions" type="checkbox" defaultChecked /> Sessions</label>
          <label className="flex items-center gap-2"><input name="projects" type="checkbox" defaultChecked /> Projects</label>
          <label className="flex items-center gap-2"><input name="inventory" type="checkbox" defaultChecked /> Inventory</label>
        </div>
      </form>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={submitPreview} disabled={isPending}>
          <Search className="size-4" />
          Preview
        </Button>
        <Button type="button" onClick={submitImport} disabled={isPending || !facilitators.length}>
          <Play className="size-4" />
          Import selected
        </Button>
      </div>
      {preview ? (
        <div className="rounded-md bg-muted/40 p-3 text-sm">
          {preview.success ? (
            <>
              <p className="font-medium">{preview.fileName}</p>
              <p className="text-muted-foreground">Checksum: {preview.checksum.slice(0, 16)}</p>
              <div className="mt-2 rounded-md border bg-background p-3">
                <p className="font-medium">{preview.dryRun.schoolName ?? "Workbook"} dry-run</p>
                <p className="text-muted-foreground">
                  {preview.dryRun.rowsCreated} to create / {preview.dryRun.rowsUpdated} to update / {preview.dryRun.rowsSkipped} to skip / {preview.dryRun.rowsRead} read
                </p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  {Object.entries(preview.dryRun.sheetSummaries).map(([sheet, counts]) => (
                    <div key={sheet} className="rounded-md border bg-muted/30 p-2 text-xs">
                      <p className="font-medium text-sm">{sheet}</p>
                      <p className="text-muted-foreground">
                        {counts.rowsCreated} create / {counts.rowsUpdated} update / {counts.rowsSkipped} skip / {counts.rowsRead} read
                      </p>
                    </div>
                  ))}
                </div>
                {preview.dryRun.warnings.length || preview.dryRun.validationErrors.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                    {[...preview.dryRun.warnings, ...preview.dryRun.validationErrors].map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {preview.sheets
                  .filter((sheet) => ["CleanedData", "Projects", "GS-i", "HS-i", "AdoptionDetails", "School_Info"].includes(sheet.name))
                  .map((sheet) => (
                    <div key={sheet.name} className="rounded-md border bg-background p-2">
                      <p className="font-medium">{sheet.name}</p>
                      <p className="text-muted-foreground">{sheet.range || "No range"} / hidden {sheet.hidden} / formulas {sheet.formulas}</p>
                      <p className="truncate text-muted-foreground">{sheet.firstRow.join(" | ")}</p>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <p className="text-destructive">{preview.error}</p>
          )}
        </div>
      ) : null}
      {result ? (
        <div className="rounded-md bg-muted/40 p-3 text-sm">
          {result.success ? (
            <div className="space-y-2">
              <p className="font-medium">{result.schoolName ?? "ADMS workbook"} imported.</p>
              <p>{result.rowsCreated} created, {result.rowsUpdated} updated, {result.rowsSkipped} skipped, {result.rowsRead} rows read.</p>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {Object.entries(result.detailCounts)
                  .filter(([, value]) => value > 0)
                  .map(([label, value]) => (
                    <div key={label} className="rounded-md border bg-background p-2">
                      <p className="text-xs uppercase text-muted-foreground">{label.replace(/([A-Z])/g, " $1")}</p>
                      <p className="font-semibold">{value}</p>
                    </div>
                  ))}
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {Object.entries(result.sheetSummaries).map(([sheet, counts]) => (
                  <div key={sheet} className="rounded-md border bg-background p-2 text-xs">
                    <p className="font-medium text-sm">{sheet}</p>
                    <p className="text-muted-foreground">
                      {counts.rowsCreated} created / {counts.rowsUpdated} updated / {counts.rowsSkipped} skipped / {counts.rowsRead} read
                    </p>
                  </div>
                ))}
              </div>
              {result.importBatchId ? (
                <p className="text-muted-foreground">Batch: {result.importBatchId.slice(0, 8)} / checksum {result.checksum?.slice(0, 16)}</p>
              ) : null}
              {result.validationErrors.length ? (
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {result.validationErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}
              {result.warnings.length ? (
                <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                  {result.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className="text-destructive">{result.error}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}
