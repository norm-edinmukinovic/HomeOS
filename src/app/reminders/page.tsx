import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const { db, user, householdId } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema…</p>;

  const { data: reminders } = await db
    .from("reminders")
    .select("id, title, fire_at, fired, recurring")
    .eq("household_id", householdId)
    .order("fire_at", { ascending: true });

  async function addReminder(formData: FormData) {
    "use server";
    const { db, user, householdId } = await getContext();
    if (!user || !householdId) return;
    await db.from("reminders").insert({
      household_id: householdId, owner_id: user.id, target_id: user.id,
      title: String(formData.get("title")),
      fire_at: new Date(String(formData.get("fire"))).toISOString(),
      recurring: (formData.get("recurring") as string) || null,
    });
    revalidatePath("/reminders"); revalidatePath("/");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Podsjetnici</h1>
      <p className="text-muted text-sm mb-6">Kad dospiju, cron ih pošalje e-mailom (ako je kategorija uključena).</p>
      <form action={addReminder} className="rounded-xl border border-line bg-white p-4 mb-8 grid gap-3 sm:grid-cols-[1fr_200px_140px_auto]">
        <input name="title" required placeholder="Podsjeti me da…" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent" />
        <input name="fire" type="datetime-local" required className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent" />
        <select name="recurring" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent">
          <option value="">Jednokratno</option>
          <option value="daily">Svaki dan</option>
          <option value="weekly">Svake sedmice</option>
        </select>
        <button className="rounded-lg bg-accent text-white text-sm px-4 py-2">Dodaj</button>
      </form>
      <ul className="rounded-xl border border-line bg-white divide-y divide-line">
        {(reminders ?? []).length === 0 && <li className="px-4 py-6 text-sm text-muted text-center">Nema podsjetnika.</li>}
        {(reminders ?? []).map((r) => (
          <li key={r.id} className="px-4 py-3 flex items-center justify-between">
            <span className={`text-sm ${r.fired ? "text-muted" : ""}`}>{r.title}{r.recurring ? ` · ${r.recurring === "daily" ? "dnevno" : "sedmično"}` : ""}</span>
            <span className="text-xs text-muted">{new Date(r.fire_at).toLocaleString("bs")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
