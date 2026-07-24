import type { SupabaseClient } from "@supabase/supabase-js";
import { publish } from "@/lib/platform/events";

// ---------------------------------------------------------------------
//  Zajednička sposobnost platforme: napraviti podsjetnik.
//  Bilo koji app (Life admin, Finance…) je koristi umjesto da gradi svoj
//  sistem podsjetnika — "shared capabilities are provided once by the
//  platform" iz zadatka.
// ---------------------------------------------------------------------
export async function createReminder(
  db: SupabaseClient,
  input: {
    householdId: string;
    ownerId: string;
    title: string;
    fireAt: string;                 // ISO
    targetId?: string | null;       // kome je namijenjen (default: vlasnik)
    recurring?: string | null;      // 'daily' | 'weekly' | null
    visibility?: "private" | "household" | "shared";
  }
) {
  const { data, error } = await db
    .from("reminders")
    .insert({
      household_id: input.householdId,
      owner_id: input.ownerId,
      target_id: input.targetId ?? input.ownerId,
      title: input.title,
      fire_at: input.fireAt,
      recurring: input.recurring ?? null,
      visibility: input.visibility ?? "household",
    })
    .select("id, title, fire_at, target_id")
    .single();
  if (error) throw error;

  await publish(db, {
    type: "reminder.created",
    household_id: input.householdId,
    actor_id: input.ownerId,
    payload: { reminderId: data.id, title: data.title, fireAt: data.fire_at, targetId: data.target_id },
  });

  return data;
}
