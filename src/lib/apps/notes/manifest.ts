import type { AppManifest } from "@/lib/platform/types";

// Notes app: bilješke s tagovima + dnevnik + povezivanje na druge objekte.
// Koristi zajedničku `links` tabelu (connected web) i objavljuje "note.created".
export const notesApp: AppManifest = {
  id: "notes",
  name: "Bilješke",
  route: "/notes",
  publishes: ["note.created"],
  requiredAccess: ["read:notes", "create:notes", "create:links"],

  commands: [{ id: "notes.new", label: "Nova bilješka", run: "/notes?new=1" }],

  dashboardCards: [
    {
      title: "Nedavne bilješke",
      load: async ({ db, householdId }) => {
        const { data } = await db
          .from("notes")
          .select("id, title, body, created_at")
          .eq("household_id", householdId)
          .order("created_at", { ascending: false })
          .limit(4);
        return (data ?? []).map((n) => ({
          id: n.id,
          label: n.title || (n.body ? n.body.slice(0, 40) : "Bilješka"),
          meta: new Date(n.created_at).toLocaleDateString("bs", { day: "2-digit", month: "2-digit" }),
          href: "/notes",
        }));
      },
    },
  ],

  search: async (query, { db, householdId }) => {
    const { data } = await db
      .from("notes")
      .select("id, title, body")
      .eq("household_id", householdId)
      .or(`title.ilike.%${query}%,body.ilike.%${query}%`)
      .limit(5);
    return (data ?? []).map((n) => ({
      id: n.id,
      type: "Bilješka",
      label: n.title || (n.body ? n.body.slice(0, 40) : "Bilješka"),
      href: "/notes",
    }));
  },
};
