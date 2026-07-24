import { redirect } from "next/navigation";
import { getContext } from "@/lib/session";
import { addRecord, deleteRecord, createList, addItem, toggleItem, deleteList } from "./actions";
import { Archive, FileText, ShieldCheck, RefreshCw, Phone, Trash2, Plus, ListChecks } from "lucide-react";

export const dynamic = "force-dynamic";

const KINDS: { key: string; label: string; icon: any }[] = [
  { key: "document", label: "Dokument", icon: FileText },
  { key: "warranty", label: "Garancija", icon: ShieldCheck },
  { key: "renewal", label: "Obnova", icon: RefreshCw },
  { key: "contact", label: "Kontakt", icon: Phone },
  { key: "other", label: "Ostalo", icon: Archive },
];

export default async function LifeAdminPage() {
  const { db, user, householdId } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema…</p>;

  const [{ data: records }, { data: lists }, { data: items }] = await Promise.all([
    db.from("life_records").select("id, kind, title, provider, reference, notes, expiry_at, visibility")
      .eq("household_id", householdId).order("expiry_at", { ascending: true, nullsFirst: false }),
    db.from("shopping_lists").select("id, name").eq("household_id", householdId)
      .order("created_at", { ascending: true }),
    db.from("shopping_items").select("id, list_id, text, done").eq("household_id", householdId)
      .order("created_at", { ascending: true }),
  ]);

  async function create(formData: FormData) {
    "use server";
    await addRecord({
      kind: String(formData.get("kind") || "document"),
      title: String(formData.get("title") || ""),
      provider: String(formData.get("provider") || ""),
      reference: String(formData.get("reference") || ""),
      notes: String(formData.get("notes") || ""),
      expiry: String(formData.get("expiry") || ""),
      visibility: (formData.get("visibility") as "private" | "household") || "household",
    });
  }
  async function removeRec(formData: FormData) { "use server"; await deleteRecord(String(formData.get("id"))); }
  async function newList(formData: FormData) { "use server"; await createList(String(formData.get("name"))); }
  async function newItem(formData: FormData) { "use server"; await addItem(String(formData.get("listId")), String(formData.get("text"))); }
  async function flip(formData: FormData) { "use server"; await toggleItem(String(formData.get("id")), String(formData.get("done")) === "true"); }
  async function rmList(formData: FormData) { "use server"; await deleteList(String(formData.get("id"))); }

  const iconFor = (k: string) => (KINDS.find((x) => x.key === k)?.icon ?? Archive);
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-life-soft text-life">
          <Archive size={19} strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-semibold">Kućni ured</h1>
      </div>
      <p className="text-muted text-sm mb-6">
        Dokumenti, garancije, obnove i kontakti. Rok obnove automatski kreira podsjetnik 7 dana ranije.
      </p>

      <form action={create} className="rounded-xl border border-line bg-white p-4 mb-8 space-y-3 shadow-soft">
        <div className="grid gap-3 sm:grid-cols-[160px_1fr_1fr]">
          <select name="kind" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-life">
            {KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
          </select>
          <input name="title" required placeholder="Naziv (npr. Osiguranje auta)"
            className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-life" />
          <input name="provider" placeholder="Dobavljač / izdavač"
            className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-life" />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_180px]">
          <input name="reference" placeholder="Broj polise / telefon / e-mail"
            className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-life" />
          <input name="expiry" type="date"
            className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-life" />
          <select name="visibility" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-life">
            <option value="household">Cijelo domaćinstvo</option>
            <option value="private">Samo ja</option>
          </select>
        </div>
        <div className="flex items-center justify-between gap-3">
          <input name="notes" placeholder="Napomena (opcionalno)"
            className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-life" />
          <button className="rounded-lg bg-life text-white text-sm px-4 py-2 shrink-0">Dodaj zapis</button>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Zapisi */}
        <div>
          <h2 className="text-sm font-medium mb-2">Zapisi</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(records ?? []).length === 0 && <p className="text-sm text-muted">Još nema zapisa.</p>}
            {(records ?? []).map((r) => {
              const Icon = iconFor(r.kind);
              const overdue = r.expiry_at && new Date(r.expiry_at) < startToday;
              return (
                <div key={r.id} className="rounded-xl border border-line bg-white p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm flex items-center gap-1.5">
                        <Icon size={15} className="text-life" /> {r.title}
                      </p>
                      {r.provider && <p className="text-xs text-muted mt-0.5">{r.provider}</p>}
                      {r.reference && <p className="text-xs text-muted">{r.reference}</p>}
                      {r.notes && <p className="text-xs text-ink/70 mt-1">{r.notes}</p>}
                    </div>
                    <form action={removeRec}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className="text-muted hover:text-rose shrink-0" aria-label="Obriši"><Trash2 size={15} /></button>
                    </form>
                  </div>
                  {r.expiry_at && (
                    <p className={`text-[11px] mt-2 ${overdue ? "text-warn" : "text-muted"}`}>
                      {overdue ? "Isteklo" : "Ističe"}: {new Date(r.expiry_at).toLocaleDateString("bs")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Dijeljene liste */}
        <div>
          <h2 className="text-sm font-medium mb-2 flex items-center gap-1.5"><ListChecks size={15} /> Dijeljene liste</h2>
          <form action={newList} className="flex gap-2 mb-3">
            <input name="name" required placeholder="Nova lista (npr. Kupovina)"
              className="flex-1 rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-life" />
            <button className="rounded-lg bg-life text-white text-sm px-3"><Plus size={16} /></button>
          </form>
          <div className="space-y-3">
            {(lists ?? []).length === 0 && <p className="text-sm text-muted">Nema lista.</p>}
            {(lists ?? []).map((l) => {
              const its = (items ?? []).filter((i) => i.list_id === l.id);
              return (
                <div key={l.id} className="rounded-xl border border-line bg-white p-3 shadow-soft">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">{l.name}</p>
                    <form action={rmList}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className="text-muted hover:text-rose" aria-label="Obriši listu"><Trash2 size={14} /></button>
                    </form>
                  </div>
                  <ul className="space-y-1 mb-2">
                    {its.map((i) => (
                      <li key={i.id}>
                        <form action={flip} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={i.id} />
                          <input type="hidden" name="done" value={String(i.done)} />
                          <button className={`h-4 w-4 rounded border grid place-items-center text-[10px] ${i.done ? "bg-life border-life text-white" : "border-line"}`}>
                            {i.done ? "✓" : ""}
                          </button>
                          <span className={`text-sm ${i.done ? "line-through text-muted" : ""}`}>{i.text}</span>
                        </form>
                      </li>
                    ))}
                    {its.length === 0 && <li className="text-xs text-muted">Prazna lista.</li>}
                  </ul>
                  <form action={newItem} className="flex gap-2">
                    <input type="hidden" name="listId" value={l.id} />
                    <input name="text" required placeholder="Dodaj stavku…"
                      className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-xs outline-none focus:border-life" />
                    <button className="rounded-lg border border-line text-xs px-2 hover:bg-life-soft"><Plus size={14} /></button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
