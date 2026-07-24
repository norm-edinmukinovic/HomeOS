import { redirect } from "next/navigation";
import { getContext } from "@/lib/session";
import { KanbanBoard, type KanbanCard } from "@/components/KanbanBoard";
import { LayoutGrid } from "lucide-react";

export const dynamic = "force-dynamic";

const DEFAULT_BOARD = "Opšte";

export default async function KanbanPage() {
  const { db, user, householdId } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema…</p>;

  const [{ data: tasks }, { data: members }] = await Promise.all([
    db
      .from("tasks")
      .select("id, title, status, board, priority, due_at, assignee_id, tags")
      .eq("household_id", householdId)
      .is("parent_id", null) // pod-zadaci se ne prikazuju kao zasebne kartice
      .order("created_at", { ascending: false }),
    db
      .from("household_members")
      .select("user_id, display_name")
      .eq("household_id", householdId),
  ]);

  const memberMap: Record<string, string> = {};
  (members ?? []).forEach((m) => {
    memberMap[m.user_id] = m.display_name ?? "Član";
  });

  const cards: KanbanCard[] = (tasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    status: (["todo", "doing", "done"].includes(t.status) ? t.status : "todo") as KanbanCard["status"],
    board: t.board ?? DEFAULT_BOARD,
    priority: t.priority ?? "normal",
    due_at: t.due_at,
    assignee_id: t.assignee_id,
    tags: t.tags ?? [],
  }));

  // Ploče = distinct board vrijednosti (+ uvijek podrazumijevana "Opšte")
  const boards = Array.from(new Set(cards.map((c) => c.board)));
  if (!boards.includes(DEFAULT_BOARD)) boards.unshift(DEFAULT_BOARD);

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-2.5 mb-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-soft text-indigo">
          <LayoutGrid size={19} strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-semibold">Kanban</h1>
      </div>

      <KanbanBoard
        cards={cards}
        boards={boards}
        memberMap={memberMap}
        defaultBoard={DEFAULT_BOARD}
      />
    </div>
  );
}
