"use server";
import { getContext } from "@/lib/session";
import { revalidatePath } from "next/cache";

export interface AddEventInput {
  title: string;
  start: string;                 // datetime-local (npr. "2026-07-24T18:30")
  end?: string;
  location?: string;
  visibility?: "private" | "household";
}

function refresh() {
  revalidatePath("/calendar");
  revalidatePath("/");
}

export async function addEvent(input: AddEventInput): Promise<{ error?: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Upiši naziv događaja." };
  if (!input.start) return { error: "Odaberi datum i vrijeme." };

  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return { error: "Nisi prijavljen." };

  const startsIso = new Date(input.start).toISOString();
  const endsIso = input.end ? new Date(input.end).toISOString() : null;
  if (endsIso && new Date(endsIso).getTime() < new Date(startsIso).getTime()) {
    return { error: "Kraj je prije početka." };
  }

  const { error } = await db.from("calendar_events").insert({
    household_id: householdId,
    owner_id: user.id,
    visibility: input.visibility === "private" ? "private" : "household",
    title,
    starts_at: startsIso,
    ends_at: endsIso,
    location: input.location?.trim() || null,
  });
  if (error) return { error: "Greška pri spremanju." };

  refresh();
  return {};
}

export async function deleteEvent(id: string): Promise<{ error?: string }> {
  const { db, user } = await getContext();
  if (!user) return { error: "Nisi prijavljen." };
  // RLS dopušta brisanje vlasniku ili adminu domaćinstva.
  const { error } = await db.from("calendar_events").delete().eq("id", id);
  if (error) return { error: "Greška pri brisanju." };
  refresh();
  return {};
}
