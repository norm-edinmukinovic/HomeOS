import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/session";
import { installApps } from "@/lib/apps";
import { createTask, completeTask } from "@/lib/apps/tasks/actions";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const { db, user, householdId } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema…</p>;

  const { data: tasks } = await db
    .from("tasks")
    .select("id, title, status, due_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false });

  async function addTask(formData: FormData) {
    "use server";
    installApps();
    const { db, user, householdId } = await getContext();
    if (!user || !householdId) return;
    await createTask(db, {
      householdId, ownerId: user.id,
      title: String(formData.get("title")),
      dueAt: formData.get("due") ? new Date(String(formData.get("due"))).toISOString() : null,
    });
    revalidatePath("/tasks"); revalidatePath("/");
  }

  async function finish(formData: FormData) {
    "use server";
    installApps();
    const { db, user, householdId } = await getContext();
    if (!user || !householdId) return;
    await completeTask(db, householdId, String(formData.get("id")), user.id);
    revalidatePath("/tasks"); revalidatePath("/");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Zadaci</h1>

      <form action={addTask} className="rounded-xl border border-line bg-white p-4 mb-8 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
        <input name="title" required placeholder="Novi zadatak"
          className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent" />
        <input name="due" type="date"
          className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent" />
        <button className="rounded-lg bg-accent text-white text-sm px-4 py-2">Dodaj</button>
      </form>

      <ul className="rounded-xl border border-line bg-white divide-y divide-line">
        {(tasks ?? []).length === 0 && (
          <li className="px-4 py-6 text-sm text-muted text-center">Nema zadataka.</li>
        )}
        {(tasks ?? []).map((t) => (
          <li key={t.id} className="px-4 py-3 flex items-center justify-between">
            <span className={`text-sm ${t.status === "done" ? "line-through text-muted" : ""}`}>
              {t.title}
              {t.due_at && (
                <span className="text-xs text-muted ml-2">
                  {new Date(t.due_at).toLocaleDateString("bs")}
                </span>
              )}
            </span>
            {t.status !== "done" && (
              <form action={finish}>
                <input type="hidden" name="id" value={t.id} />
                <button className="text-xs rounded-full border border-line px-3 py-1 hover:border-accent hover:text-accent">
                  Završi
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
