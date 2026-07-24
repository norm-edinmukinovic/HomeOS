import type { SupabaseClient } from "@supabase/supabase-js";
import { publish } from "@/lib/platform/events";

export interface CreateTaskInput {
  householdId: string;
  ownerId: string;
  title: string;
  dueAt?: string | null;
  assigneeId?: string | null;
  board?: string | null;
  priority?: string | null;      // low | normal | high
  tags?: string[] | null;
  recurring?: string | null;     // daily | weekly | monthly | null
  notes?: string | null;
  parentId?: string | null;      // pod-zadatak
}

// Javna akcija Tasks app-a. DRUGI app-ovi je koriste umjesto da prave svoj
// sistem zadataka ("build on what exists, don't duplicate it").
export async function createTask(db: SupabaseClient, input: CreateTaskInput) {
  const { data, error } = await db
    .from("tasks")
    .insert({
      household_id: input.householdId,
      owner_id: input.ownerId,
      title: input.title,
      due_at: input.dueAt ?? null,
      assignee_id: input.assigneeId ?? null,
      board: input.board ?? null,
      priority: input.priority ?? "normal",
      tags: input.tags ?? [],
      recurring: input.recurring ?? null,
      notes: input.notes ?? null,
      parent_id: input.parentId ?? null,
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

// Sljedeci datum za ponavljajuci zadatak
function nextDue(due: string, recurring: string): string {
  const d = new Date(due);
  if (recurring === "daily") d.setDate(d.getDate() + 1);
  else if (recurring === "weekly") d.setDate(d.getDate() + 7);
  else if (recurring === "monthly") d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export async function completeTask(
  db: SupabaseClient,
  householdId: string,
  taskId: string,
  actorId: string
) {
  // Dohvati zadatak (za ponavljanje)
  const { data: task } = await db
    .from("tasks")
    .select("id, title, due_at, recurring, priority, assignee_id, tags, board, parent_id, owner_id")
    .eq("id", taskId)
    .single();

  const { error } = await db.from("tasks").update({ status: "done" }).eq("id", taskId);
  if (error) throw error;

  await publish(db, {
    type: "task.completed",
    household_id: householdId,
    actor_id: actorId,
    payload: { taskId },
  });

  // Ponavljajuci zadatak -> napravi sljedecu pojavu
  if (task?.recurring && task.due_at) {
    await createTask(db, {
      householdId,
      ownerId: task.owner_id,
      title: task.title,
      dueAt: nextDue(task.due_at, task.recurring),
      assigneeId: task.assignee_id,
      board: task.board,
      priority: task.priority,
      tags: task.tags ?? [],
      recurring: task.recurring,
      parentId: task.parent_id,
    });
  }
}

export async function reopenTask(db: SupabaseClient, taskId: string) {
  await db.from("tasks").update({ status: "todo" }).eq("id", taskId);
}

// Javna akcija: postavi status zadatka ('todo' | 'doing' | 'done').
// Kanban je koristi za pomjeranje kartica izmedju kolona umjesto da sam
// pise u tabelu ("build on what exists"). Za 'done' se preporucuje
// completeTask (zbog ponavljanja + eventa); ovo je za 'todo'/'doing'.
export async function setTaskStatus(
  db: SupabaseClient,
  taskId: string,
  status: "todo" | "doing" | "done"
) {
  const { error } = await db.from("tasks").update({ status }).eq("id", taskId);
  if (error) throw error;
}
