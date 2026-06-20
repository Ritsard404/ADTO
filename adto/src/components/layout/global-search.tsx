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
        const response = await globalSearchAction(query);
        setResults([...response.results]);
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
        <div className="fixed inset-0 z-50 bg-black/30 p-2 sm:p-8" role="dialog" aria-modal="true">
          <div className="mx-auto max-w-2xl border bg-background">
            <div className="flex items-center gap-2 border-b px-2 py-2">
              <Search className="size-4 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search anything in ADTO"
                className="h-8 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              {pending ? <span className="text-[11px] text-muted-foreground">Searching</span> : null}
              <button type="button" onClick={() => setOpen(false)} className="p-1 text-muted-foreground hover:text-foreground" aria-label="Close search">
                <X className="size-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-2">
              {Object.entries(grouped).map(([category, items]) => (
                <div key={category} className="mb-2">
                  <p className="bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{category}</p>
                  <div className="border-x border-t">
                    {items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className="block border-b px-2 py-1.5 text-xs hover:bg-accent"
                      >
                        <span className="font-semibold text-foreground">{item.title}</span>
                        <span className="ml-2 text-muted-foreground">{item.subtitle}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              {!results.length ? <p className="p-4 text-center text-xs text-muted-foreground">Type at least two characters to search records.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
