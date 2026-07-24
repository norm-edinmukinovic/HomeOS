import { redirect } from "next/navigation";
import { getContext } from "@/lib/session";
import { addNote, deleteNote } from "./actions";
import { StickyNote, BookOpen, Trash2, Tag } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const { db, user, householdId } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema…</p>;

  const [{ data: notes }, { data: tasks }, { data: bills }, { data: events }] = await Promise.all([
    db.from("notes").select("id, title, body, tags, visibility, created_at")
      .eq("household_id", householdId).order("created_at", { ascending: false }),
    db.from("tasks").select("id, title").eq("household_id", householdId)
      .order("created_at", { ascending: false }).limit(15),
    db.from("bills").select("id, title").eq("household_id", householdId)
      .order("created_at", { ascending: false }).limit(15),
    db.from("calendar_events").select("id, title").eq("household_id", householdId)
      .order("starts_at", { ascending: false }).limit(15),
  ]);

  const journal = (notes ?? []).filter((n) => (n.tags ?? []).includes("dnevnik"));
  const general = (notes ?? []).filter((n) => !(n.tags ?? []).includes("dnevnik"));

  async function create(formData: FormData) {
    "use server";
    const linkRaw = String(formData.get("link") || "");
    const [linkType, linkId] = linkRaw.includes(":") ? linkRaw.split(":") : ["", ""];
    await addNote({
      title: String(formData.get("title") || ""),
      body: String(formData.get("body") || ""),
      tags: String(formData.get("tags") || ""),
      visibility: (formData.get("visibility") as "private" | "household") || "private",
      linkType: linkType || undefined,
      linkId: linkId || undefined,
      journal: formData.get("journal") === "on",
    });
  }
  async function remove(formData: FormData) {
    "use server";
    await deleteNote(String(formData.get("id")));
  }

  const NoteCard = ({ n }: { n: (typeof general)[number] }) => (
    <div className="rounded-xl border border-line bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {n.title && <p className="font-medium text-sm mb-0.5">{n.title}</p>}
          <p className="text-sm text-ink/80 whitespace-pre-wrap break-words">{n.body}</p>
        </div>
        <form action={remove}>
          <input type="hidden" name="id" value={n.id} />
          <button className="text-muted hover:text-rose shrink-0" aria-label="Obriši"><Trash2 size={15} /></button>
        </form>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {((n.tags ?? []) as string[]).map((t: string) => (
          <span key={t} className="inline-flex items-center gap-1 text-[11px] rounded-full bg-note-soft text-note px-2 py-0.5">
            <Tag size={10} /> {t}
          </span>
        ))}
        <span className="text-[11px] text-muted ml-auto">
          {n.visibility === "private" ? "privatno" : "domaćinstvo"} · {new Date(n.created_at).toLocaleDateString("bs")}
        </span>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-note-soft text-note">
          <StickyNote size={19} strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-semibold">Bilješke</h1>
      </div>
      <p className="text-muted text-sm mb-6">Bilješke s tagovima, dnevnik i povezivanje na zadatke, račune ili događaje.</p>

      <form action={create} className="rounded-xl border border-line bg-white p-4 mb-8 space-y-3 shadow-soft">
        <input name="title" placeholder="Naslov (opcionalno)"
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-note" />
        <textarea name="body" required rows={3} placeholder="Sadržaj bilješke…"
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-note" />
        <div className="grid gap-3 sm:grid-cols-3">
          <input name="tags" placeholder="tagovi, odvojeni, zarezom"
            className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-note" />
          <select name="visibility" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-note">
            <option value="private">Samo ja</option>
            <option value="household">Cijelo domaćinstvo</option>
          </select>
          <select name="link" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-note">
            <option value="">Poveži s… (opcionalno)</option>
            {(tasks ?? []).length > 0 && (
              <optgroup label="Zadaci">
                {tasks!.map((t) => <option key={t.id} value={`task:${t.id}`}>{t.title}</option>)}
              </optgroup>
            )}
            {(bills ?? []).length > 0 && (
              <optgroup label="Računi">
                {bills!.map((b) => <option key={b.id} value={`bill:${b.id}`}>{b.title}</option>)}
              </optgroup>
            )}
            {(events ?? []).length > 0 && (
              <optgroup label="Događaji">
                {events!.map((e) => <option key={e.id} value={`calendar_event:${e.id}`}>{e.title}</option>)}
              </optgroup>
            )}
          </select>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-sm text-muted inline-flex items-center gap-2">
            <input type="checkbox" name="journal" className="accent-note" /> Dnevnički zapis
          </label>
          <button className="rounded-lg bg-note text-white text-sm px-4 py-2">Spremi bilješku</button>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="text-sm font-medium mb-2 flex items-center gap-1.5"><StickyNote size={15} /> Bilješke</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {general.length === 0 && <p className="text-sm text-muted">Još nema bilješki.</p>}
            {general.map((n) => <NoteCard key={n.id} n={n} />)}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-medium mb-2 flex items-center gap-1.5"><BookOpen size={15} /> Dnevnik</h2>
          <div className="space-y-3">
            {journal.length === 0 && <p className="text-sm text-muted">Nema dnevničkih zapisa.</p>}
            {journal.map((n) => <NoteCard key={n.id} n={n} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
