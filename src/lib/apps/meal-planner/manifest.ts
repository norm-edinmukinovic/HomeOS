import type { AppManifest, PlatformEvent } from "@/lib/platform/types";
import { createTask } from "@/lib/apps/tasks/actions";
import { publish, linkObjects } from "@/lib/platform/events";

// =====================================================================
//  DEVETI APP — dokaz proširivosti.
//
//  Ovaj fajl je JEDINO sto je dodano da bi planer obroka postao dio
//  sistema. Nista u ostalih osam app-ova nije mijenjano. Ipak, planer:
//    - pojavljuje se u navigaciji, na dashboardu, u pretrazi i paleti
//      (jer se registruje istim manifestom kao ugradjeni),
//    - NE pravi svoj sistem zadataka nego koristi postojeci Tasks
//      (createTask) — "build on what exists, don't duplicate it",
//    - ucestvuje u connected web-u (povezuje plan obroka sa zadatkom),
//    - objavljuje vlastiti dogadjaj "meal.planned" na koji bilo koji
//      buduci app moze reagovati, a da niko to nije planirao unaprijed,
//    - trazi samo pristup koji mu stvarno treba (requiredAccess).
// =====================================================================

// Kad se isplanira obrok, napravi zadatak za kupovinu preko POSTOJECEG
// Tasks app-a i povezi ga s planom.
async function onMealPlanned(e: PlatformEvent, { db }: { db: any }) {
  const p = e.payload as { mealId: string; name: string; date: string | null };
  const task = await createTask(db, {
    householdId: e.household_id,
    ownerId: e.actor_id ?? "",
    title: `Kupi sastojke za: ${p.name}`,
    dueAt: p.date,
    board: "Kupovina",
  });
  await linkObjects(
    db, e.household_id,
    { type: "meal", id: p.mealId },
    { type: "task", id: task.id },
    "created"
  );
}

// Pomocna akcija app-a: isplaniraj obrok (za studentski demo drzimo ga
// laganim — plan se cuva kao biljeska, a poenta je saradnja kroz platformu).
export async function planMeal(
  db: any,
  input: { householdId: string; ownerId: string; name: string; date?: string | null }
) {
  const { data } = await db
    .from("notes")
    .insert({
      household_id: input.householdId,
      owner_id: input.ownerId,
      title: `Obrok: ${input.name}`,
      body: input.date ?? "",
      tags: ["obrok"],
      visibility: "household",
    })
    .select("id")
    .single();

  await publish(db, {
    type: "meal.planned",
    household_id: input.householdId,
    actor_id: input.ownerId,
    payload: { mealId: data.id, name: input.name, date: input.date ?? null },
  });
  return data;
}

export const mealPlannerApp: AppManifest = {
  id: "meal-planner",
  name: "Planer obroka",
  route: "/meal-planner",
  publishes: ["meal.planned"],
  subscribes: { "meal.planned": onMealPlanned },
  requiredAccess: ["read:notes", "create:notes", "create:tasks"],

  commands: [{ id: "meal.new", label: "Isplaniraj obrok", run: "/meal-planner?new=1" }],

  dashboardCards: [
    {
      title: "Planirani obroci",
      load: async ({ db, householdId }) => {
        const { data } = await db
          .from("notes")
          .select("id, title")
          .eq("household_id", householdId)
          .contains("tags", ["obrok"])
          .order("created_at", { ascending: false })
          .limit(5);
        return (data ?? []).map((n: any) => ({
          id: n.id, label: n.title ?? "Obrok", href: "/meal-planner",
        }));
      },
    },
  ],

  search: async (query, { db, householdId }) => {
    const { data } = await db
      .from("notes").select("id, title")
      .eq("household_id", householdId)
      .contains("tags", ["obrok"])
      .ilike("title", `%${query}%`).limit(5);
    return (data ?? []).map((n: any) => ({
      id: n.id, type: "Obrok", label: n.title ?? "Obrok", href: "/meal-planner",
    }));
  },
};
