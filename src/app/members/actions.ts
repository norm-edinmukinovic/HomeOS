"use server";
import { getContext } from "@/lib/session";
import { sendRawEmail } from "@/lib/email/send";
import { InviteEmail } from "@/lib/email/templates/InviteEmail";
import { revalidatePath } from "next/cache";

export async function inviteMember(email: string): Promise<{ error?: string; ok?: boolean; note?: string }> {
  const e = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { error: "Unesi ispravan e-mail." };

  const { db, user, householdId, displayName } = await getContext();
  if (!user || !householdId) return { error: "Nisi prijavljen." };

  // Da li je taj e-mail vec pozvan u ovo domacinstvo?
  const { data: existingInvite } = await db
    .from("invites").select("id").eq("household_id", householdId).ilike("email", e).maybeSingle();
  if (existingInvite) return { error: "Taj e-mail je već pozvan." };

  const { error } = await db.from("invites").insert({
    household_id: householdId, email: e, invited_by: user.id,
  });
  if (error) return { error: "Greška pri slanju poziva." };

  // Posalji stvarni e-mail poziv (best-effort — poziv je vec zabiljezen).
  try {
    const { data: h } = await db.from("households").select("name").eq("id", householdId).maybeSingle();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    await sendRawEmail({
      to: e,
      subject: `${displayName} te poziva u domaćinstvo na Home OS`,
      react: InviteEmail({
        inviter: displayName,
        household: h?.name ?? "domaćinstvo",
        url: `${appUrl}/register`,
      }),
    });
  } catch (err) {
    console.error("[invite] mail nije poslan:", err);
  }

  revalidatePath("/members");
  return { ok: true };
}

export async function cancelInvite(id: string) {
  const { db, user } = await getContext();
  if (!user) return;
  await db.from("invites").delete().eq("id", id);
  revalidatePath("/members");
}

export async function removeMember(userId: string) {
  const { db, user, householdId } = await getContext();
  if (!user || !householdId) return;
  // Samo admin moze uklanjati, i ne moze sebe.
  const { data: me } = await db.from("household_members")
    .select("role").eq("household_id", householdId).eq("user_id", user.id).maybeSingle();
  if (me?.role !== "admin" || userId === user.id) return;
  await db.from("household_members").delete()
    .eq("household_id", householdId).eq("user_id", userId);
  revalidatePath("/members");
}
