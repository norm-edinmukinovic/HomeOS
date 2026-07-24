import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/session";
import { createReminder } from "@/lib/apps/reminders/actions";
import { Bell, Check, RotateCw } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const { db, user, householdId } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema…</p>;

  const [{ data: reminders }, { data: members }] = await Promise.all([
    db.from("reminders")
      .select("id, title, fire_at, fired, recurring, target_id, owner_id")
      .eq("household_id", householdId)
      .order("fire_at", { ascending: true }),
    db.from("household_members")
      .select("user_id, display_name")
      .eq("household_id", householdId),
  ]);

  const nameOf = (id: string | null) =>
    members?.find((m) => m.user_id === id)?.display_name ?? "—";

  async function addReminder(formData: FormData) {
    "use server";
    const { db, user, householdId } = await getContext();
    if (!user || !householdId) return;
    await createReminder(db, {
      householdId,
      ownerId: user.id,
      title: String(formData.get("title")),
      fireAt: new Date(String(formData.get("fire"))).toISOString(),
      targetId: (formData.get("target") as string) || user.id,
      recurring: (formData.get("recurring") as string) || null,
    });
    revalidatePath("/reminders");
    revalidatePath("/");
  }

  async function toggleFired(formData: FormData) {
    "use server";
    const { db, user } = await getContext();
    if (!user) return;
    const id = String(formData.get("id"));
    const fired = String(formData.get("fired")) === "true";
    await db.from("reminders").update({ fired: !fired }).eq("id", id);
    revalidatePath("/reminders");
    revalidatePath("/");
  }

  const now = Date.now();

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sun-soft text-sun">
          <Bell size={19} strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-semibold">Podsjetnici</h1>
      </div>
      <p className="text-muted text-sm mb-6">
        Jednokratni i ponavljajući, usmjereni na određenog člana. Kad dospiju, cron ih pošalje e-mailom (ako je kategorija uključena).
      </p>

      <form action={addReminder} className="rounded-xl border border-line bg-white p-4 mb-8 grid gap-3 sm:grid-cols-[1fr_180px_150px_130px_auto]">
        <input name="title" required placeholder="Podsjeti da…" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-sun" />
        <input name="fire" type="datetime-local" required className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-sun" />
        <select name="target" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-sun">
          {(members ?? []).map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.display_name}{m.user_id === user.id ? " (ja)" : ""}</option>
          ))}
        </select>
        <select name="recurring" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-sun">
          <option value="">Jednokratno</option>
          <option value="daily">Svaki dan</option>
          <option value="weekly">Svake sedmice</option>
        </select>
        <button className="rounded-lg bg-sun text-white text-sm px-4 py-2">Dodaj</button>
      </form>

      <ul className="rounded-xl border border-line bg-white divide-y divide-line">
        {(reminders ?? []).length === 0 && <li className="px-4 py-6 text-sm text-muted text-center">Nema podsjetnika.</li>}
        {(reminders ?? []).map((r) => {
          const due = new Date(r.fire_at).getTime() <= now && !r.fired;
          return (
            <li key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-sm truncate ${r.fired ? "text-muted line-through" : ""}`}>
                  {r.title}
                  {r.recurring && <RotateCw size={12} className="inline ml-1.5 mb-0.5 text-muted" />}
                </p>
                <p className="text-xs text-muted">
                  {new Date(r.fire_at).toLocaleString("bs")} · za {nameOf(r.target_id)}
                  {due && <span className="ml-2 text-warn">dospjelo</span>}
                </p>
              </div>
              <form action={toggleFired}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="fired" value={String(r.fired)} />
                <button className={`text-xs rounded-lg border px-2.5 py-1 inline-flex items-center gap-1 ${r.fired ? "border-line text-muted" : "border-sun text-sun hover:bg-sun-soft"}`}>
                  <Check size={13} /> {r.fired ? "Vrati" : "Gotovo"}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
