"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, ChevronRight, ChevronDown, Plus, Repeat } from "lucide-react";
import { toggleTask, removeTask, addTask } from "@/app/tasks/actions";

export interface TaskRow {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  priority: string;
  tags: string[];
  assignee_id: string | null;
  recurring: string | null;
}

const priorityDot: Record<string, string> = {
  high: "bg-rose",
  normal: "bg-sky",
  low: "bg-slate2",
};

function initials(name?: string) {
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
}

export function TaskItem({
  task, subtasks, memberMap,
}: { task: TaskRow; subtasks: TaskRow[]; memberMap: Record<string, string> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState("");
  const [, start] = useTransition();

  // Optimisticno stanje: trenutni odziv bez cekanja servera
  const [doneOverride, setDoneOverride] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);

  function isDone(t: TaskRow) {
    return doneOverride[t.id] ?? (t.status === "done");
  }

  function toggle(t: TaskRow) {
    const next = !isDone(t);
    setDoneOverride((p) => ({ ...p, [t.id]: next })); // odmah vizuelno
    start(async () => { await toggleTask(t.id, next); router.refresh(); });
  }
  function del(id: string) {
    setHidden((p) => new Set(p).add(id)); // odmah sakrij
    start(async () => { await removeTask(id); router.refresh(); });
  }
  function addSub() {
    if (!sub.trim()) return;
    const val = sub; setSub("");
    start(async () => { await addTask({ title: val, parentId: task.id }); router.refresh(); });
  }

  const Row = ({ t, child = false }: { t: TaskRow; child?: boolean }) => {
    if (hidden.has(t.id)) return null;
    const tDone = isDone(t);
    const tOverdue = !tDone && t.due_at && new Date(t.due_at) < startToday;
    return (
      <div className={`flex items-center gap-2.5 px-4 py-2.5 ${child ? "pl-11 bg-paper/40" : ""}`}>
        <button
          onClick={() => toggle(t)}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
            tDone ? "bg-mint border-mint text-white" : "border-line hover:border-mint"
          }`}
          aria-label="Označi gotovim"
        >
          {tDone && <Check size={13} strokeWidth={3} />}
        </button>

        {!child && <span className={`h-2 w-2 rounded-full shrink-0 ${priorityDot[t.priority] ?? "bg-slate2"}`} />}

        <span className="flex-1 min-w-0">
          <span className={`text-sm ${tDone ? "line-through text-muted" : tOverdue ? "text-rose" : "text-ink"}`}>
            {t.title}
          </span>
          {(t.tags?.length > 0 || t.recurring) && (
            <span className="ml-2 inline-flex items-center gap-1 align-middle">
              {t.recurring && <Repeat size={12} className="text-lav" />}
              {t.tags?.map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-soft text-sky">#{tag}</span>
              ))}
            </span>
          )}
        </span>

        {t.assignee_id && memberMap[t.assignee_id] && (
          <span title={memberMap[t.assignee_id]} className="flex h-6 w-6 items-center justify-center rounded-full bg-lav-soft text-lav text-[10px] font-medium shrink-0">
            {initials(memberMap[t.assignee_id])}
          </span>
        )}
        {t.due_at && (
          <span className={`text-xs shrink-0 ${tOverdue ? "text-rose font-medium" : "text-muted"}`}>
            {new Date(t.due_at).toLocaleDateString("bs", { day: "2-digit", month: "2-digit" })}
          </span>
        )}
        <button onClick={() => del(t.id)} className="text-muted hover:text-rose shrink-0" aria-label="Obriši">
          <Trash2 size={15} />
        </button>
      </div>
    );
  };

  if (hidden.has(task.id)) return null;

  return (
    <div className="border-b border-line last:border-0">
      <div className="flex items-center">
        <button onClick={() => setOpen((o) => !o)} className="pl-2 text-muted hover:text-ink" aria-label="Pod-zadaci">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <div className="flex-1"><Row t={task} /></div>
      </div>

      {open && (
        <div>
          {subtasks.map((s) => <Row key={s.id} t={s} child />)}
          <div className="flex items-center gap-2 pl-11 pr-4 py-2 bg-paper/40">
            <input
              value={sub}
              onChange={(e) => setSub(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addSub()}
              placeholder="+ pod-zadatak"
              className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-sky bg-white"
            />
            <button onClick={addSub} disabled={!sub.trim()} className="text-sky disabled:opacity-40">
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
