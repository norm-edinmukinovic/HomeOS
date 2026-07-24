import type { AppManifest } from "@/lib/platform/types";

// Life admin: kućni zapisi (dokumenti, garancije, obnove, kontakti) +
// dijeljene liste. Rokovi obnove automatski kreiraju podsjetnik (vidi
// actions.ts) — app koristi POSTOJEĆU sposobnost podsjetnika, ne svoju.
export const lifeAdminApp: AppManifest = {
  id: "life-admin",
  name: "Kućni ured",
  route: "/life-admin",
  publishes: ["life.record.created"],
  requiredAccess: ["read:life_records", "create:life_records", "create:reminders", "create:links"],

  commands: [{ id: "life.new", label: "Novi kućni zapis", run: "/life-admin?new=1" }],

  dashboardCards: [
    {
      title: "Uskoro ističe",
      load: async ({ db, householdId }) => {
        const in30 = new Date(Date.now() + 30 * 864e5).toISOString();
        const { data } = await db
          .from("life_records")
          .select("id, title, kind, expiry_at")
          .eq("household_id", householdId)
          .not("expiry_at", "is", null)
          .lte("expiry_at", in30)
          .order("expiry_at", { ascending: true })
          .limit(6);
        const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
        return (data ?? []).map((r) => {
          const overdue = r.expiry_at ? new Date(r.expiry_at) < startToday : false;
          return {
            id: r.id,
            label: r.title,
            meta: r.expiry_at ? (overdue ? "isteklo" : new Date(r.expiry_at).toLocaleDateString("bs")) : undefined,
            tone: overdue ? ("overdue" as const) : ("normal" as const),
            href: "/life-admin",
          };
        });
      },
    },
  ],

  search: async (query, { db, householdId }) => {
    const { data } = await db
      .from("life_records")
      .select("id, title")
      .eq("household_id", householdId)
      .ilike("title", `%${query}%`)
      .limit(5);
    return (data ?? []).map((r) => ({ id: r.id, type: "Kućni zapis", label: r.title, href: "/life-admin" }));
  },
};
