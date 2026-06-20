"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { globalSearchAction } from "@/features/search/actions/global-search";
import type { GlobalSearchResult } from "@/features/search/services/global-search.service";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName ?? "")) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const response = await globalSearchAction({ query, limit: 36 });
        setResults([...response.results]);
        setError(response.success ? "" : response.error);
      });
    }, 160);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  const grouped = useMemo(() => {
    return results.reduce<Record<string, GlobalSearchResult[]>>((acc, result) => {
      acc[result.category] = [...(acc[result.category] ?? []), result];
      return acc;
    }, {});
  }, [results]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 min-w-0 flex-1 items-center gap-2 border bg-background px-2 text-left text-xs text-muted-foreground md:max-w-xl"
      >
        <Search className="size-3.5" />
        <span className="truncate">Search schools, sessions, projects, reports...</span>
        <kbd className="ml-auto hidden border bg-muted px-1 py-0.5 text-[10px] sm:inline">Ctrl K</kbd>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/30 p-0 sm:p-8" role="dialog" aria-modal="true">
          <div className="min-h-dvh border bg-background sm:mx-auto sm:min-h-0 sm:max-w-2xl">
            <div className="flex items-center gap-2 border-b px-2 py-2">
              <Search className="size-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search anything in ADTO"
                className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              {pending ? <span className="hidden text-[11px] text-muted-foreground sm:inline">Searching</span> : null}
              <button type="button" onClick={() => setOpen(false)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Close search">
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-2">
              {error ? <p className="mb-2 border border-destructive/30 bg-destructive/10 p-2 text-xs text-destructive">{error}</p> : null}
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="mb-2">
                  <p className="bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{category}</p>
                  <div className="border-x border-t">
                    {items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="grid gap-1 border-b px-2 py-1.5 text-xs hover:bg-accent sm:grid-cols-[1fr_auto]"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-foreground">{item.title}</span>
                          <span className="block truncate text-muted-foreground">{item.subtitle}</span>
                        </span>
                        <span className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground sm:justify-end">
                          {item.school ? <span className="rounded border px-1">{item.school}</span> : null}
                          {item.status ? <span className="rounded border px-1">{item.status}</span> : null}
                          {item.date ? <span className="rounded border px-1">{item.date}</span> : null}
                          {item.actionLabel ? <span className="font-semibold text-foreground">{item.actionLabel}</span> : null}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              {!results.length && !pending ? <p className="p-4 text-center text-xs text-muted-foreground">Type at least two characters, or use a quick action to jump into common workflows.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
