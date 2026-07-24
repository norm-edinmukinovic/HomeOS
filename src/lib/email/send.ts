import { render } from "@react-email/render";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReactElement } from "react";

const FROM = process.env.EMAIL_FROM ?? "Home OS <noreply@example.com>";

// ---------------------------------------------------------------------
//  Slanje e-maila. Primarno preko BREVO transakcijskog API-ja — njime se
//  bez problema šalje STVARNIM primaocima (za testiranje na druge ljude).
//
//  Podešavanje (env):
//    BREVO_API_KEY  — Brevo → SMTP & API → API Keys (v3)
//    EMAIL_FROM     — "Ime <adresa>"; adresa mora biti verifikovan
//                     pošiljalac u Brevo (Senders & IP → Senders).
//
//  Ako nema BREVO_API_KEY, a ima RESEND_API_KEY, koristi se Resend kao
//  rezerva. Ako nema ničega, slanje se preskače (samo log).
// ---------------------------------------------------------------------

function parseFrom(s: string): { name: string; email: string } {
  const m = s.match(/^\s*(.*?)\s*<\s*([^>]+)\s*>\s*$/);
  if (m) return { name: m[1] || "Home OS", email: m[2].trim() };
  return { name: "Home OS", email: s.trim() };
}

async function deliver(to: string, subject: string, react: ReactElement) {
  const html = await render(react);
  const text = await render(react, { plainText: true });

  if (process.env.BREVO_API_KEY) {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: parseFrom(FROM),
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("[email] Brevo greška:", res.status, detail);
      return { via: "brevo" as const, error: detail };
    }
    const data = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { via: "brevo" as const, id: data.messageId };
  }

  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, react });
    if (error) return { via: "resend" as const, error };
    return { via: "resend" as const, id: data?.id };
  }

  console.warn("[email] BREVO_API_KEY nije postavljen — preskačem slanje");
  return { skipped: true as const, reason: "nema transporta" };
}

interface SendArgs {
  db: SupabaseClient;   // admin klijent (cron) ili server klijent
  userId: string;       // kome saljemo (za provjeru postavki)
  to: string;
  category: string;     // "reminder" | "task_assigned" | "bill_due" | "digest"
  subject: string;
  react: ReactElement;
}

// Centralna tacka za notifikacije — SVAKI mail prolazi ovuda, pa je provjera
// korisnikovih postavki (koje kategorije prima) na jednom mjestu.
export async function sendEmail(args: SendArgs) {
  const { db, userId, to, category, subject, react } = args;

  const { data: optout } = await db
    .from("notification_optouts")
    .select("category")
    .eq("user_id", userId)
    .eq("category", category)
    .maybeSingle();
  if (optout) return { skipped: true as const, reason: "korisnik iskljucio kategoriju" };

  try {
    return await deliver(to, subject, react);
  } catch (e) {
    console.error("[email] slanje nije uspjelo:", e);
    return { skipped: false as const, error: e };
  }
}

// Transakcijski mail (npr. pozivnica) — bez provjere postavki.
export async function sendRawEmail(args: { to: string; subject: string; react: ReactElement }) {
  try {
    return await deliver(args.to, args.subject, args.react);
  } catch (e) {
    console.error("[email] transakcijski mail nije uspio:", e);
    return { skipped: false as const, error: e };
  }
}
