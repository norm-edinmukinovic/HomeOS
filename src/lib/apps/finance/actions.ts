import type { SupabaseClient } from "@supabase/supabase-js";
import { publish } from "@/lib/platform/events";

// Transakcija: prihod ili rashod po kategoriji.
export async function createTransaction(
  db: SupabaseClient,
  input: {
    householdId: string;
    ownerId: string;
    kind: "expense" | "income";
    title: string;
    amount: number;
    category: string;
    occurredAt?: string | null;
  }
) {
  const { data, error } = await db
    .from("transactions")
    .insert({
      household_id: input.householdId,
      owner_id: input.ownerId,
      kind: input.kind,
      title: input.title,
      amount: input.amount,
      category: input.category || "Ostalo",
      occurred_at: input.occurredAt ?? new Date().toISOString(),
    })
    .select("id, kind, amount, category")
    .single();
  if (error) throw error;

  await publish(db, {
    type: "transaction.created",
    household_id: input.householdId,
    actor_id: input.ownerId,
    payload: { transactionId: data.id, kind: data.kind, amount: data.amount, category: data.category },
  });
  return data;
}

// Mjesečni budžet po kategoriji (na nivou domaćinstva).
export async function setBudget(
  db: SupabaseClient,
  input: { householdId: string; category: string; monthlyLimit: number }
) {
  const { error } = await db
    .from("budgets")
    .upsert(
      { household_id: input.householdId, category: input.category, monthly_limit: input.monthlyLimit },
      { onConflict: "household_id,category" }
    );
  if (error) throw error;
}

// Označi račun plaćenim — bilježi KO je platio (who paid / who owes).
export async function markBillPaid(
  db: SupabaseClient,
  input: { billId: string; paidBy: string; paid: boolean }
) {
  const { error } = await db
    .from("bills")
    .update({
      paid_at: input.paid ? new Date().toISOString() : null,
      paid_by: input.paid ? input.paidBy : null,
    })
    .eq("id", input.billId);
  if (error) throw error;
}

export async function createBill(
  db: SupabaseClient,
  input: {
    householdId: string;
    ownerId: string;
    title: string;
    amount: number;
    dueAt?: string | null;
    recurring?: string | null;
    category?: string | null;
  }
) {
  const { data, error } = await db
    .from("bills")
    .insert({
      household_id: input.householdId,
      owner_id: input.ownerId,
      title: input.title,
      amount: input.amount,
      due_at: input.dueAt ?? null,
      recurring: input.recurring ?? null,
      category: input.category ?? null,
    })
    .select("id, title, amount, due_at")
    .single();
  if (error) throw error;

  // Objavi dogadjaj — druge app-ove (npr. automatsko kreiranje zadatka)
  // ne pozivamo direktno; samo objavimo sta se desilo.
  await publish(db, {
    type: "bill.created",
    household_id: input.householdId,
    actor_id: input.ownerId,
    payload: {
      billId: data.id, title: data.title, amount: data.amount, dueAt: data.due_at,
    },
  });

  return data;
}
