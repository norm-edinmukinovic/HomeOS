import type { AppManifest } from "@/lib/platform/types";

export const calendarApp: AppManifest = {
  id: "calendar",
  name: "Kalendar",
  route: "/calendar",
  requiredAccess: ["read:calendar_events", "read:tasks"],
  commands: [{ id: "calendar.new", label: "Novi dogadjaj", run: "/calendar?new=1" }],
  dashboardCards: [
    {
      title: "Danasnji dogadjaji",
      load: async ({ db, householdId }) => {
        const start = new Date(); start.setHours(0, 0, 0, 0);
        const end = new Date(); end.setHours(23, 59, 59, 999);
        const { data } = await db
          .from("calendar_events")
          .select("id, title, starts_at")
          .eq("household_id", householdId)
          .gte("starts_at", start.toISOString())
          .lte("starts_at", end.toISOString())
          .order("starts_at", { ascending: true })
          .limit(6);
        return (data ?? []).map((ev) => ({
          id: ev.id,
          label: ev.title,
          meta: new Date(ev.starts_at).toLocaleTimeString("bs", { hour: "2-digit", minute: "2-digit", hour12: false }),
          href: "/calendar",
        }));
      },
    },
  ],
  search: async (query, { db, householdId }) => {
    const { data } = await db.from("calendar_events").select("id, title")
      .eq("household_id", householdId).ilike("title", `%${query}%`).limit(5);
    return (data ?? []).map((e) => ({ id: e.id, type: "Dogadjaj", label: e.title, href: "/calendar" }));
  },
};
