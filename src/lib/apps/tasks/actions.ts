import type { SupabaseClient } from "@supabase/supabase-js";
import { publish } from "@/lib/platform/events";

// Javna akcija Tasks app-a. DRUGI app-ovi je koriste umjesto da prave svoj
// sistem zadataka ("build on what exists, don't duplicate it").
export async function createTask(
  db: SupabaseClient,
  input: {
    householdId: string;
    ownerId: string;
    title: string;
    dueAt?: string | null;
    assigneeId?: string | null;
    board?: string | null;
  }
) {
  const { data, error } = await db
    .from("tasks")
    .insert({
      household_id: input.householdId,
      owner_id: input.ownerId,
      title: input.title,
      due_at: input.dueAt ?? null,
      assignee_id: input.assigneeId ?? null,
      board: input.board ?? null,
    })
    .select("id, title, due_at, assignee_id")
    .single();

  if (error) throw error;

  await publish(db, {
    type: "task.created",
    household_id: input.householdId,
    actor_id: input.ownerId,
    payload: { taskId: data.id, title: data.title, assigneeId: data.assignee_id },
  });

  return data;
}

export async function completeTask(
  db: SupabaseClient,
  householdId: string,
  taskId: string,
  actorId: string
) {
  const { error } = await db.from("tasks").update({ status: "done" }).eq("id", taskId);
  if (error) throw error;
  await publish(db, {
    type: "task.completed",
    household_id: householdId,
    actor_id: actorId,
    payload: { taskId },
  });
}
