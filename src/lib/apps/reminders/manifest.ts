import type { AppManifest } from "@/lib/platform/types";

export const remindersApp: AppManifest = {
  id: "reminders",
  name: "Podsjetnici",
  route: "/reminders",
  publishes: ["reminder.fired"],
  requiredAccess: ["read:reminders", "create:reminders"],
  commands: [{ id: "reminders.new", label: "Novi podsjetnik", run: "/reminders?new=1" }],
  dashboardCards: [
    {
      title: "Aktivni podsjetnici",
      load: async ({ db, householdId }) => {
        const { data } = await db
          .from("reminders")
          .select("id, title, fire_at")
          .eq("household_id", householdId)
          .eq("fired", false)
          .order("fire_at", { ascending: true })
          .limit(6);
        return (data ?? []).map((r) => ({
          id: r.id,
          label: r.title,
          meta: new Date(r.fire_at).toLocaleString("bs", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
          href: "/reminders",
        }));
      },
    },
  ],
  search: async (query, { db, householdId }) => {
    const { data } = await db.from("reminders").select("id, title")
      .eq("household_id", householdId).ilike("title", `%${query}%`).limit(5);
    return (data ?? []).map((r) => ({ id: r.id, type: "Podsjetnik", label: r.title, href: "/reminders" }));
  },
};
