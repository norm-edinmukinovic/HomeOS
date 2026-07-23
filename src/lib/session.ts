import { createClient } from "@/lib/supabase/server";

// Vrati prijavljenog korisnika + njegovo (prvo) domacinstvo.
// Za studentski projekat drzimo jedno domacinstvo po korisniku radi
// jednostavnosti; model u bazi vec podrzava vise.
export async function getContext() {
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { db, user: null, householdId: null as string | null };

  let { data: membership } = await db
    .from("household_members")
    .select("household_id, display_name")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  // Ako korisnik jos nema domacinstvo, napravi mu jedno (postaje admin).
  if (!membership) {
    const { data: h } = await db
      .from("households")
      .insert({ name: "Moje domacinstvo", created_by: user.id })
      .select("id")
      .single();
    if (h) {
      const name = user.email?.split("@")[0] ?? "Clan";
      await db.from("household_members").insert({
        household_id: h.id, user_id: user.id, role: "admin",
        display_name: name,
      });
      membership = { household_id: h.id, display_name: name };
    }
  }

  return {
    db,
    user,
    householdId: membership?.household_id ?? null,
    displayName: membership?.display_name ?? user.email?.split("@")[0] ?? "",
  };
}
