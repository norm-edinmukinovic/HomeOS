import type { AppManifest } from "@/lib/platform/types";

// =====================================================================
// KANBAN — 10. app. Dokaz proširivosti: NE pravi vlastiti model zadataka,
// nego koristi postojeću `tasks` tabelu (kolone `status` i `board` već
// postoje). Instalira se samo dodavanjem u apps/index.ts.
// =====================================================================
export const kanbanApp: AppManifest = {
  id: "kanban",
  name: "Kanban",
  route: "/kanban",
  publishes: ["task.moved"],
  requiredAccess: ["read:tasks", "update:tasks"],

  commands: [{ id: "kanban.open", label: "Otvori Kanban ploču", run: "/kanban" }],

  // Doprinos zajedničkom dashboardu ("Danas"): šta je trenutno u toku.
  dashboardCards: [
    {
      title: "U toku",
      load: async ({ db, householdId }) => {
        const { data } = await db
          .from("tasks")
          .select("id, title, board, updated_at")
          .eq("household_id", householdId)
          .eq("status", "doing")
          .order("updated_at", { ascending: false })
          .limit(6);
        return (data ?? []).map((t) => ({
          id: t.id,
          label: t.title,
          meta: t.board ?? "Opšte",
          href: "/kanban",
        }));
      },
    },
  ],

  // Pretraga: pronađi ploče čiji naziv odgovara upitu.
  search: async (query, { db, householdId }) => {
    const { data } = await db
      .from("tasks")
      .select("board")
      .eq("household_id", householdId)
      .not("board", "is", null)
      .ilike("board", `%${query}%`)
      .limit(20);
    const seen = new Set<string>();
    const results: { id: string; type: string; label: string; href: string }[] = [];
    for (const row of data ?? []) {
      const b = row.board as string | null;
      if (b && !seen.has(b)) {
        seen.add(b);
        results.push({ id: `board-${b}`, type: "Ploča", label: b, href: "/kanban" });
      }
    }
    return results.slice(0, 5);
  },
};
