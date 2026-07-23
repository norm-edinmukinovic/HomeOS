import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/session";
import { installApps } from "@/lib/apps";
import { createBill } from "@/lib/apps/finance/actions";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const { db, user, householdId } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema…</p>;

  const { data: bills } = await db
    .from("bills")
    .select("id, title, amount, due_at, paid_at")
    .eq("household_id", householdId)
    .order("due_at", { ascending: true });

  async function addBill(formData: FormData) {
    "use server";
    installApps(); // da subscribers (bill.created -> task) budu registrovani
    const { db, user, householdId } = await getContext();
    if (!user || !householdId) return;
    await createBill(db, {
      householdId,
      ownerId: user.id,
      title: String(formData.get("title")),
      amount: Number(formData.get("amount") || 0),
      dueAt: formData.get("due") ? new Date(String(formData.get("due"))).toISOString() : null,
    });
    revalidatePath("/finance");
    revalidatePath("/tasks");
    revalidatePath("/");
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-1">Finansije</h1>
      <p className="text-muted text-sm mb-6">
        Dodavanjem računa automatski nastaje povezani zadatak „Plati…“ (connected web).
      </p>

      <form action={addBill} className="rounded-xl border border-line bg-white p-4 mb-8 grid gap-3 sm:grid-cols-[1fr_120px_160px_auto]">
        <input name="title" required placeholder="npr. Struja"
          className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent" />
        <input name="amount" type="number" step="0.01" placeholder="Iznos"
          className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent" />
        <input name="due" type="date"
          className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-accent" />
        <button className="rounded-lg bg-accent text-white text-sm px-4 py-2">Dodaj račun</button>
      </form>

      <ul className="rounded-xl border border-line bg-white divide-y divide-line">
        {(bills ?? []).length === 0 && (
          <li className="px-4 py-6 text-sm text-muted text-center">Još nema računa.</li>
        )}
        {(bills ?? []).map((b) => (
          <li key={b.id} className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm">{b.title}</span>
            <span className="text-sm text-muted">
              {Number(b.amount).toFixed(2)} KM
              {b.due_at ? ` · ${new Date(b.due_at).toLocaleDateString("bs")}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
