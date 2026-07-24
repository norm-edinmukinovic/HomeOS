import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getContext } from "@/lib/session";
import { installApps } from "@/lib/apps";
import { createBill, createTransaction, setBudget, markBillPaid } from "@/lib/apps/finance/actions";
import { Wallet, TrendingUp, TrendingDown, Check, CalendarClock, PiggyBank } from "lucide-react";

export const dynamic = "force-dynamic";

const KM = (n: number) => `${Number(n).toFixed(2)} KM`;

export default async function FinancePage() {
  const { db, user, householdId } = await getContext();
  if (!user) redirect("/login");
  if (!householdId) return <p>Priprema…</p>;

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

  const [{ data: bills }, { data: txns }, { data: budgets }, { data: members }] = await Promise.all([
    db.from("bills").select("id, title, amount, due_at, paid_at, paid_by, recurring, category")
      .eq("household_id", householdId).order("due_at", { ascending: true, nullsFirst: false }),
    db.from("transactions").select("id, kind, title, amount, category, occurred_at, owner_id")
      .eq("household_id", householdId).gte("occurred_at", monthStart.toISOString())
      .order("occurred_at", { ascending: false }),
    db.from("budgets").select("id, category, monthly_limit").eq("household_id", householdId)
      .order("category", { ascending: true }),
    db.from("household_members").select("user_id, display_name").eq("household_id", householdId),
  ]);

  const nameOf = (id: string | null) => members?.find((m) => m.user_id === id)?.display_name ?? "—";

  // Mjesečni sažetak
  const income = (txns ?? []).filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = (txns ?? []).filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const net = income - expense;

  // Potrošeno po kategoriji (rashodi ovaj mjesec)
  const spentByCat: Record<string, number> = {};
  for (const t of txns ?? []) if (t.kind === "expense") spentByCat[t.category] = (spentByCat[t.category] ?? 0) + Number(t.amount);

  // Ko je koliko platio računa (who paid / who owes)
  const paidByMember: Record<string, number> = {};
  for (const b of bills ?? []) if (b.paid_by) paidByMember[b.paid_by] = (paidByMember[b.paid_by] ?? 0) + Number(b.amount);
  const unpaidTotal = (bills ?? []).filter((b) => !b.paid_at).reduce((s, b) => s + Number(b.amount), 0);

  const startToday = new Date(); startToday.setHours(0, 0, 0, 0);

  // ---- Server akcije ----
  async function addBill(formData: FormData) {
    "use server";
    installApps();
    const { db, user, householdId } = await getContext();
    if (!user || !householdId) return;
    await createBill(db, {
      householdId, ownerId: user.id,
      title: String(formData.get("title")),
      amount: Number(formData.get("amount") || 0),
      dueAt: formData.get("due") ? new Date(String(formData.get("due"))).toISOString() : null,
      recurring: (formData.get("recurring") as string) || null,
      category: (formData.get("category") as string) || null,
    });
    revalidatePath("/finance"); revalidatePath("/tasks"); revalidatePath("/");
  }
  async function addTxn(formData: FormData) {
    "use server";
    const { db, user, householdId } = await getContext();
    if (!user || !householdId) return;
    await createTransaction(db, {
      householdId, ownerId: user.id,
      kind: (formData.get("kind") as "expense" | "income") || "expense",
      title: String(formData.get("title")),
      amount: Number(formData.get("amount") || 0),
      category: String(formData.get("category") || "Ostalo"),
    });
    revalidatePath("/finance"); revalidatePath("/");
  }
  async function saveBudget(formData: FormData) {
    "use server";
    const { db, householdId } = await getContext();
    if (!householdId) return;
    await setBudget(db, {
      householdId,
      category: String(formData.get("category")),
      monthlyLimit: Number(formData.get("limit") || 0),
    });
    revalidatePath("/finance");
  }
  async function togglePaid(formData: FormData) {
    "use server";
    const { db, user } = await getContext();
    if (!user) return;
    await markBillPaid(db, {
      billId: String(formData.get("id")),
      paidBy: user.id,
      paid: String(formData.get("paid")) !== "true",
    });
    revalidatePath("/finance"); revalidatePath("/");
  }

  return (
    <div className="animate-fade-up">
      <div className="flex items-center gap-2.5 mb-1">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-peach-soft text-peach">
          <Wallet size={19} strokeWidth={2.2} />
        </span>
        <h1 className="text-2xl font-semibold">Finansije</h1>
      </div>
      <p className="text-muted text-sm mb-6">
        Prihodi i rashodi po kategoriji, budžeti, računi i pretplate. Dodavanjem računa nastaje povezani zadatak „Plati…“.
      </p>

      {/* Mjesečni sažetak */}
      <div className="grid gap-3 sm:grid-cols-3 mb-8">
        <div className="rounded-xl border border-line bg-white p-4 shadow-soft">
          <p className="text-xs text-muted flex items-center gap-1.5"><TrendingUp size={14} className="text-accent" /> Prihodi (mjesec)</p>
          <p className="text-xl font-semibold text-accent mt-1">{KM(income)}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-soft">
          <p className="text-xs text-muted flex items-center gap-1.5"><TrendingDown size={14} className="text-warn" /> Rashodi (mjesec)</p>
          <p className="text-xl font-semibold text-warn mt-1">{KM(expense)}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 shadow-soft">
          <p className="text-xs text-muted flex items-center gap-1.5"><PiggyBank size={14} /> Neto</p>
          <p className={`text-xl font-semibold mt-1 ${net >= 0 ? "text-accent" : "text-rose"}`}>{KM(net)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Transakcije */}
        <div>
          <h2 className="text-sm font-medium mb-2">Prihodi i rashodi</h2>
          <form action={addTxn} className="rounded-xl border border-line bg-white p-4 mb-3 grid gap-3 sm:grid-cols-[110px_1fr_110px_130px_auto] shadow-soft">
            <select name="kind" className="rounded-lg border border-line px-2 py-2 text-sm outline-none focus:border-peach">
              <option value="expense">Rashod</option>
              <option value="income">Prihod</option>
            </select>
            <input name="title" required placeholder="Opis" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-peach" />
            <input name="amount" type="number" step="0.01" placeholder="Iznos" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-peach" />
            <input name="category" placeholder="Kategorija" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-peach" />
            <button className="rounded-lg bg-peach text-white text-sm px-3">Dodaj</button>
          </form>
          <ul className="rounded-xl border border-line bg-white divide-y divide-line">
            {(txns ?? []).length === 0 && <li className="px-4 py-6 text-sm text-muted text-center">Nema transakcija ovaj mjesec.</li>}
            {(txns ?? []).map((t) => (
              <li key={t.id} className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm">
                  {t.title} <span className="text-xs text-muted">· {t.category}</span>
                </span>
                <span className={`text-sm font-medium ${t.kind === "income" ? "text-accent" : "text-warn"}`}>
                  {t.kind === "income" ? "+" : "−"}{KM(Number(t.amount))}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Budžeti */}
        <div>
          <h2 className="text-sm font-medium mb-2">Budžeti po kategoriji (mjesečno)</h2>
          <form action={saveBudget} className="rounded-xl border border-line bg-white p-4 mb-3 grid gap-3 grid-cols-[1fr_130px_auto] shadow-soft">
            <input name="category" required placeholder="Kategorija" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-peach" />
            <input name="limit" type="number" step="0.01" required placeholder="Limit" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-peach" />
            <button className="rounded-lg bg-peach text-white text-sm px-3">Postavi</button>
          </form>
          <div className="rounded-xl border border-line bg-white divide-y divide-line">
            {(budgets ?? []).length === 0 && <p className="px-4 py-6 text-sm text-muted text-center">Nema budžeta.</p>}
            {(budgets ?? []).map((b) => {
              const spent = spentByCat[b.category] ?? 0;
              const pct = b.monthly_limit > 0 ? Math.min(100, (spent / Number(b.monthly_limit)) * 100) : 0;
              const over = spent > Number(b.monthly_limit);
              return (
                <div key={b.id} className="px-4 py-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{b.category}</span>
                    <span className={over ? "text-warn font-medium" : "text-muted"}>{KM(spent)} / {KM(Number(b.monthly_limit))}</span>
                  </div>
                  <div className="h-2 rounded-full bg-line overflow-hidden">
                    <div className={`h-full ${over ? "bg-warn" : "bg-peach"}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Računi i pretplate */}
      <div className="mt-8">
        <h2 className="text-sm font-medium mb-2 flex items-center gap-1.5"><CalendarClock size={15} /> Računi i pretplate</h2>
        <form action={addBill} className="rounded-xl border border-line bg-white p-4 mb-3 grid gap-3 sm:grid-cols-[1fr_110px_130px_140px_auto] shadow-soft">
          <input name="title" required placeholder="npr. Struja" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-peach" />
          <input name="amount" type="number" step="0.01" placeholder="Iznos" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-peach" />
          <input name="category" placeholder="Kategorija" className="rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-peach" />
          <div className="flex gap-2">
            <input name="due" type="date" className="w-full rounded-lg border border-line px-2 py-2 text-sm outline-none focus:border-peach" />
          </div>
          <select name="recurring" className="rounded-lg border border-line px-2 py-2 text-sm outline-none focus:border-peach">
            <option value="">Jednokratno</option>
            <option value="monthly">Mjesečno</option>
            <option value="yearly">Godišnje</option>
          </select>
          <button className="rounded-lg bg-peach text-white text-sm px-3 sm:col-span-5 sm:justify-self-end sm:w-auto">Dodaj račun</button>
        </form>
        <ul className="rounded-xl border border-line bg-white divide-y divide-line">
          {(bills ?? []).length === 0 && <li className="px-4 py-6 text-sm text-muted text-center">Još nema računa.</li>}
          {(bills ?? []).map((b) => {
            const overdue = !b.paid_at && b.due_at && new Date(b.due_at) < startToday;
            return (
              <li key={b.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm">
                    {b.title}
                    {b.recurring && <span className="text-xs text-muted"> · {b.recurring === "monthly" ? "mjesečno" : "godišnje"}</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {KM(Number(b.amount))}
                    {b.due_at ? ` · ${new Date(b.due_at).toLocaleDateString("bs")}` : ""}
                    {overdue && <span className="text-warn ml-1">dospjelo</span>}
                    {b.paid_at && <span className="text-accent ml-1">· platio/la {nameOf(b.paid_by)}</span>}
                  </p>
                </div>
                <form action={togglePaid}>
                  <input type="hidden" name="id" value={b.id} />
                  <input type="hidden" name="paid" value={String(!!b.paid_at)} />
                  <button className={`text-xs rounded-lg border px-2.5 py-1 inline-flex items-center gap-1 ${b.paid_at ? "border-accent text-accent bg-accentSoft" : "border-line text-muted hover:bg-peach-soft"}`}>
                    <Check size={13} /> {b.paid_at ? "Plaćeno" : "Označi plaćeno"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>

        {/* Ko je platio / ko duguje */}
        <div className="mt-4 rounded-xl border border-line bg-white p-4 shadow-soft">
          <p className="text-sm font-medium mb-2">Ko je platio · ko duguje</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            {(members ?? []).map((m) => (
              <span key={m.user_id} className="text-muted">
                {m.display_name}: <span className="text-ink">{KM(paidByMember[m.user_id] ?? 0)}</span> plaćeno
              </span>
            ))}
            <span className="text-muted ml-auto">Neplaćeno ukupno: <span className="text-warn font-medium">{KM(unpaidTotal)}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
