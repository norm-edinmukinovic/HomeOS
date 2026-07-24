"use server";
import { getContext } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { publish, linkObjects } from "@/lib/platform/events";
import { createTask } from "@/lib/apps/tasks/actions";
import { createReminder } from "@/lib/apps/reminders/actions";

function refresh(slug: string) {
  revalidatePath(`/x/${slug}`);
  revalidatePath("/");
}

export interface AddCustomItemInput {
  slug: string;
  title: string;
  notes?: string;
  due?: string;                  // datetime-local
  visibility?: "private" | "household";
}

// Kreiranje stavke u korisničkoj app-i. Ako je app tako podešena, koristi
// ZAJEDNIČKE sposobnosti platforme (Tasks / Calendar / Reminders) i poveže
// objekte u connected web — nova app ne gradi svoj sistem, nego reuse-a.
export async function addCustomItem(input: AddCustomItemInput): Promise<{ error?: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Upiši naziv." };

  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return { error: "Nisi prijavljen." };

  const { data: app } = await db
    .from("custom_apps")
    .select("id, slug, name, connect_task, connect_calendar, connect_reminder")
    .eq("household_id", householdId)
    .eq("slug", input.slug)
    .maybeSingle();
  if (!app) return { error: "Aplikacija ne postoji." };

  const dueIso = input.due ? new Date(input.due).toISOString() : null;

  const { data: item, error } = await db
    .from("custom_items")
    .insert({
      household_id: householdId,
      app_id: app.id,
      owner_id: user.id,
      visibility: input.visibility === "private" ? "private" : "household",
      title,
      notes: input.notes?.trim() || null,
      due_at: dueIso,
    })
    .select("id")
    .single();
  if (error || !item) return { error: "Greška pri spremanju." };

  // ---- Uvezivanje s ostalim app-ovima (connected web) ----
  try {
    if (app.connect_task) {
      const task = await createTask(db, {
        householdId, ownerId: user.id,
        title: `${app.name}: ${title}`,
        dueAt: dueIso,
      });
      await linkObjects(db, householdId,
        { type: "custom_item", id: item.id }, { type: "task", id: task.id }, "created");
    }
    if (app.connect_calendar && dueIso) {
      const { data: ev } = await db.from("calendar_events").insert({
        household_id: householdId, owner_id: user.id, visibility: "household",
        title: `${app.name}: ${title}`, starts_at: dueIso,
      }).select("id").single();
      if (ev) await linkObjects(db, householdId,
        { type: "custom_item", id: item.id }, { type: "calendar_event", id: ev.id }, "scheduled");
    }
    if (app.connect_reminder && dueIso) {
      const fire = new Date(new Date(dueIso).getTime() - 86400000); // dan ranije
      const rem = await createReminder(db, {
        householdId, ownerId: user.id,
        title: `${app.name}: ${title}`,
        fireAt: (fire.getTime() > Date.now() ? fire : new Date()).toISOString(),
        targetId: user.id,
      });
      await linkObjects(db, householdId,
        { type: "custom_item", id: item.id }, { type: "reminder", id: rem.id }, "reminds");
    }
  } catch (e) {
    // Ako neka sposobnost nije dostupna, stavka je svejedno spremljena.
    console.error("[custom] uvezivanje nije uspjelo:", e);
  }

  await publish(db, {
    type: `custom.${app.slug}.created`,
    household_id: householdId,
    actor_id: user.id,
    payload: { itemId: item.id, title },
  });

  refresh(input.slug);
  return {};
}

export async function toggleCustomItem(slug: string, id: string, done: boolean) {
  const { db, user } = await getContext();
  if (!user) return;
  await db.from("custom_items").update({ done: !done }).eq("id", id);
  refresh(slug);
}

export async function deleteCustomItem(slug: string, id: string) {
  const { db, user } = await getContext();
  if (!user) return;
  await db.from("custom_items").delete().eq("id", id);
  refresh(slug);
}
