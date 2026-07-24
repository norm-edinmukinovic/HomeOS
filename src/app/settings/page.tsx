import { redirect } from "next/navigation";
import { getContext } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { installApps } from "@/lib/apps";
import { navItems } from "@/lib/platform/registry";
import { loadCustomApps, customNavId } from "@/lib/platform/custom";
import { toggleHidden, toggleAvailability, createCustomApp, deleteCustomApp } from "./actions";
import { Sparkles, Trash2, Eye, EyeOff, Lock, Unlock, Plus, Puzzle } from "lucide-react";

export const dynamic = "force-dynamic";

const CATEGORIES: { key: string; label: string; desc: string }[] = [
  { key: "reminder", label: "Podsjetnici", desc: "Kad se okine podsjetnik namijenjen tebi." },
  { key: "task_assigned", label: "Dodijeljeni zadaci", desc: "Kad ti neko dodijeli zadatak." },
  { key: "bill_due", label: "Dospjeli računi", desc: "Kad račun uskoro dospijeva." },
  { key: "digest", label: "Dnevni sažetak", desc: "Jutarnji pregled onoga što danas dolazi." },
];

export default async function SettingsPage() {
  installApps();
  const { db, user, username, householdId } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema…</p>;

  const [{ data: optouts }, { data: role }, { data: avail }, { data: hidden }, customApps] =
    await Promise.all([
      db.from("notification_optouts").select("category").eq("user_id", user.id),
      db.from("household_members").select("role").eq("household_id", householdId).eq("user_id", user.id).maybeSingle(),
      db.from("app_availability").select("app_id, available").eq("household_id", householdId),
      db.from("app_hidden").select("app_id").eq("user_id", user.id),
      loadCustomApps(db, householdId),
    ]);

  const isAdmin = role?.role === "admin";
  const off = new Set((optouts ?? []).map((o) => o.category));
  const unavailable = new Set((avail ?? []).filter((a) => a.available === false).map((a) => a.app_id));
  const hiddenSet = new Set((hidden ?? []).map((h) => h.app_id));

  const builtin = navItems().map((a) => ({ id: a.id, name: a.name }));
  const customList = customApps.map((a) => ({ id: customNavId(a.slug), name: a.name, rawId: a.id, slug: a.slug }));

  // --- server akcije ---
  async function logout() { "use server"; const { db } = await getContext(); await db.auth.signOut(); redirect("/login"); }
  async function toggleCat(formData: FormData) {
    "use server";
    const category = String(formData.get("category"));
    const currentlyOn = String(formData.get("currentlyOn")) === "true";
    const { db, user } = await getContext();
    if (!user) return;
    if (currentlyOn) await db.from("notification_optouts").insert({ user_id: user.id, category });
    else await db.from("notification_optouts").delete().eq("user_id", user.id).eq("category", category);
    revalidatePath("/settings");
  }
  async function doHide(formData: FormData) { "use server"; await toggleHidden(String(formData.get("appId")), String(formData.get("hidden")) === "true"); }
  async function doAvail(formData: FormData) { "use server"; await toggleAvailability(String(formData.get("appId")), String(formData.get("available")) === "true"); }
  async function doDelete(formData: FormData) { "use server"; await deleteCustomApp(String(formData.get("id"))); }
  async function doCreate(formData: FormData) {
    "use server";
    const res = await createCustomApp({
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || ""),
      itemNoun: String(formData.get("noun") || ""),
      connectTask: formData.get("task") === "on",
      connectCalendar: formData.get("calendar") === "on",
      connectReminder: formData.get("reminder") === "on",
    });
    if (res.slug) redirect(`/x/${res.slug}`);
  }

  const AppRow = ({ id, name, rawId, slug }: { id: string; name: string; rawId?: string; slug?: string }) => {
    const isHidden = hiddenSet.has(id);
    const isUnavailable = unavailable.has(id);
    return (
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium flex items-center gap-1.5">
            {name}
            {slug && <span className="text-[10px] rounded-full bg-indigo-soft text-indigo px-1.5 py-0.5 inline-flex items-center gap-1"><Sparkles size={9} /> moja</span>}
            {isUnavailable && <span className="text-[10px] rounded-full bg-rose-soft text-rose px-1.5 py-0.5">nedostupno</span>}
          </p>
          <p className="text-xs text-muted">{isHidden ? "Sakriveno iz tvoje navigacije" : "Vidljivo u tvojoj navigaciji"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <form action={doAvail}>
              <input type="hidden" name="appId" value={id} />
              <input type="hidden" name="available" value={String(!isUnavailable)} />
              <button className={`text-xs rounded-lg border px-2.5 py-1 inline-flex items-center gap-1 ${isUnavailable ? "border-line text-muted" : "border-accent text-accent bg-accentSoft"}`} title="Dostupnost za domaćinstvo">
                {isUnavailable ? <Lock size={12} /> : <Unlock size={12} />} {isUnavailable ? "Nedostupno" : "Dostupno"}
              </button>
            </form>
          )}
          <form action={doHide}>
            <input type="hidden" name="appId" value={id} />
            <input type="hidden" name="hidden" value={String(isHidden)} />
            <button className="text-xs rounded-lg border border-line px-2.5 py-1 inline-flex items-center gap-1 hover:bg-paper" title="Prikaži/sakrij za mene">
              {isHidden ? <><Eye size={12} /> Prikaži</> : <><EyeOff size={12} /> Sakrij</>}
            </button>
          </form>
          {rawId && (
            <form action={doDelete}>
              <input type="hidden" name="id" value={rawId} />
              <button className="text-muted hover:text-rose" aria-label="Obriši aplikaciju"><Trash2 size={15} /></button>
            </form>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-up">
      <h1 className="text-2xl font-semibold mb-1">Postavke</h1>
      <p className="text-muted text-sm mb-6">Nalog, aplikacije i obavijesti.</p>

      {/* Nalog */}
      <div className="rounded-2xl border border-line bg-white shadow-soft px-4 py-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-ink">@{username}</p>
          <p className="text-xs text-muted">{user.email}{isAdmin && " · administrator"}</p>
        </div>
        <form action={logout}>
          <button className="text-sm rounded-xl border border-line px-3.5 py-2 text-ink transition-colors hover:border-rose hover:text-rose">Odjava</button>
        </form>
      </div>

      {/* Aplikacije */}
      <h2 className="text-sm font-medium text-ink mb-2 flex items-center gap-1.5"><Puzzle size={15} /> Aplikacije</h2>
      <p className="text-xs text-muted mb-2">
        Sakrij ono što ti ne treba. {isAdmin ? "Kao administrator možeš app učiniti (ne)dostupnim cijelom domaćinstvu." : "Dostupnost za domaćinstvo podešava administrator."}
      </p>
      <div className="rounded-xl border border-line bg-white divide-y divide-line mb-4">
        {builtin.map((a) => <AppRow key={a.id} id={a.id} name={a.name} />)}
        {customList.map((a) => <AppRow key={a.id} id={a.id} name={a.name} rawId={a.rawId} slug={a.slug} />)}
      </div>

      {/* Napravi novu aplikaciju */}
      <div className="rounded-xl border border-dashed border-indigo/40 bg-indigo-soft/30 p-4 mb-8">
        <h3 className="text-sm font-medium flex items-center gap-1.5 mb-1"><Sparkles size={15} className="text-indigo" /> Napravi novu aplikaciju</h3>
        <p className="text-xs text-muted mb-3">
          Opiši šta ti treba i odaberi s čime se povezuje. Nova app se odmah pojavi u navigaciji, na „Danas", u pretrazi — i koristi postojeće app-ove (zadatke, kalendar, podsjetnike) umjesto da gradi svoje.
        </p>
        <form action={doCreate} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <input name="name" required placeholder="Naziv (npr. Teretana, Biljke, Auto)"
              className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo" />
            <input name="noun" placeholder="Naziv stavke (npr. trening)"
              className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo" />
          </div>
          <input name="description" placeholder="Kratak opis šta prati (opcionalno)"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-indigo" />
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="text-xs text-muted">Poveži sa:</span>
            <label className="inline-flex items-center gap-1.5"><input type="checkbox" name="task" className="accent-indigo" /> Zadaci</label>
            <label className="inline-flex items-center gap-1.5"><input type="checkbox" name="calendar" className="accent-indigo" /> Kalendar</label>
            <label className="inline-flex items-center gap-1.5"><input type="checkbox" name="reminder" className="accent-indigo" /> Podsjetnici</label>
          </div>
          <div className="flex justify-end">
            <button className="rounded-lg bg-indigo text-white text-sm px-4 py-2 inline-flex items-center gap-1.5"><Plus size={15} /> Kreiraj aplikaciju</button>
          </div>
        </form>
      </div>

      {/* E-mail obavijesti */}
      <h2 className="text-sm font-medium text-ink mb-2">E-mail obavijesti</h2>
      <div className="rounded-xl border border-line bg-white divide-y divide-line">
        {CATEGORIES.map((c) => {
          const isOn = !off.has(c.key);
          return (
            <form key={c.key} action={toggleCat} className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{c.label}</p>
                <p className="text-xs text-muted">{c.desc}</p>
              </div>
              <input type="hidden" name="category" value={c.key} />
              <input type="hidden" name="currentlyOn" value={String(isOn)} />
              <button type="submit" className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${isOn ? "bg-accentSoft border-accent text-accent" : "bg-white border-line text-muted"}`}>
                {isOn ? "Uključeno" : "Isključeno"}
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
