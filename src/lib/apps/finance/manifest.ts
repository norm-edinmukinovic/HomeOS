import type { AppManifest, PlatformEvent } from "@/lib/platform/types";
import { createTask } from "@/lib/apps/tasks/actions";
import { linkObjects } from "@/lib/platform/events";

// Finance objavljuje "bill.created". Ovdje pokazujemo saradnju:
// kad se racun kreira, koristimo POSTOJECI Tasks app da napravimo
// zadatak "Plati ..." i povezemo ga s racunom (connected web).
async function onBillCreated(e: PlatformEvent, { db }: { db: any }) {
  const p = e.payload as { billId: string; title: string; dueAt: string | null };
  const task = await createTask(db, {
    householdId: e.household_id,
    ownerId: e.actor_id ?? "",
    title: `Plati: ${p.title}`,
    dueAt: p.dueAt,
  });
  await linkObjects(
    db, e.household_id,
    { type: "bill", id: p.billId },
    { type: "task", id: task.id },
    "created"
  );
}

export const financeApp: AppManifest = {
  id: "finance",
  name: "Finansije",
  route: "/finance",
  publishes: ["bill.created"],
  subscribes: { "bill.created": onBillCreated },
  requiredAccess: ["read:bills", "create:bills", "create:tasks"],

  commands: [{ id: "finance.new", label: "Novi racun", run: "/finance?new=1" }],

  dashboardCards: [
    {
      title: "Racuni koji dolaze",
      load: async ({ db, householdId }) => {
        const in10 = new Date(Date.now() + 10 * 864e5).toISOString();
        const { data } = await db
          .from("bills")
          .select("id, title, amount, due_at")
          .eq("household_id", householdId)
          .is("paid_at", null)
          .not("due_at", "is", null)
          .lte("due_at", in10)
          .order("due_at", { ascending: true })
          .limit(6);
        return (data ?? []).map((b) => {
          const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
          const overdue = b.due_at ? new Date(b.due_at) < startToday : false;
          return {
            id: b.id,
            label: `${b.title} — ${Number(b.amount).toFixed(2)} KM`,
            meta: b.due_at ? (overdue ? "zakasnilo" : new Date(b.due_at).toLocaleDateString("bs")) : undefined,
            tone: overdue ? ("overdue" as const) : ("normal" as const),
            href: "/finance",
          };
        });
      },
    },
  ],

  search: async (query, { db, householdId }) => {
    const { data } = await db
      .from("bills").select("id, title")
      .eq("household_id", householdId)
      .ilike("title", `%${query}%`).limit(5);
    return (data ?? []).map((b) => ({ id: b.id, type: "Racun", label: b.title, href: "/finance" }));
  },
};
