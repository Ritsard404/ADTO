"use client";

import { useMemo, useState, useTransition } from "react";
import { Link, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type SchoolOption = { id: string; name: string };
type SaveResult =
  | { success: true; created: number; skipped: number }
  | { success: false; error: string };

export function EvidenceLinkImporter({
  schools,
  action,
}: {
  schools: SchoolOption[];
  action: (formData: FormData) => Promise<SaveResult>;
}) {
  const [isPending, startTransition] = useTransition();
  const [pasteValue, setPasteValue] = useState("");
  const [message, setMessage] = useState("");
  const schoolLookup = useMemo(() => new Map(schools.map((school) => [school.name.trim().toLowerCase(), school.id])), [schools]);

  function parseRows() {
    return pasteValue
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(/\t|,/).map((part) => part.trim()))
      .map(([fileName, fileUrl, schoolName = "", description = ""]) => ({
        schoolId: schoolLookup.get(schoolName.toLowerCase()) ?? schools[0]?.id ?? "",
        fileName,
        fileUrl,
        fileType: "Drive link",
        description,
      }))
      .filter((row) => Boolean(row.schoolId && row.fileName && row.fileUrl));
  }

  function saveRows() {
    const rows = parseRows().slice(0, 75);
    const formData = new FormData();
    formData.set("rowsJson", JSON.stringify(rows));
    startTransition(async () => {
      const result = await action(formData);
      if (result.success) {
        setMessage(`${result.created} evidence links added. ${result.skipped} skipped.`);
        setPasteValue("");
      } else {
        setMessage(result.error);
      }
    });
  }

  return (
    <section className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Link className="size-4 text-ace-blue" />
        <h3 className="font-semibold">Batch Evidence Links</h3>
      </div>
      <Textarea
        value={pasteValue}
        onChange={(event) => setPasteValue(event.target.value)}
        className="min-h-32 font-mono text-xs"
        placeholder={"File name\tURL\tSchool name\tDescription"}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={saveRows} disabled={isPending || !pasteValue.trim()}>
          <Save className="size-4" />
          Save links
        </Button>
        {message ? <span className="text-sm text-muted-foreground">{message}</span> : null}
      </div>
    </section>
  );
}
