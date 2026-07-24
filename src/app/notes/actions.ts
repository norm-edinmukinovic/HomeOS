"use server";
import { getContext } from "@/lib/session";
import { publish, linkObjects } from "@/lib/platform/events";
import { revalidatePath } from "next/cache";

function refresh() {
  revalidatePath("/notes");
  revalidatePath("/");
}

export interface AddNoteInput {
  title?: string;
  body: string;
  tags?: string;                 // zarezom odvojeno
  visibility?: "private" | "household";
  linkType?: string;             // 'task' | 'bill' | 'calendar_event' | ""
  linkId?: string;
  journal?: boolean;             // dnevnički zapis (tag "dnevnik")
}

export async function addNote(input: AddNoteInput): Promise<{ error?: string }> {
  const body = (input.body ?? "").trim();
  if (!body) return { error: "Upiši sadržaj bilješke." };

  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return { error: "Nisi prijavljen." };

  const tags = (input.tags ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  if (input.journal && !tags.includes("dnevnik")) tags.push("dnevnik");

  const { data, error } = await db
    .from("notes")
    .insert({
      household_id: householdId,
      owner_id: user.id,
      visibility: input.visibility === "household" ? "household" : "private",
      title: input.title?.trim() || null,
      body,
      tags,
    })
    .select("id")
    .single();
  if (error || !data) return { error: "Greška pri spremanju." };

  // Poveži bilješku s postojećim objektom (connected web).
  if (input.linkType && input.linkId) {
    await linkObjects(
      db, householdId,
      { type: "note", id: data.id },
      { type: input.linkType, id: input.linkId },
      "about"
    );
  }

  // Objavi da drugi app-ovi/automatizacije mogu reagovati.
  await publish(db, {
    type: "note.created",
    household_id: householdId,
    actor_id: user.id,
    payload: { noteId: data.id, tags },
  });

  refresh();
  return {};
}

export async function deleteNote(id: string): Promise<{ error?: string }> {
  const { db, user } = await getContext();
  if (!user) return { error: "Nisi prijavljen." };
  const { error } = await db.from("notes").delete().eq("id", id);
  if (error) return { error: "Greška pri brisanju." };
  refresh();
  return {};
}
