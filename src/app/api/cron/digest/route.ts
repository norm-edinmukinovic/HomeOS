import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { DigestEmail } from "@/lib/email/templates/DigestEmail";

export const dynamic = "force-dynamic";

// Dnevni sazetak: "optional daily digest summarizing what's coming up".
// Za svakog clana skupi sta danas dolazi (racuni + zadaci) i posalje jedan mail.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "nedozvoljeno" }, { status: 401 });
  }

  const db = createAdminClient();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);

  const { data: members } = await db
    .from("household_members")
    .select("user_id, household_id, display_name");

  let sent = 0;
  for (const m of members ?? []) {
    const [{ data: bills }, { data: tasks }] = await Promise.all([
      db.from("bills").select("title, amount")
        .eq("household_id", m.household_id).is("paid_at", null)
        .gte("due_at", start.toISOString()).lte("due_at", end.toISOString()),
      db.from("tasks").select("title")
        .eq("household_id", m.household_id).neq("status", "done")
        .gte("due_at", start.toISOString()).lte("due_at", end.toISOString()),
    ]);

    const items = [
      ...(bills ?? []).map((b) => `Račun: ${b.title} (${Number(b.amount).toFixed(2)} KM)`),
      ...(tasks ?? []).map((t) => `Zadatak: ${t.title}`),
    ];

    const { data: u } = await db.auth.admin.getUserById(m.user_id);
    const email = u.user?.email;
    if (!email) continue;

    const res = await sendEmail({
      db, userId: m.user_id, to: email, category: "digest",
      subject: "Home OS — što danas dolazi",
      react: DigestEmail({ name: m.display_name ?? email.split("@")[0], items }),
    });
    if (!res.skipped) sent++;
  }

  return NextResponse.json({ ok: true, emailed: sent });
}
