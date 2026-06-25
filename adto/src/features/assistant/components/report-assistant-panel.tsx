"use client";

import { useState, useTransition } from "react";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ReportType } from "@/features/reports/services/school-report.service";

type AssistantResult =
  | { success: true; answer: string; provider: string }
  | { success: false; error: string };

export function ReportAssistantPanel({
  schoolId,
  schoolYear,
  reportType,
  action,
}: {
  schoolId: string;
  schoolYear: string;
  reportType: ReportType;
  action: (formData: FormData) => Promise<AssistantResult>;
}) {
  const [isPending, startTransition] = useTransition();
  const [question, setQuestion] = useState("Draft a concise report narrative and list the fastest fixes before download.");
  const [answer, setAnswer] = useState("");
  const [provider, setProvider] = useState("");

  function ask(nextQuestion = question) {
    const formData = new FormData();
    formData.set("schoolId", schoolId);
    formData.set("schoolYear", schoolYear);
    formData.set("reportType", reportType);
    formData.set("question", nextQuestion);
    setQuestion(nextQuestion);
    startTransition(async () => {
      const result = await action(formData);
      if (result.success) {
        setAnswer(result.answer);
        setProvider(result.provider);
      } else {
        setAnswer(result.error);
        setProvider("error");
      }
    });
  }

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="size-5 text-ace-blue" />
          <h3 className="font-semibold">AI Report Assistant</h3>
        </div>
        {provider ? <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{provider}</span> : null}
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
        <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} className="min-h-24" />
        <div className="flex flex-wrap gap-2 lg:w-44 lg:flex-col">
          <Button type="button" onClick={() => ask()} disabled={isPending}>
            <Send className="size-4" />
            Ask
          </Button>
          <Button type="button" variant="outline" onClick={() => ask("Write report accomplishments, challenges, and recommendations from the current metrics.")} disabled={isPending}>
            Report draft
          </Button>
          <Button type="button" variant="outline" onClick={() => ask("What data is missing or weak before generating the official report?")} disabled={isPending}>
            Data gaps
          </Button>
          <Button type="button" variant="outline" onClick={() => ask("Give the next three fastest actions for this school team.")} disabled={isPending}>
            Next actions
          </Button>
        </div>
      </div>
      {answer ? <div className="mt-3 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm leading-6">{answer}</div> : null}
    </section>
  );
}
