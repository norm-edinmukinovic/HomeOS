import type { AppManifest } from "@/lib/platform/types";

export const tasksApp: AppManifest = {
  id: "tasks",
  name: "Zadaci",
  route: "/tasks",
  publishes: ["task.created", "task.completed"],
  requiredAccess: ["read:tasks", "create:tasks"],

  commands: [{ id: "tasks.new", label: "Novi zadatak", run: "/tasks?new=1" }],

  dashboardCards: [
    {
      title: "Zadaci za danas",
      load: async ({ db, householdId }) => {
        const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
        const endToday = new Date(); endToday.setHours(23, 59, 59, 999);
        const { data } = await db
          .from("tasks")
          .select("id, title, due_at, status")
          .eq("household_id", householdId)
          .neq("status", "done")
          .not("due_at", "is", null)
          .lte("due_at", endToday.toISOString())
          .order("due_at", { ascending: true })
          .limit(8);
        return (data ?? []).map((t) => {
          const overdue = new Date(t.due_at) < startToday;
          return {
            id: t.id,
            label: t.title,
            meta: overdue ? "zakasnilo" : "danas",
            tone: overdue ? ("overdue" as const) : ("normal" as const),
            href: "/tasks",
          };
        });
      },
    },
  ],

  search: async (query, { db, householdId }) => {
    const { data } = await db
      .from("tasks")
      .select("id, title")
      .eq("household_id", householdId)
      .ilike("title", `%${query}%`)
      .limit(5);
    return (data ?? []).map((t) => ({
      id: t.id, type: "Zadatak", label: t.title, href: "/tasks",
    }));
  },
};
