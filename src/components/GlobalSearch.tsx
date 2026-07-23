"use client";
import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { searchAll } from "@/app/search-actions";
import type { SearchResult } from "@/lib/platform/types";

// Boja badge-a po tipu rezultata (usklađeno s bojama app-ova)
const typeColor: Record<string, string> = {
  Zadatak: "bg-sky-soft text-sky",
  Račun: "bg-peach-soft text-peach",
  Događaj: "bg-lav-soft text-lav",
  Podsjetnik: "bg-sun-soft text-sun",
  Obrok: "bg-rose-soft text-rose",
};

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounce: pretraži ~250ms nakon prestanka kucanja
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const id = setTimeout(() => {
      start(async () => {
        const r = await searchAll(q);
        setResults(r);
        setOpen(true);
      });
    }, 250);
    return () => clearTimeout(id);
  }, [q]);

  // Zatvori panel klikom van
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Grupisanje po tipu
  const groups = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="relative" ref={boxRef}>
      <div className="flex items-center gap-2 rounded-2xl border border-line bg-white shadow-soft px-3.5 py-2.5">
        <Search size={17} className="text-muted shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim().length >= 2 && setOpen(true)}
          placeholder="Pretraži sve — zadatke, račune, događaje…"
          className="flex-1 bg-transparent text-sm outline-none"
        />
        {q && (
          <button onClick={() => { setQ(""); setResults([]); setOpen(false); }} aria-label="Očisti">
            <X size={16} className="text-muted hover:text-ink" />
          </button>
        )}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-line bg-white shadow-lift overflow-hidden animate-fade-up">
          {pending && results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Tražim…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">Nema rezultata za „{q}".</p>
          ) : (
            <div className="max-h-80 overflow-y-auto py-1">
              {Object.entries(groups).map(([type, items]) => (
                <div key={type}>
                  <p className="px-4 pt-2 pb-1 text-xs font-medium text-muted uppercase tracking-wide">{type}</p>
                  {items.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => { setOpen(false); router.push(r.href ?? "/"); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-paper transition-colors"
                    >
                      <span className={`text-[11px] px-2 py-0.5 rounded-full shrink-0 ${typeColor[type] ?? "bg-slate2-soft text-slate2"}`}>
                        {type}
                      </span>
                      <span className="text-sm text-ink truncate">{r.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
