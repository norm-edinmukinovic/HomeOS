import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/session";
import { installApps } from "@/lib/apps";
import { planMeal } from "@/lib/apps/meal-planner/manifest";

export const dynamic = "force-dynamic";

export default async function MealPlannerPage() {
  const { db, user, householdId } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema…</p>;

  const { data: meals } = await db
    .from("notes").select("id, title, body")
    .eq("household_id", householdId).contains("tags", ["obrok"])
    .order("created_at", { ascending: false });

  async function add(formData: FormData) {
    "use server";
    installApps(); // registruje subscribers -> "meal.planned" pravi zadatak
    const { db, user, householdId } = await getContext();
    if (!user || !householdId) return;
    await planMeal(db, {
      householdId, ownerId: user.id,
      name: String(formData.get("name")),
      date: formData.get("date") ? new Date(String(formData.get("date"))).toISOString() : null,
    });
    revalidatePath("/meal-planner"); revalidatePath("/tasks"); revalidatePath("/");
  }

  return (
    <div>
      <div className="rounded-lg bg-accentSoft border border-accent/30 px-4 py-2 mb-6 text-xs text-accent">
        Deveti app — dokaz proširivosti. Dodan samo svojim manifestom; koristi postojeći Tasks
        umjesto vlastitog sistema zadataka i objavljuje događaj „meal.planned“.
      </div>
      <h1 className="text-2xl font-semibold mb-1">Planer obroka</h1>
      <p className="text-muted text-sm mb-6">Planiranjem obroka nastaje zadatak „Kupi sastojke…“ na ploči Kupovina.</p>
      <form action={add} className="rounded-xl border border-line bg-white p-4 mb-8 grid gap-3 sm:grid-cols-[1fr_200px_auto]">
        <input name="name" required placeholder="npr. Sarma u nedjelju" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent" />
        <input name="date" type="date" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent" />
        <button className="rounded-lg bg-accent text-white text-sm px-4 py-2">Isplaniraj</button>
      </form>
      <ul className="rounded-xl border border-line bg-white divide-y divide-line">
        {(meals ?? []).length === 0 && <li className="px-4 py-6 text-sm text-muted text-center">Još nema planiranih obroka.</li>}
        {(meals ?? []).map((m) => (
          <li key={m.id} className="px-4 py-3 text-sm">{m.title}</li>
        ))}
      </ul>
    </div>
  );
}
