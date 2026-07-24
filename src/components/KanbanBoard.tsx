"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Plus, Repeat, X } from "lucide-react";
import { moveTask, addCard } from "@/app/kanban/actions";

export type Status = "todo" | "doing" | "done";

export interface KanbanCard {
  id: string;
  title: string;
  status: Status;
  board: string;
  priority: string;
  due_at: string | null;
  assignee_id: string | null;
  tags: string[];
}

const COLUMNS: { id: Status; title: string }[] = [
  { id: "todo", title: "Za uraditi" },
  { id: "doing", title: "U toku" },
  { id: "done", title: "Gotovo" },
];

const priorityDot: Record<string, string> = {
  high: "bg-rose",
  normal: "bg-sky",
  low: "bg-slate2",
};

function initials(name?: string) {
  return name ? name.slice(0, 2).toUpperCase() : "?";
}

// ---- Prezentacijska kartica (koristi se i u koloni i u DragOverlay-u) ----
function CardView({
  card,
  memberMap,
  dragging = false,
}: {
  card: KanbanCard;
  memberMap: Record<string, string>;
  dragging?: boolean;
}) {
  const overdue =
    card.status !== "done" && card.due_at && new Date(card.due_at) < new Date(new Date().setHours(0, 0, 0, 0));
  return (
    <div
      className={`rounded-xl border border-line bg-white px-3 py-2.5 shadow-soft ${
        dragging ? "shadow-lift rotate-2" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${priorityDot[card.priority] ?? "bg-slate2"}`} />
        <span className={`flex-1 text-sm ${card.status === "done" ? "text-muted line-through" : "text-ink"}`}>
          {card.title}
        </span>
        {card.assignee_id && memberMap[card.assignee_id] && (
          <span
            title={memberMap[card.assignee_id]}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lav-soft text-[10px] font-medium text-lav"
          >
            {initials(memberMap[card.assignee_id])}
          </span>
        )}
      </div>
      {(card.tags.length > 0 || card.due_at) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1 pl-4">
          {card.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-sky-soft px-1.5 py-0.5 text-[10px] text-sky">
              #{tag}
            </span>
          ))}
          {card.due_at && (
            <span className={`text-[11px] ${overdue ? "font-medium text-rose" : "text-muted"}`}>
              {new Date(card.due_at).toLocaleDateString("bs", { day: "2-digit", month: "2-digit" })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Kartica koja se može prevlačiti ----
function DraggableCard({
  card,
  memberMap,
}: {
  card: KanbanCard;
  memberMap: Record<string, string>;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab touch-manipulation active:cursor-grabbing ${isDragging ? "opacity-40" : ""}`}
    >
      <CardView card={card} memberMap={memberMap} />
    </div>
  );
}

// ---- Kolona (drop zona) ----
function Column({
  id,
  title,
  cards,
  memberMap,
  onAdd,
  adding,
}: {
  id: Status;
  title: string;
  cards: KanbanCard[];
  memberMap: Record<string, string>;
  onAdd: (title: string) => void;
  adding: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");

  function submit() {
    if (!val.trim()) return;
    onAdd(val.trim());
    setVal("");
    setOpen(false);
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[8rem] flex-col rounded-2xl border p-3 transition-colors ${
        isOver ? "border-indigo/40 bg-indigo-soft/40" : "border-line bg-white/60"
      }`}
    >
      <div className="mb-2 flex items-center gap-2 px-1">
        <h2 className="text-sm font-medium text-ink">{title}</h2>
        <span className="rounded-full bg-slate2-soft px-2 py-0.5 text-xs text-slate2">{cards.length}</span>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {cards.map((c) => (
          <DraggableCard key={c.id} card={c} memberMap={memberMap} />
        ))}
        {cards.length === 0 && !open && (
          <p className="px-1 py-4 text-center text-xs text-muted">Prevuci karticu ovdje</p>
        )}
      </div>

      {open ? (
        <div className="mt-2 flex items-center gap-1.5">
          <input
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
              if (e.key === "Escape") { setOpen(false); setVal(""); }
            }}
            placeholder="Naziv kartice…"
            className="flex-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-sm outline-none focus:border-indigo"
          />
          <button onClick={submit} disabled={!val.trim() || adding} className="text-indigo disabled:opacity-40" aria-label="Dodaj">
            <Plus size={18} strokeWidth={2.5} />
          </button>
          <button onClick={() => { setOpen(false); setVal(""); }} className="text-muted hover:text-rose" aria-label="Otkaži">
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="mt-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted transition-colors hover:bg-indigo-soft/60 hover:text-indigo"
        >
          <Plus size={16} /> Dodaj karticu
        </button>
      )}
    </div>
  );
}

// ===================== GLAVNA PLOČA =====================
export function KanbanBoard({
  cards,
  boards,
  memberMap,
  defaultBoard,
}: {
  cards: KanbanCard[];
  boards: string[];
  memberMap: Record<string, string>;
  defaultBoard: string;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();

  // Ploče kreirane u ovoj sesiji koje još nemaju kartica (perzistiraju
  // tek kad dobiju prvu karticu). Spojene s pločama sa servera.
  const [extraBoards, setExtraBoards] = useState<string[]>([]);
  const allBoards = useMemo(() => {
    const set = new Set<string>([defaultBoard, ...boards, ...extraBoards]);
    return Array.from(set);
  }, [boards, extraBoards, defaultBoard]);

  const [activeBoard, setActiveBoard] = useState<string>(defaultBoard);
  const [newBoard, setNewBoard] = useState("");
  const [showNewBoard, setShowNewBoard] = useState(false);

  // Optimistično pomjeranje: card.id -> status (dok server ne potvrdi)
  const [statusOverride, setStatusOverride] = useState<Record<string, Status>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor)
  );

  function statusOf(card: KanbanCard): Status {
    return statusOverride[card.id] ?? card.status;
  }

  const boardCards = cards.filter((c) => c.board === activeBoard);
  const activeCard = activeId ? cards.find((c) => c.id === activeId) ?? null : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overId = e.over?.id;
    if (!overId) return;
    const target = String(overId) as Status;
    if (!["todo", "doing", "done"].includes(target)) return;

    const cardId = String(e.active.id);
    const card = cards.find((c) => c.id === cardId);
    if (!card || statusOf(card) === target) return;

    setStatusOverride((p) => ({ ...p, [cardId]: target })); // odmah vizuelno
    start(async () => {
      await moveTask(cardId, target);
      router.refresh();
    });
  }

  function handleAdd(board: string, status: Status, title: string) {
    // Podrazumijevana ploča se sprema kao null (bez board vrijednosti).
    const boardValue = board === defaultBoard ? null : board;
    start(async () => {
      await addCard({ title, board: boardValue, status });
      router.refresh();
    });
  }

  function createBoard() {
    const name = newBoard.trim();
    if (!name) return;
    if (!allBoards.includes(name)) setExtraBoards((p) => [...p, name]);
    setActiveBoard(name);
    setNewBoard("");
    setShowNewBoard(false);
  }

  return (
    <div>
      {/* Prekidač ploča */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {allBoards.map((b) => (
          <button
            key={b}
            onClick={() => setActiveBoard(b)}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              b === activeBoard
                ? "bg-indigo-soft font-medium text-indigo"
                : "border border-line bg-white text-ink hover:bg-indigo-soft/50"
            }`}
          >
            {b}
          </button>
        ))}

        {showNewBoard ? (
          <span className="inline-flex items-center gap-1.5">
            <input
              autoFocus
              value={newBoard}
              onChange={(e) => setNewBoard(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createBoard();
                if (e.key === "Escape") { setShowNewBoard(false); setNewBoard(""); }
              }}
              placeholder="Naziv ploče…"
              className="w-36 rounded-full border border-line bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo"
            />
            <button onClick={createBoard} disabled={!newBoard.trim()} className="text-indigo disabled:opacity-40" aria-label="Napravi ploču">
              <Plus size={18} strokeWidth={2.5} />
            </button>
          </span>
        ) : (
          <button
            onClick={() => setShowNewBoard(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-muted hover:border-indigo hover:text-indigo"
          >
            <Plus size={15} /> Nova ploča
          </button>
        )}
      </div>

      {/* Kolone */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              memberMap={memberMap}
              cards={boardCards.filter((c) => statusOf(c) === col.id)}
              adding={isPending}
              onAdd={(title) => handleAdd(activeBoard, col.id, title)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeCard ? <CardView card={activeCard} memberMap={memberMap} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
