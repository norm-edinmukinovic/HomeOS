"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function setUsername(username: string): Promise<{ error?: string }> {
  const u = username.trim();
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(u)) {
    return { error: "3–20 znakova: slova, brojevi ili _." };
  }
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: pErr } = await supabase.from("profiles").insert({ id: user!.id, username: u });
  if (pErr) {
    if ((pErr as any).code === "23505" || /duplicate|unique/i.test(pErr.message)) {
      return { error: "To korisničko ime je zauzeto." };
    }
    return { error: "Greška pri spremanju. Pokušaj ponovo." };
  }
  await supabase.auth.updateUser({ data: { username: u } });
  redirect("/");
}
