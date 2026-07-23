import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { installApps } from "@/lib/apps";
import { publish } from "@/lib/platform/events";
import { sendEmail } from "@/lib/email/send";
import { ReminderEmail } from "@/lib/email/templates/ReminderEmail";

export const dynamic = "force-dynamic";

// Poziva ga Vercel Cron (vidi vercel.json). Ovo je serverless zamjena za
// stalni red poslova: probudi se, nadje dospjele podsjetnike, posalje mail.
export async function GET(req: Request) {
  // Zastita: samo Vercel Cron (ili neko s tajnim tokenom) smije pozvati.
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "nedozvoljeno" }, { status: 401 });
  }

  installApps();
  const db = createAdminClient();
  const now = new Date().toISOString();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const { data: due } = await db
    .from("reminders")
    .select("id, household_id, title, target_id, recurring, fire_at")
    .eq("fired", false)
    .lte("fire_at", now)
    .limit(100);

  let sent = 0;
  for (const r of due ?? []) {
    // Objavi dogadjaj — druge app-ove/automatizacije ovime obavjestavamo.
    await publish(db, {
      type: "reminder.fired",
      household_id: r.household_id,
      actor_id: r.target_id,
      payload: { reminderId: r.id, title: r.title },
    });

    // Posalji mail primaocu (ako ga ima i ako nije iskljucio kategoriju).
    if (r.target_id) {
      const { data: u } = await db.auth.admin.getUserById(r.target_id);
      const email = u.user?.email;
      const name = email?.split("@")[0] ?? "";
      if (email) {
        const res = await sendEmail({
          db, userId: r.target_id, to: email, category: "reminder",
          subject: `Podsjetnik: ${r.title}`,
          react: ReminderEmail({ name, title: r.title, url: appUrl }),
        });
        if (!res.skipped) sent++;
      }
    }

    // Ponavljajuci -> pomjeri sljedece paljenje; jednokratni -> oznaci gotov.
    if (r.recurring === "daily" || r.recurring === "weekly") {
      const next = new Date(r.fire_at);
      next.setDate(next.getDate() + (r.recurring === "daily" ? 1 : 7));
      await db.from("reminders").update({ fire_at: next.toISOString() }).eq("id", r.id);
    } else {
      await db.from("reminders").update({ fired: true }).eq("id", r.id);
    }
  }

  return NextResponse.json({ ok: true, processed: due?.length ?? 0, emailed: sent });
}
