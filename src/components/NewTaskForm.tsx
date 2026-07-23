"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { addTask } from "@/app/tasks/actions";

type Member = { id: string; name: string };

export function NewTaskForm({ members }: { members: Member[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState("normal");
  const [assigneeId, setAssigneeId] = useState("");
  const [tags, setTags] = useState("");
  const [recurring, setRecurring] = useState("");
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (!title.trim()) return;
    setError(null);
    start(async () => {
      const res = await addTask({ title, due, priority, assigneeId, tags, recurring });
      if (res.error) { setError(res.error); return; }
      setTitle(""); setDue(""); setPriority("normal"); setAssigneeId(""); setTags(""); setRecurring("");
      setMore(false);
      router.refresh();
    });
  }

  const inputCls = "rounded-xl border border-line px-3 py-2 text-sm outline-none focus:border-sky bg-white";

  return (
    <div className="rounded-2xl border border-line bg-white shadow-soft p-4 mb-8">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Novi zadatak…"
          className={`flex-1 ${inputCls}`}
        />
        <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={inputCls} />
        <button
          onClick={submit}
          disabled={pending || !title.trim()}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-sky text-white text-sm px-4 py-2 font-medium shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift disabled:opacity-50 disabled:translate-y-0"
        >
          <Plus size={16} strokeWidth={2.5} /> Dodaj
        </button>
      </div>

      <button
        onClick={() => setMore((m) => !m)}
        className="flex items-center gap-1 text-xs text-muted mt-2 hover:text-ink"
      >
        {more ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Više opcija
      </button>

      {more && (
        <div className="grid gap-2 sm:grid-cols-2 mt-3">
          <label className="text-xs text-muted flex flex-col gap-1">
            Prioritet
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
              <option value="low">Nizak</option>
              <option value="normal">Normalan</option>
              <option value="high">Visok</option>
            </select>
          </label>
          <label className="text-xs text-muted flex flex-col gap-1">
            Odgovoran
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className={inputCls}>
              <option value="">— niko —</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-muted flex flex-col gap-1">
            Tagovi (zarezom)
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="npr. kuća, hitno" className={inputCls} />
          </label>
          <label className="text-xs text-muted flex flex-col gap-1">
            Ponavljanje
            <select value={recurring} onChange={(e) => setRecurring(e.target.value)} className={inputCls}>
              <option value="">Ne ponavlja se</option>
              <option value="daily">Svaki dan</option>
              <option value="weekly">Svake sedmice</option>
              <option value="monthly">Svaki mjesec</option>
            </select>
          </label>
        </div>
      )}
      {error && <p className="text-rose text-xs mt-2">{error}</p>}
    </div>
  );
}
