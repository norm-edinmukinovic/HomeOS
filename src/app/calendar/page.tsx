import { redirect } from "next/navigation";
import { getContext } from "@/lib/session";
import CalendarView from "@/components/CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const { db, user, householdId } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema…</p>;

  // Dovoljno širok prozor za slobodnu navigaciju kroz mjesece/sedmice.
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 18, 1);

  // RLS (can_see) vraća samo ono što korisnik smije vidjeti: vlastito privatno
  // + cijelo domaćinstvo + eksplicitno dijeljeno s njim. Tako su svi dijeljeni
  // događaji automatski u istom pogledu.
  const { data: events } = await db
    .from("calendar_events")
    .select("id, title, starts_at, ends_at, location, owner_id, visibility")
    .eq("household_id", householdId)
    .gte("starts_at", from.toISOString())
    .lte("starts_at", to.toISOString())
    .order("starts_at", { ascending: true });

  // Zadaci s rokom -> automatski se prikazuju na kalendaru na datum roka.
  const { data: tasks } = await db
    .from("tasks")
    .select("id, title, due_at, status, priority, assignee_id")
    .eq("household_id", householdId)
    .not("due_at", "is", null)
    .gte("due_at", from.toISOString())
    .lte("due_at", to.toISOString())
    .order("due_at", { ascending: true });

  return <CalendarView currentUserId={user.id} events={events ?? []} tasks={tasks ?? []} />;
}
