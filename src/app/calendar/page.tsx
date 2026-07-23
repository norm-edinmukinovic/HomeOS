import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const { db, user, householdId } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema…</p>;

  const { data: events } = await db
    .from("calendar_events")
    .select("id, title, starts_at, location")
    .eq("household_id", householdId)
    .order("starts_at", { ascending: true });

  async function addEvent(formData: FormData) {
    "use server";
    const { db, user, householdId } = await getContext();
    if (!user || !householdId) return;
    await db.from("calendar_events").insert({
      household_id: householdId, owner_id: user.id,
      title: String(formData.get("title")),
      starts_at: new Date(String(formData.get("start"))).toISOString(),
      location: (formData.get("location") as string) || null,
    });
    revalidatePath("/calendar"); revalidatePath("/");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Kalendar</h1>
      <p className="text-muted text-sm mb-6">Zajednički događaji domaćinstva. Zadaci s rokom pojavljuju se na „Danas“.</p>
      <form action={addEvent} className="rounded-xl border border-line bg-white p-4 mb-8 grid gap-3 sm:grid-cols-[1fr_200px_1fr_auto]">
        <input name="title" required placeholder="Naziv događaja" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent" />
        <input name="start" type="datetime-local" required className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent" />
        <input name="location" placeholder="Mjesto (opcionalno)" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent" />
        <button className="rounded-lg bg-accent text-white text-sm px-4 py-2">Dodaj</button>
      </form>
      <ul className="rounded-xl border border-line bg-white divide-y divide-line">
        {(events ?? []).length === 0 && <li className="px-4 py-6 text-sm text-muted text-center">Nema događaja.</li>}
        {(events ?? []).map((e) => (
          <li key={e.id} className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm">{e.title}{e.location ? ` · ${e.location}` : ""}</span>
            <span className="text-xs text-muted">{new Date(e.starts_at).toLocaleString("bs")}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
