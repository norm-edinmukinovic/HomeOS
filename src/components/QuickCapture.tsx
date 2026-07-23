"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListChecks, StickyNote, Bell, Plus, Check } from "lucide-react";
import { quickCapture, type CaptureKind } from "@/app/quick-actions";

const KINDS: { key: CaptureKind; label: string; icon: typeof ListChecks; on: string }[] = [
  { key: "task", label: "Zadatak", icon: ListChecks, on: "bg-sky-soft text-sky border-sky/40" },
  { key: "note", label: "Bilješka", icon: StickyNote, on: "bg-mint-soft text-mint border-mint/40" },
  { key: "reminder", label: "Podsjetnik", icon: Bell, on: "bg-sun-soft text-sun border-sun/40" },
];

const placeholders: Record<CaptureKind, string> = {
  task: "npr. Odnijeti smeće",
  note: "npr. Ideja za vikend…",
  reminder: "npr. Nazvati doktora",
};

export function QuickCapture() {
  const router = useRouter();
  const [kind, setKind] = useState<CaptureKind>("task");
  const [text, setText] = useState("");
  const [when, setWhen] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (!text.trim()) return;
    setError(null);
    start(async () => {
      const res = await quickCapture(kind, text, kind === "reminder" && when ? when : undefined);
      if (res.error) { setError(res.error); return; }
      setText(""); setWhen("");
      setDone(true);
      setTimeout(() => setDone(false), 1800);
      router.refresh(); // osvjezi "Today" kartice
    });
  }

  return (
    <div className="rounded-2xl border border-line bg-white shadow-soft p-4">
      <div className="flex items-center gap-1.5 mb-3">
        {KINDS.map((k) => {
          const Icon = k.icon;
          const active = kind === k.key;
          return (
            <button
              key={k.key}
              onClick={() => setKind(k.key)}
              className={`flex items-center gap-1.5 text-sm rounded-full border px-3 py-1.5 transition-all duration-200 ${
                active ? k.on + " font-medium" : "border-line text-muted hover:border-ink/20"
              }`}
            >
              <Icon size={15} strokeWidth={2.2} /> {k.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholders[kind]}
          className="flex-1 rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-lav"
        />
        {kind === "reminder" && (
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:border-lav"
          />
        )}
        <button
          onClick={submit}
          disabled={pending || !text.trim()}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-lav text-white text-sm px-4 py-2.5 font-medium shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-50 disabled:translate-y-0"
        >
          {done ? <Check size={16} /> : <Plus size={16} strokeWidth={2.5} />}
          {done ? "Dodano" : pending ? "…" : "Dodaj"}
        </button>
      </div>

      {kind === "reminder" && !when && (
        <p className="text-muted text-xs mt-2">Bez vremena → podsjetit ćemo te za sat vremena.</p>
      )}
      {error && <p className="text-rose text-xs mt-2">{error}</p>}
    </div>
  );
}
