import { redirect, notFound } from "next/navigation";
import { getContext } from "@/lib/session";
import { addCustomItem, toggleCustomItem, deleteCustomItem } from "./actions";
import { Sparkles, Trash2, ListChecks, CalendarDays, Bell, Link2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomAppPage({ params }: { params: { slug: string } }) {
  const { db, user, householdId } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema…</p>;

  const { data: app } = await db
    .from("custom_apps")
    .select("id, slug, name, description, item_noun, connect_task, connect_calendar, connect_reminder")
    .eq("household_id", householdId)
    .eq("slug", params.slug)
    .maybeSingle();
  if (!app) notFound();

  const { data: items } = await db
    .from("custom_items")
    .select("id, title, notes, due_at, done, visibility")
    .eq("household_id", householdId)
    .eq("app_id", app.id)
    .order("created_at", { ascending: false });

  async function create(formData: FormData) {
    "use server";
    await addCustomItem({
      slug: app!.slug,
      title: String(formData.get("title") || ""),
      notes: String(formData.get("notes") || ""),
      due: String(formData.get("due") || ""),
      visibility: (formData.get("visibility") as "private" | "household") || "household",
    });
  }
  async function flip(formData: FormData) {
    "use server";
    await toggleCustomItem(app!.slug, String(formData.get("id")), String(formData.get("done")) === "true");
  }
  async function remove(formData: FormData) {
    "use server";
    await deleteCustomItem(app!.slug, String(formData.get("id")));
  }

  const noun = app.item_noun || "stavka";

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-soft text-indigo">
          <Sparkles size={19} strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-semibold">{app.name}</h1>
      </div>
      <p className="text-muted text-sm mb-3">{app.description || `Tvoja aplikacija za: ${noun}.`}</p>

      {/* Prikaz veza s ostalim app-ovima */}
      {(app.connect_task || app.connect_calendar || app.connect_reminder) && (
        <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
          <span className="text-muted inline-flex items-center gap-1"><Link2 size={13} /> Povezano:</span>
          {app.connect_task && <span className="inline-flex items-center gap-1 rounded-full bg-sky-soft text-sky px-2 py-0.5"><ListChecks size={12} /> Zadaci</span>}
          {app.connect_calendar && <span className="inline-flex items-center gap-1 rounded-full bg-lav-soft text-lav px-2 py-0.5"><CalendarDays size={12} /> Kalendar</span>}
          {app.connect_reminder && <span className="inline-flex items-center gap-1 rounded-full bg-sun-soft text-sun px-2 py-0.5"><Bell size={12} /> Podsjetnici</span>}
        </div>
      )}

      <form action={create} className="rounded-xl border border-line bg-white p-4 mb-8 space-y-3 shadow-soft">
        <input name="title" required placeholder={`Novi/a ${noun}…`}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo" />
        <div className="grid gap-3 sm:grid-cols-[1fr_200px_160px]">
          <input name="notes" placeholder="Napomena (opcionalno)"
            className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo" />
          <input name="due" type="datetime-local"
            className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo" />
          <select name="visibility" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo">
            <option value="household">Cijelo domaćinstvo</option>
            <option value="private">Samo ja</option>
          </select>
        </div>
        <div className="flex justify-end">
          <button className="rounded-lg bg-indigo text-white text-sm px-4 py-2">Dodaj</button>
        </div>
      </form>

      <ul className="rounded-xl border border-line bg-white divide-y divide-line">
        {(items ?? []).length === 0 && <li className="px-4 py-6 text-sm text-muted text-center">Još nema stavki.</li>}
        {(items ?? []).map((it) => (
          <li key={it.id} className="px-4 py-3 flex items-center justify-between gap-3">
            <form action={flip} className="flex items-center gap-2.5 min-w-0">
              <input type="hidden" name="id" value={it.id} />
              <input type="hidden" name="done" value={String(it.done)} />
              <button className={`h-4 w-4 rounded border grid place-items-center text-[10px] shrink-0 ${it.done ? "bg-indigo border-indigo text-white" : "border-line"}`}>
                {it.done ? "✓" : ""}
              </button>
              <span className="min-w-0">
                <span className={`text-sm ${it.done ? "line-through text-muted" : ""}`}>{it.title}</span>
                {it.notes && <span className="block text-xs text-muted truncate">{it.notes}</span>}
              </span>
            </form>
            <div className="flex items-center gap-3 shrink-0">
              {it.due_at && <span className="text-xs text-muted">{new Date(it.due_at).toLocaleString("bs", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}
              <form action={remove}>
                <input type="hidden" name="id" value={it.id} />
                <button className="text-muted hover:text-rose" aria-label="Obriši"><Trash2 size={15} /></button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
