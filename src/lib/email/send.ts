import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReactElement } from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendArgs {
  db: SupabaseClient;       // admin klijent (cron) ili server klijent
  userId: string;           // kome saljemo (za provjeru postavki)
  to: string;               // email adresa
  category: string;         // "reminder" | "task_assigned" | "bill_due" | "digest"
  subject: string;
  react: ReactElement;
}

// ---------------------------------------------------------------------
//  Centralna tacka za slanje. SVAKI mail prolazi ovuda, pa je provjera
//  postavki na jednom mjestu: "each member controls which they get by email"
//  i "easy to turn any category on or off" iz zadatka.
// ---------------------------------------------------------------------
export async function sendEmail(args: SendArgs) {
  const { db, userId, to, category, subject, react } = args;

  // Je li se korisnik iskljucio iz ove kategorije?
  const { data: optout } = await db
    .from("notification_optouts")
    .select("category")
    .eq("user_id", userId)
    .eq("category", category)
    .maybeSingle();

  if (optout) {
    return { skipped: true as const, reason: "korisnik iskljucio kategoriju" };
  }

  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY nije postavljen — preskacem stvarno slanje");
    return { skipped: true as const, reason: "nema API kljuca" };
  }

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Home OS <onboarding@resend.dev>",
    to,
    subject,
    react,
  });

  if (error) {
    console.error("[email] slanje nije uspjelo:", error);
    return { skipped: false as const, error };
  }
  return { skipped: false as const, id: data?.id };
}

// Transakcijski mail (npr. pozivnica) — nema provjere postavki jer primalac
// nije nuzno korisnik i ovo nije "notifikacija" koju bira da (ne)prima.
export async function sendRawEmail(args: {
  to: string; subject: string; react: ReactElement;
}) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY nije postavljen — preskacem slanje");
    return { skipped: true as const };
  }
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Home OS <onboarding@resend.dev>",
    to: args.to,
    subject: args.subject,
    react: args.react,
  });
  if (error) {
    console.error("[email] transakcijski mail nije uspio:", error);
    return { skipped: false as const, error };
  }
  return { skipped: false as const, id: data?.id };
}
