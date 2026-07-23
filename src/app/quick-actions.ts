"use server";
import { getContext } from "@/lib/session";
import { createTask } from "@/lib/apps/tasks/actions";
import { publish } from "@/lib/platform/events";
import { revalidatePath } from "next/cache";

export type CaptureKind = "task" | "note" | "reminder";

// Brzo dodavanje s dashboarda — jedno mjesto za zadatak, bilješku ili
// podsjetnik ("Quick capture" iz zadatka: dodaj bilo šta bez kopanja po menijima).
export async function quickCapture(
  kind: CaptureKind,
  text: string,
  whenISO?: string
): Promise<{ ok?: boolean; error?: string }> {
  const t = text.trim();
  if (!t) return { error: "Upiši nešto." };

  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return { error: "Nisi prijavljen." };

  try {
    if (kind === "task") {
      await createTask(db, { householdId, ownerId: user.id, title: t });
    } else if (kind === "note") {
      const { data } = await db
        .from("notes")
        .insert({ household_id: householdId, owner_id: user.id, title: t, visibility: "private" })
        .select("id")
        .single();
      if (data) {
        await publish(db, {
          type: "note.created",
          household_id: householdId,
          actor_id: user.id,
          payload: { noteId: data.id, title: t },
        });
      }
    } else if (kind === "reminder") {
      // Ako vrijeme nije zadano, podsjeti za sat vremena (da ostane "brzo").
      const fireAt = whenISO ? new Date(whenISO).toISOString() : new Date(Date.now() + 3600_000).toISOString();
      await db.from("reminders").insert({
        household_id: householdId,
        owner_id: user.id,
        target_id: user.id,
        title: t,
        fire_at: fireAt,
      });
    }
  } catch {
    return { error: "Greška pri spremanju. Pokušaj ponovo." };
  }

  revalidatePath("/");
  revalidatePath("/tasks");
  revalidatePath("/reminders");
  return { ok: true };
}
