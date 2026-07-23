import { redirect } from "next/navigation";
import { getContext } from "@/lib/session";
import { NewTaskForm } from "@/components/NewTaskForm";
import { TaskItem, type TaskRow } from "@/components/TaskItem";
import { ListChecks } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { db, user, householdId } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema…</p>;

  const [{ data: tasks }, { data: members }] = await Promise.all([
    db.from("tasks")
      .select("id, title, status, due_at, priority, tags, assignee_id, recurring, parent_id")
      .eq("household_id", householdId)
      .order("due_at", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    db.from("household_members")
      .select("user_id, display_name")
      .eq("household_id", householdId),
  ]);

  const memberMap: Record<string, string> = {};
  (members ?? []).forEach((m) => { memberMap[m.user_id] = m.display_name ?? "Član"; });
  const memberList = (members ?? []).map((m) => ({ id: m.user_id, name: m.display_name ?? "Član" }));

  const all = (tasks ?? []) as (TaskRow & { parent_id: string | null })[];
  const subByParent: Record<string, TaskRow[]> = {};
  all.forEach((t) => { if (t.parent_id) (subByParent[t.parent_id] ??= []).push(t); });
  const top = all.filter((t) => !t.parent_id);

  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);
  const endToday = new Date(); endToday.setHours(23, 59, 59, 999);

  const active = top.filter((t) => t.status !== "done");
  const done = top.filter((t) => t.status === "done");

  const overdue = active.filter((t) => t.due_at && new Date(t.due_at) < startToday);
  const today = active.filter((t) => t.due_at && new Date(t.due_at) >= startToday && new Date(t.due_at) <= endToday);
  const upcoming = active.filter((t) => t.due_at && new Date(t.due_at) > endToday);
  const noDate = active.filter((t) => !t.due_at);

  const groups: { title: string; items: TaskRow[]; danger?: boolean }[] = [
    { title: "Zakašnjelo", items: overdue, danger: true },
    { title: "Danas", items: today },
    { title: "Uskoro", items: upcoming },
    { title: "Bez roka", items: noDate },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-2.5 mb-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-soft text-sky">
          <ListChecks size={19} strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-semibold">Zadaci</h1>
      </div>

      <NewTaskForm members={memberList} />

      {groups.length === 0 && done.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line bg-white/60 px-6 py-12 text-center shadow-soft">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-ink font-medium">Nema zadataka.</p>
          <p className="text-muted text-sm mt-1">Dodaj prvi gore — otvori „Više opcija" za prioritet, tagove i ponavljanje.</p>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.title} className="mb-6">
          <h2 className={`text-sm font-medium mb-2 flex items-center gap-2 ${g.danger ? "text-rose" : "text-ink"}`}>
            {g.title}
            <span className={`text-xs px-2 py-0.5 rounded-full ${g.danger ? "bg-rose-soft text-rose" : "bg-sky-soft text-sky"}`}>
              {g.items.length}
            </span>
          </h2>
          <div className="rounded-2xl border border-line bg-white shadow-soft overflow-hidden">
            {g.items.map((t) => (
              <TaskItem key={t.id} task={t} subtasks={subByParent[t.id] ?? []} memberMap={memberMap} />
            ))}
          </div>
        </section>
      ))}

      {done.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium mb-2 text-muted flex items-center gap-2">
            Završeno
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate2-soft text-slate2">{done.length}</span>
          </h2>
          <div className="rounded-2xl border border-line bg-white/70 shadow-soft overflow-hidden opacity-80">
            {done.slice(0, 20).map((t) => (
              <TaskItem key={t.id} task={t} subtasks={subByParent[t.id] ?? []} memberMap={memberMap} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
