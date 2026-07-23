"use server";
import { getContext } from "@/lib/session";
import { createTask, completeTask, reopenTask } from "@/lib/apps/tasks/actions";
import { revalidatePath } from "next/cache";

function refresh() {
  revalidatePath("/tasks");
  revalidatePath("/");
}

export interface AddTaskInput {
  title: string;
  due?: string;
  priority?: string;
  assigneeId?: string;
  tags?: string;      // zarezom odvojeno
  recurring?: string;
  parentId?: string;
}

export async function addTask(input: AddTaskInput): Promise<{ error?: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Upiši naziv zadatka." };
  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return { error: "Nisi prijavljen." };

  const tags = (input.tags ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    await createTask(db, {
      householdId,
      ownerId: user.id,
      title,
      dueAt: input.due ? new Date(input.due).toISOString() : null,
      priority: input.priority || "normal",
      assigneeId: input.assigneeId || null,
      tags,
      recurring: input.recurring || null,
      parentId: input.parentId || null,
    });
  } catch {
    return { error: "Greška pri spremanju." };
  }
  refresh();
  return {};
}

export async function toggleTask(taskId: string, done: boolean) {
  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return;
  if (done) await completeTask(db, householdId, taskId, user.id);
  else await reopenTask(db, taskId);
  refresh();
}

export async function removeTask(taskId: string) {
  const { db, user } = await getContext();
  if (!user) return;
  await db.from("tasks").delete().eq("id", taskId);
  refresh();
}
