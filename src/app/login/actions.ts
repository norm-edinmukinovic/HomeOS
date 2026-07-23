"use server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

// Prijava preko username-a ILI emaila + lozinke.
// Ako je unos username, server (preko admin klijenta) pronadje pripadajuci
// email, pa se prijava obavi standardnim Supabase email+lozinka tokom.
export async function loginWithIdentifier(
  identifier: string,
  password: string
): Promise<{ error?: string }> {
  const id = identifier.trim();
  if (!id || !password) return { error: "Unesi korisničko ime/e-mail i lozinku." };

  let email = id;

  // Ako nije e-mail, tretiramo kao username i trazimo pripadajuci e-mail.
  if (!id.includes("@")) {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .ilike("username", id)
      .maybeSingle();

    if (!profile) return { error: "Ne postoji nalog s tim korisničkim imenom." };

    const { data: u } = await admin.auth.admin.getUserById(profile.id);
    if (!u.user?.email) return { error: "Nalog nema e-mail." };
    email = u.user.email;
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes("not confirmed")) {
      return { error: "E-mail još nije potvrđen. Provjeri inbox i klikni link." };
    }
    return { error: "Pogrešno korisničko ime/e-mail ili lozinka." };
  }

  redirect("/");
}
