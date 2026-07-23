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
      title: "Zadaci — danas i zakasnjeli",
      load: async ({ db, householdId }) => {
        const now = new Date().toISOString();
        const { data } = await db
          .from("tasks")
          .select("id, title, due_at, status")
          .eq("household_id", householdId)
          .neq("status", "done")
          .not("due_at", "is", null)
          .lte("due_at", now)
          .order("due_at", { ascending: true })
          .limit(6);
        return (data ?? []).map((t) => ({
          id: t.id,
          label: t.title,
          meta: t.due_at ? new Date(t.due_at).toLocaleDateString("bs") : undefined,
          href: "/tasks",
        }));
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
