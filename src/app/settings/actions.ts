"use server";
import { getContext } from "@/lib/session";
import { revalidatePath } from "next/cache";

function refreshAll() {
  revalidatePath("/settings");
  revalidatePath("/", "layout"); // navigacija se računa u layoutu
}

async function isAdmin(db: any, householdId: string, userId: string) {
  const { data } = await db
    .from("household_members")
    .select("role")
    .eq("household_id", householdId)
    .eq("user_id", userId)
    .maybeSingle();
  return data?.role === "admin";
}

// --- Korisnik sam sebi skriva/prikazuje app ---
export async function toggleHidden(appId: string, currentlyHidden: boolean) {
  const { db, user } = await getContext();
  if (!user) return;
  if (currentlyHidden) {
    await db.from("app_hidden").delete().eq("user_id", user.id).eq("app_id", appId);
  } else {
    await db.from("app_hidden").insert({ user_id: user.id, app_id: appId });
  }
  refreshAll();
}

// --- Admin: app dostupan/nedostupan cijelom domaćinstvu ---
export async function toggleAvailability(appId: string, currentlyAvailable: boolean) {
  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return;
  if (!(await isAdmin(db, householdId, user.id))) return;
  await db.from("app_availability").upsert(
    { household_id: householdId, app_id: appId, available: !currentlyAvailable },
    { onConflict: "household_id,app_id" }
  );
  refreshAll();
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[čć]/g, "c").replace(/[š]/g, "s").replace(/[ž]/g, "z").replace(/[đ]/g, "d")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "app";
}

// --- Korisnik kreira novu aplikaciju (opis + veze s postojećim app-ovima) ---
export async function createCustomApp(input: {
  name: string;
  description?: string;
  itemNoun?: string;
  connectTask?: boolean;
  connectCalendar?: boolean;
  connectReminder?: boolean;
}): Promise<{ error?: string; slug?: string }> {
  const name = input.name.trim();
  if (!name) return { error: "Upiši naziv aplikacije." };

  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return { error: "Nisi prijavljen." };

  let slug = slugify(name);
  // Osiguraj jedinstvenost sluga u domaćinstvu.
  const { data: existing } = await db
    .from("custom_apps").select("slug").eq("household_id", householdId).like("slug", `${slug}%`);
  if (existing?.some((e: any) => e.slug === slug)) slug = `${slug}-${(existing.length + 1)}`;

  const { error } = await db.from("custom_apps").insert({
    household_id: householdId,
    slug,
    name,
    description: input.description?.trim() || null,
    item_noun: input.itemNoun?.trim() || "stavka",
    connect_task: !!input.connectTask,
    connect_calendar: !!input.connectCalendar,
    connect_reminder: !!input.connectReminder,
    created_by: user.id,
  });
  if (error) return { error: "Greška pri kreiranju aplikacije." };

  refreshAll();
  return { slug };
}

export async function deleteCustomApp(id: string) {
  const { db, user } = await getContext();
  if (!user) return;
  await db.from("custom_apps").delete().eq("id", id);
  refreshAll();
}
