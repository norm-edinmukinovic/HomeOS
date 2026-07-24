"use server";
import { getContext } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { publish, linkObjects } from "@/lib/platform/events";
import { createReminder } from "@/lib/apps/reminders/actions";

function refresh() {
  revalidatePath("/life-admin");
  revalidatePath("/reminders");
  revalidatePath("/");
}

export interface AddRecordInput {
  kind: string;                  // document | warranty | renewal | contact | other
  title: string;
  provider?: string;
  reference?: string;
  notes?: string;
  expiry?: string;               // date (YYYY-MM-DD)
  visibility?: "private" | "household";
}

export async function addRecord(input: AddRecordInput): Promise<{ error?: string }> {
  const title = input.title.trim();
  if (!title) return { error: "Upiši naziv zapisa." };

  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return { error: "Nisi prijavljen." };

  const expiryIso = input.expiry ? new Date(input.expiry + "T09:00").toISOString() : null;

  const { data, error } = await db
    .from("life_records")
    .insert({
      household_id: householdId,
      owner_id: user.id,
      visibility: input.visibility === "private" ? "private" : "household",
      kind: input.kind || "document",
      title,
      provider: input.provider?.trim() || null,
      reference: input.reference?.trim() || null,
      notes: input.notes?.trim() || null,
      expiry_at: expiryIso,
    })
    .select("id, title, expiry_at")
    .single();
  if (error || !data) return { error: "Greška pri spremanju." };

  // Ima rok? Automatski zakaži podsjetnik 7 dana ranije — koristi
  // ZAJEDNIČKU sposobnost platforme (reminders), ne gradi svoju.
  if (expiryIso) {
    const fire = new Date(new Date(expiryIso).getTime() - 7 * 86400000);
    const fireAt = (fire.getTime() > Date.now() ? fire : new Date()).toISOString();
    try {
      const rem = await createReminder(db, {
        householdId,
        ownerId: user.id,
        title: `Obnova: ${title}`,
        fireAt,
        targetId: user.id,
      });
      // Poveži zapis i podsjetnik u connected web.
      await linkObjects(
        db, householdId,
        { type: "life_record", id: data.id },
        { type: "reminder", id: rem.id },
        "renewal"
      );
    } catch (e) {
      // Ako Reminders app nije prisutan/dostupan, zapis se svejedno spremi
      // (graceful degradation iz zadatka).
      console.error("[life-admin] podsjetnik nije kreiran:", e);
    }
  }

  await publish(db, {
    type: "life.record.created",
    household_id: householdId,
    actor_id: user.id,
    payload: { recordId: data.id, title: data.title, expiryAt: data.expiry_at },
  });

  refresh();
  return {};
}

export async function deleteRecord(id: string) {
  const { db, user } = await getContext();
  if (!user) return;
  await db.from("life_records").delete().eq("id", id);
  refresh();
}

// -------------------- Dijeljene liste (kupovina/kućni popisi) ------------
export async function createList(name: string) {
  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return;
  const clean = name.trim();
  if (!clean) return;
  await db.from("shopping_lists").insert({ household_id: householdId, owner_id: user.id, name: clean });
  refresh();
}

export async function addItem(listId: string, text: string) {
  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return;
  const clean = text.trim();
  if (!clean) return;
  await db.from("shopping_items").insert({ list_id: listId, household_id: householdId, text: clean });
  refresh();
}

export async function toggleItem(id: string, done: boolean) {
  const { db, user } = await getContext();
  if (!user) return;
  await db.from("shopping_items").update({ done: !done }).eq("id", id);
  refresh();
}

export async function deleteList(id: string) {
  const { db, user } = await getContext();
  if (!user) return;
  await db.from("shopping_lists").delete().eq("id", id);
  refresh();
}
