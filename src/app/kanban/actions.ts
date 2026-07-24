"use server";
import { getContext } from "@/lib/session";
import { createTask, completeTask, setTaskStatus } from "@/lib/apps/tasks/actions";
import { publish } from "@/lib/platform/events";
import { revalidatePath } from "next/cache";

type Status = "todo" | "doing" | "done";

function refresh() {
  revalidatePath("/kanban");
  revalidatePath("/tasks");
  revalidatePath("/");
}

// Pomjeranje kartice između kolona = promjena statusa zadatka.
// Za 'done' idemo kroz completeTask (čuva ponavljanje + task.completed event),
// inače kroz javnu setTaskStatus. Na kraju objavimo task.moved (event bus).
export async function moveTask(taskId: string, status: Status) {
  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return;

  if (status === "done") {
    await completeTask(db, householdId, taskId, user.id);
  } else {
    await setTaskStatus(db, taskId, status);
  }

  await publish(db, {
    type: "task.moved",
    household_id: householdId,
    actor_id: user.id,
    payload: { taskId, status },
  });

  refresh();
}

// Dodavanje nove kartice na ploču. Koristi postojeći createTask (Tasks app).
// board === null → podrazumijevana ploča ("Opšte").
export async function addCard(input: {
  title: string;
  board: string | null;
  status: Status;
}): Promise<{ error?: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Upiši naziv kartice." };

  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return { error: "Nisi prijavljen." };

  try {
    const created = await createTask(db, {
      householdId,
      ownerId: user.id,
      title,
      board: input.board,
    });
    // createTask uvijek kreira status 'todo'; ako je kartica dodana u drugu
    // kolonu, prebaci je odmah.
    if (input.status !== "todo" && created?.id) {
      await setTaskStatus(db, created.id, input.status);
    }
  } catch {
    return { error: "Greška pri spremanju." };
  }

  refresh();
  return {};
}
