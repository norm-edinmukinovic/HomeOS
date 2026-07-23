import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Vrati prijavljenog korisnika + njegovo (prvo) domacinstvo.
export async function getContext() {
  const db = createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { db, user: null, householdId: null as string | null, username: "", displayName: "" };

  const username = (user.user_metadata?.username as string | undefined) ?? "";
  const fallbackName = username || user.email?.split("@")[0] || "Član";

  let { data: membership } = await db
    .from("household_members")
    .select("household_id, display_name")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    const admin = createAdminClient();

    // 1) Je li ovaj e-mail pozvan u neko domacinstvo? -> pridruzi se.
    const { data: invite } = await admin
      .from("invites")
      .select("id, household_id")
      .ilike("email", user.email ?? "")
      .limit(1)
      .maybeSingle();

    if (invite) {
      await admin.from("household_members").insert({
        household_id: invite.household_id, user_id: user.id, role: "member", display_name: fallbackName,
      });
      // Potrosi sve pozive za ovaj e-mail
      await admin.from("invites").delete().ilike("email", user.email ?? "");
      membership = { household_id: invite.household_id, display_name: fallbackName };
    } else {
      // 2) Inace napravi vlastito domacinstvo (postaje admin).
      const { data: h } = await db
        .from("households")
        .insert({ name: "Moje domaćinstvo", created_by: user.id })
        .select("id")
        .single();
      if (h) {
        await db.from("household_members").insert({
          household_id: h.id, user_id: user.id, role: "admin", display_name: fallbackName,
        });
        membership = { household_id: h.id, display_name: fallbackName };
      }
    }
  }

  return {
    db,
    user,
    householdId: membership?.household_id ?? null,
    username,
    displayName: username || membership?.display_name || fallbackName,
  };
}
